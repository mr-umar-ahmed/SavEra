"""Application settings — every value comes from the environment (.env in dev).

No secrets are hardcoded here. See ../.env.example for the full list.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- runtime ---
    app_env: str = "development"  # development | test | production
    api_prefix: str = "/api/v1"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # --- database (asyncpg DSN; alembic derives a sync psycopg URL from it) ---
    database_url: str = "postgresql://postgres:postgres@127.0.0.1:55432/savera"

    # --- Supabase Auth ---
    supabase_url: str = ""  # https://<project-ref>.supabase.co
    supabase_anon_key: str = ""  # anon / publishable key (frontend uses it too)
    supabase_service_role_key: str = ""  # server-only; never sent to the browser
    supabase_jwt_secret: str = ""  # legacy HS256 secret; also used to mint test tokens
    jwt_audience: str = "authenticated"
    jwks_cache_seconds: int = 3600

    # --- Google Cloud Vision (REST, API key) + Tesseract fallback ---
    gcv_api_key: str = ""
    gcv_endpoint: str = "https://vision.googleapis.com/v1/images:annotate"
    tesseract_cmd: str = ""  # optional explicit path to tesseract.exe

    # --- Firebase Cloud Messaging (HTTP v1 via firebase-admin service account) ---
    firebase_service_account_json: str = ""  # path to the service-account JSON file

    # --- Open-Meteo (weather context; must never block the request path) ---
    open_meteo_base_url: str = "https://archive-api.open-meteo.com/v1/archive"
    weather_timeout_seconds: float = 3.0

    # --- storage / jobs ---
    upload_dir: str = "./uploads"
    scheduler_enabled: bool = True
    scheduler_timezone: str = "Asia/Kolkata"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def sync_database_url(self) -> str:
        """SQLAlchemy/psycopg URL for Alembic (asyncpg is used at runtime)."""
        url = self.database_url
        if url.startswith("postgresql+psycopg://"):
            return url
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://") :]
        return url.replace("postgresql://", "postgresql+psycopg://", 1)

    @property
    def jwks_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"

    @property
    def is_test(self) -> bool:
        return self.app_env == "test"


@lru_cache
def get_settings() -> Settings:
    return Settings()
