from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl


class ScrapeRequest(BaseModel):
    product_url: HttpUrl = Field(description="A public Amazon product URL")


class ProductResponse(BaseModel):
    title: str
    price: str
    seller: str
    asin: str
    rating: str
    ratings_count: str
    best_sellers_rank: str
    image_url: str = "Not Found"
    product_url: str
    scraped_at: datetime


class ErrorResponse(BaseModel):
    detail: str
