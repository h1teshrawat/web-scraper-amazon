from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    allowed_origins: str = "http://localhost:3000"
    request_timeout_ms: int = Field(default=30000, ge=1000, le=120000)
    scraper_retry_attempts: int = Field(default=3, ge=1, le=5)
    max_concurrent_scrapes: int = Field(default=2, ge=1, le=4)
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    @field_validator("allowed_origins")
    @classmethod
    def validate_allowed_origins(cls, value: str) -> str:
        origins = [origin.strip() for origin in value.split(",") if origin.strip()]
        if not origins:
            raise ValueError("ALLOWED_ORIGINS must contain at least one origin.")
        if "*" in origins:
            raise ValueError("ALLOWED_ORIGINS cannot use the wildcard origin.")
        return ",".join(origins)

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
