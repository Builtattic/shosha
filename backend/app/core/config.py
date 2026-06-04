from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[3] / ".env",
        extra="ignore",
    )

    DATABASE_URL: str
    FIREBASE_PROJECT_ID: str
    FIREBASE_SERVICE_ACCOUNT_JSON: str | None = None
    FIREBASE_CLIENT_EMAIL: str | None = None
    FIREBASE_PRIVATE_KEY: str | None = None
    SECRET_KEY: str
    ENVIRONMENT: str
    ALLOWED_ORIGINS: str

    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-1.5-pro-latest"
    GEMINI_DISCOVERY_MODEL: str = "gemini-3-pro-preview"

    @computed_field
    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
