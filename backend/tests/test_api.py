from fastapi.testclient import TestClient

from app.main import app
from app.schemas import ProductResponse
from app.scraper import AmazonProductScraper, get_scraper


class FakeScraper:
    async def scrape(self, raw_url: str) -> ProductResponse:
        return ProductResponse(
            title="Echo Dot",
            price="$49.99",
            seller="Amazon.com",
            asin="B09B8V1LZ3",
            rating="4.7 out of 5 stars",
            ratings_count="12,345 ratings",
            best_sellers_rank="#4 in Smart Home",
            product_url="https://www.amazon.com/dp/B09B8V1LZ3",
            scraped_at="2026-07-13T00:00:00Z",
        )


def test_scrape_endpoint_returns_product_json() -> None:
    app.dependency_overrides[get_scraper] = lambda: FakeScraper()
    try:
        response = TestClient(app).post(
            "/api/v1/scrape",
            json={"product_url": "https://www.amazon.com/dp/B09B8V1LZ3"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()["asin"] == "B09B8V1LZ3"
    assert response.json()["best_sellers_rank"] == "#4 in Smart Home"


def test_scrape_endpoint_rejects_non_amazon_url() -> None:
    response = TestClient(app).post(
        "/api/v1/scrape",
        json={"product_url": "https://example.com/dp/B09B8V1LZ3"},
    )

    assert response.status_code == 422
