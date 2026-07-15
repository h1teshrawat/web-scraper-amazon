import logging

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from playwright.async_api import Error as PlaywrightError
from playwright.async_api import TimeoutError as PlaywrightTimeoutError

from app.config import get_settings
from app.schemas import ErrorResponse, ProductResponse, ScrapeRequest
from app.scraper import (
    AmazonBlockedError,
    AmazonProductScraper,
    InvalidAmazonUrlError,
    ScrapeFailedError,
    get_scraper,
)

settings = get_settings()
logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
app = FastAPI(title="Amazon Product Scraper API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/api/v1/scrape",
    response_model=ProductResponse,
    responses={422: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
)
async def scrape_product(
    request: ScrapeRequest,
    scraper: AmazonProductScraper = Depends(get_scraper),
) -> ProductResponse:
    try:
        return await scraper.scrape(str(request.product_url))
    except InvalidAmazonUrlError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error
    except AmazonBlockedError as error:
        logging.getLogger(__name__).warning("Amazon blocked the scrape request: %s", error)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Amazon is blocking automated requests for this product right now. "
                "Wait a minute and try again, or try a different product URL."
            ),
        ) from error
    except (PlaywrightError, PlaywrightTimeoutError, ScrapeFailedError) as error:
        logging.getLogger(__name__).exception("Product scrape failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to retrieve this Amazon product right now. Please try again.",
        ) from error
