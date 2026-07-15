import pytest

from app.scraper import InvalidAmazonUrlError, is_blocked_page, normalize_product_url, parse_product_html


PRODUCT_HTML = """
<html><body>
  <span id="productTitle">  Echo Dot (5th Gen)  </span>
  <span class="priceToPay"><span class="a-offscreen">$49.99</span></span>
  <a id="sellerProfileTriggerId">Amazon.com</a>
  <input id="ASIN" value="B09B8V1LZ3" />
  <span id="acrPopover"><span class="a-icon-alt">4.7 out of 5 stars</span></span>
  <span id="acrCustomerReviewText">12,345 ratings</span>
  <table id="productDetails_detailBullets_sections1"><tr><th>Best Sellers Rank</th><td>#4 in Smart Home</td></tr></table>
</body></html>
"""


def test_normalize_product_url_removes_tracking_parameters() -> None:
    url, asin = normalize_product_url("https://www.amazon.com/dp/B09B8V1LZ3?tag=example")

    assert url == "https://www.amazon.com/dp/B09B8V1LZ3"
    assert asin == "B09B8V1LZ3"


def test_normalize_product_url_rejects_non_amazon_url() -> None:
    with pytest.raises(InvalidAmazonUrlError):
        normalize_product_url("https://example.com/dp/B09B8V1LZ3")


def test_parse_product_html_extracts_required_fields() -> None:
    product = parse_product_html(PRODUCT_HTML, "https://www.amazon.com/dp/B09B8V1LZ3", "B09B8V1LZ3")

    assert product.title == "Echo Dot (5th Gen)"
    assert product.price == "$49.99"
    assert product.seller == "Amazon.com"
    assert product.asin == "B09B8V1LZ3"
    assert product.rating == "4.7 out of 5 stars"
    assert product.ratings_count == "12,345 ratings"
    assert product.best_sellers_rank == "#4 in Smart Home"


def test_parse_product_html_uses_not_found_for_missing_selectors() -> None:
    product = parse_product_html("<html><body></body></html>", "https://www.amazon.com/dp/B09B8V1LZ3", "B09B8V1LZ3")

    assert product.title == "Not Found"
    assert product.price == "Not Found"
    assert product.seller == "Not Found"
    assert product.rating == "Not Found"
    assert product.ratings_count == "Not Found"
    assert product.best_sellers_rank == "Not Found"


def test_parse_product_html_uses_fallback_selectors() -> None:
    html = """
    <html><body>
      <section data-feature-name="title"><h1>Fallback product</h1></section>
      <div data-feature-name="corePrice"><span class="a-offscreen">$19.99</span></div>
      <div id="merchantInfo">Ships from and sold by Fallback Seller.</div>
      <div data-hook="rating-out-of-text">4.1 out of 5</div>
      <span data-hook="total-review-count">987 reviews</span>
      <ul><li>Best Sellers Rank: #12 in Electronics</li></ul>
    </body></html>
    """

    product = parse_product_html(html, "https://www.amazon.com/dp/B09B8V1LZ3", "B09B8V1LZ3")

    assert product.title == "Fallback product"
    assert product.price == "$19.99"
    assert product.seller == "Fallback Seller"
    assert product.rating == "4.1 out of 5"
    assert product.ratings_count == "987 reviews"
    assert product.best_sellers_rank == "#12 in Electronics"


def test_is_blocked_page_detects_captcha_interstitial() -> None:
    html = """
    <html><body>
      <h4>Type the characters you see in this image:</h4>
      <p>To discuss automated access to Amazon data please contact api-services-support@amazon.com.</p>
    </body></html>
    """

    assert is_blocked_page(html) is True


def test_is_blocked_page_ignores_real_product_page() -> None:
    assert is_blocked_page(PRODUCT_HTML) is False
