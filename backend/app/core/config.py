import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    APP_NAME: str = "Danang Urban Incident Management Platform"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "temporary-secret-key-for-scaffolding-replace-in-env"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # PostgreSQL + PostGIS Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres123"
    POSTGRES_DB: str = "urban_incidents"
    DATABASE_URL: Union[str, None] = None

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: Union[str, None], info) -> str:
        if isinstance(v, str) and v:
            return v
        data = info.data
        return (
            f"postgresql+asyncpg://{data.get('POSTGRES_USER', 'postgres')}:"
            f"{data.get('POSTGRES_PASSWORD', 'postgres123')}@"
            f"{data.get('POSTGRES_SERVER', 'localhost')}:"
            f"{data.get('POSTGRES_PORT', 5432)}/"
            f"{data.get('POSTGRES_DB', 'urban_incidents')}"
        )

    # DeepSeek Vision API
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_VISION_MODEL: str = "deepseek-flash"

    # Goong Maps
    GOONG_API_KEY: str = ""
    GOONG_MAPTILES_KEY: str = ""

    # Facebook Messenger Webhook
    FACEBOOK_PAGE_ACCESS_TOKEN: str = ""
    FACEBOOK_VERIFY_TOKEN: str = ""

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Uploads
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 15

    # CORS
    CORS_ORIGINS: Union[List[str], str] = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
