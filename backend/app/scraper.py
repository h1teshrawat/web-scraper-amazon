import asyncio
import logging
import random
import re
from datetime import UTC, datetime
from functools import lru_cache
from urllib.parse import urlparse

from bs4 import BeautifulSoup
from playwright.async_api import Error as PlaywrightError
from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright
from tenacity import AsyncRetrying, before_sleep_log, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import Settings, get_settings
from app.schemas import ProductResponse

logger = logging.getLogger(__name__)

NOT_FOUND = "Not Found"
AMAZON_HOST_PATTERN = re.compile(r"(?:[a-z0-9-]+\.)*amazon\.[a-z]{2,}(?:\.[a-z]{2})?$", re.IGNORECASE)
ASIN_PATTERN = re.compile(r"/(?:dp|gp/product|gp/aw/d)/([A-Z0-9]{10})(?:[/?]|$)", re.IGNORECASE)

# Amazon serves a lightweight "prove you're human" interstitial instead of the
# product page when it suspects automated traffic. These markers show up on
# that interstitial (and on hard error pages) but never on a real product
# page, so their presence means the scrape didn't actually see product data
# even though the HTTP request itself succeeded.
BLOCKED_PAGE_MARKERS = (
    "to discuss automated access to amazon data",
    "enter the characters you see below",
    "type the characters you see in this image",
    "sorry, we just need to make sure you're not a robot",
    "api-services-support@amazon.com",
    "/errors/validatecaptcha",
)

# A small pool of realistic desktop Chrome user agents, rotated across retry
# attempts. Reusing one fixed UA on every attempt makes the traffic easier to
# fingerprint; rotating it (with a fresh browser context per attempt) gives
# each retry an independent chance of not being flagged.
USER_AGENTS = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
)

# Injected before any page script runs, to strip some of the automation
# signals Amazon's bot detection checks for (navigator.webdriver, an empty
# plugin list, a missing window.chrome object, etc.).
STEALTH_INIT_SCRIPT = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
window.chrome = window.chrome || { runtime: {} };
const originalQuery = window.navigator.permissions && window.navigator.permissions.query;
if (originalQuery) {
  window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications'
      ? Promise.resolve({ state: Notification.permission })
      : originalQuery(parameters)
  );
}
"""


class InvalidAmazonUrlError(ValueError):
    """The submitted URL is not a supported Amazon product URL."""


class ScrapeFailedError(RuntimeError):
    """The product page could not be retrieved after retries."""


class AmazonBlockedError(ScrapeFailedError):
    """Amazon served a bot-check / interstitial page instead of the product."""


def is_blocked_page(html: str) -> bool:
    lowered = html.lower()
    return any(marker in lowered for marker in BLOCKED_PAGE_MARKERS)


def normalize_product_url(raw_url: str) -> tuple[str, str]:
    parsed_url = urlparse(raw_url)
    host = (parsed_url.hostname or "").lower()
    asin_match = ASIN_PATTERN.search(parsed_url.path)

    if parsed_url.scheme not in {"http", "https"} or not AMAZON_HOST_PATTERN.fullmatch(host):
        raise InvalidAmazonUrlError("Please provide a valid Amazon product URL.")
    if asin_match is None:
        raise InvalidAmazonUrlError("The URL must point to a single Amazon product page.")

    asin = asin_match.group(1).upper()
    return f"https://{host}/dp/{asin}", asin


def clean_text(value: str | None) -> str | None:
    if not value:
        return None
    normalized = " ".join(value.split())
    return normalized or None


def first_text(soup: BeautifulSoup, selectors: tuple[str, ...]) -> str | None:
    for selector in selectors:
        element = soup.select_one(selector)
        if element:
            text = clean_text(element.get_text(" ", strip=True))
            if text:
                return text
    return None


def extract_seller(soup: BeautifulSoup) -> str | None:
    seller = first_text(
        soup,
        (
            "#sellerProfileTriggerId",
            "#merchantInfo a",
            "#tabular-buybox-truncate-0 a",
            "[data-feature-name='shipsFromSoldBy'] a",
        ),
    )
    if seller:
        return seller

    merchant_info = first_text(soup, ("#merchantInfo",))
    if not merchant_info:
        return None
    match = re.search(r"(?:Sold by|Ships from and sold by)\s+(.+?)(?:\.|$)", merchant_info, re.IGNORECASE)
    return clean_text(match.group(1)) if match else merchant_info


def extract_best_sellers_rank(soup: BeautifulSoup) -> str | None:
    direct_rank = first_text(soup, ("#SalesRank", "#productDetails_detailBullets_sections1 #SalesRank"))
    if direct_rank:
        return direct_rank

    for row in soup.select("#productDetails_detailBullets_sections1 tr, #productDetails_db_sections tr, .prodDetTable tr"):
        label_element = row.select_one("th")
        value_element = row.select_one("td")
        label = clean_text(label_element.get_text(" ", strip=True)) if label_element else None
        value = clean_text(value_element.get_text(" ", strip=True)) if value_element else None
        if label and "best sellers rank" in label.lower() and value:
            return value

    for element in soup.find_all(["li", "span", "th", "b"]):
        text = clean_text(element.get_text(" ", strip=True))
        if not text or "best sellers rank" not in text.lower():
            continue
        rank = re.sub(r"^.*?best sellers rank\s*:?\s*", "", text, flags=re.IGNORECASE)
        if rank and rank != text:
            return rank
        parent_text = clean_text(element.parent.get_text(" ", strip=True)) if element.parent else None
        if parent_text:
            rank = re.sub(r"^.*?best sellers rank\s*:?\s*", "", parent_text, flags=re.IGNORECASE)
            if rank and rank != parent_text:
                return rank
    return None


def extract_product_image_url(soup: BeautifulSoup) -> str | None:
    image = soup.select_one("#landingImage, #imgBlkFront, #main-image")
    if image:
        for attribute in ("data-old-hires", "src"):
            value = image.get(attribute)
            if value and value.strip():
                return value.strip()

        dynamic_images = image.get("data-a-dynamic-image")
        if dynamic_images:
            urls = re.findall(r'"(https?://[^"\\]+)"', dynamic_images)
            if urls:
                return urls[0]

    meta_image = soup.select_one('meta[property="og:image"], meta[name="twitter:image"]')
    return clean_text(meta_image.get("content")) if meta_image else None


def parse_product_html(html: str, product_url: str, url_asin: str) -> ProductResponse:
    soup = BeautifulSoup(html, "lxml")
    title = first_text(soup, ("#productTitle", "#title span", "[data-feature-name='title'] h1", "h1.a-size-large"))

    asin_element = soup.select_one("#ASIN, input[name='ASIN']")
    page_asin = clean_text(asin_element.get("value")) if asin_element else None
    return ProductResponse(
        title=title or NOT_FOUND,
        price=first_text(
            soup,
            (
                ".priceToPay .a-offscreen",
                "#corePriceDisplay_desktop_feature_div .a-offscreen",
                "[data-feature-name='corePrice'] .a-offscreen",
                "#apex_desktop .a-price .a-offscreen",
                "#priceblock_ourprice",
                "#priceblock_dealprice",
            ),
        ) or NOT_FOUND,
        seller=extract_seller(soup) or NOT_FOUND,
        asin=(page_asin or url_asin).upper(),
        rating=first_text(
            soup,
            (
                "#acrPopover .a-icon-alt",
                "#averageCustomerReviews .a-icon-alt",
                "[data-hook='average-star-rating'] .a-icon-alt",
                "[data-hook='rating-out-of-text']",
            ),
        ) or NOT_FOUND,
        ratings_count=first_text(
            soup,
            (
                "#acrCustomerReviewText",
                "[data-hook='total-review-count']",
                "#averageCustomerReviews #acrCustomerReviewText",
                "a[data-hook='see-all-reviews-link']",
            ),
        ) or NOT_FOUND,
        best_sellers_rank=extract_best_sellers_rank(soup) or NOT_FOUND,
        image_url=extract_product_image_url(soup) or NOT_FOUND,
        product_url=product_url,
        scraped_at=datetime.now(UTC),
    )


class AmazonProductScraper:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._browser_semaphore = asyncio.Semaphore(self.settings.max_concurrent_scrapes)

    async def scrape(self, raw_url: str) -> ProductResponse:
        product_url, asin = normalize_product_url(raw_url)
        async for attempt in AsyncRetrying(
            retry=retry_if_exception_type((PlaywrightError, PlaywrightTimeoutError, AmazonBlockedError)),
            stop=stop_after_attempt(self.settings.scraper_retry_attempts),
            wait=wait_exponential(multiplier=1, min=1, max=8),
            before_sleep=before_sleep_log(logger, logging.WARNING),
            reraise=True,
        ):
            with attempt:
                return await self._fetch_product_page(product_url, asin)
        raise ScrapeFailedError("The scraper exhausted its retry attempts.")

    async def _fetch_product_page(self, product_url: str, asin: str) -> ProductResponse:
        async with self._browser_semaphore:
            logger.info("Fetching Amazon product page", extra={"asin": asin})
            async with async_playwright() as playwright:
                browser = await playwright.chromium.launch(
                    headless=True,
                    args=["--disable-blink-features=AutomationControlled"],
                )
                try:
                    context = await browser.new_context(
                        user_agent=random.choice(USER_AGENTS),
                        locale="en-US",
                        viewport={"width": 1440, "height": 1000},
                        extra_http_headers={
                            "Accept-Language": "en-US,en;q=0.9",
                            "Upgrade-Insecure-Requests": "1",
                        },
                    )
                    await context.add_init_script(STEALTH_INIT_SCRIPT)
                    try:
                        page = await context.new_page()
                        response = await page.goto(
                            product_url, wait_until="domcontentloaded", timeout=self.settings.request_timeout_ms
                        )
                        if response is not None and response.status in (403, 429, 503):
                            raise AmazonBlockedError(
                                f"Amazon returned HTTP {response.status} for this product page."
                            )

                        try:
                            await page.wait_for_selector(
                                "#productTitle, #dp, #centerCol",
                                timeout=min(self.settings.request_timeout_ms, 10_000),
                            )
                        except PlaywrightTimeoutError:
                            # The product markup didn't show up in time. This can mean the
                            # page layout changed, or -- far more commonly -- Amazon served
                            # an interstitial instead of the product. is_blocked_page() below
                            # tells them apart; if it's neither, we still try to parse
                            # whatever loaded rather than failing outright.
                            logger.warning("Timed out waiting for product markup", extra={"asin": asin})

                        html = await page.content()
                        if is_blocked_page(html):
                            raise AmazonBlockedError(
                                "Amazon served a bot-check page instead of the product page."
                            )

                        result = parse_product_html(html, product_url, asin)
                        logger.info("Amazon product page parsed", extra={"asin": result.asin})
                        return result
                    finally:
                        await context.close()
                finally:
                    await browser.close()


@lru_cache
def get_scraper() -> AmazonProductScraper:
    return AmazonProductScraper()
