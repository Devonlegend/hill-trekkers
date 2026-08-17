from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    app_base_url: str = "http://localhost:3000"
    port: int = 8000
    cors_origins: str = "http://localhost:3000"

    database_url: str = "postgresql://postgres:devon@localhost:5432/hill_trekkers_club"

    jwt_secret: str = "dev-only-secret-change-me"
    jwt_expires_minutes: int = 60 * 24 * 7

    paystack_secret_key: str = ""
    paystack_public_key: str = ""

    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    local_upload_dir: str = "uploads"

    email_provider_api_key: str = ""
    email_from_address: str = "hello@hilltrekkersclub.com"

    # --- Production / operations knobs ---
    log_level: str = "INFO"
    db_pool_min: int = 2
    db_pool_max: int = 10
    # Statement timeout (ms) so a slow query can't pin a pooled connection.
    db_statement_timeout_ms: int = 15000

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()


def enforce_production_settings() -> None:
    """Fail fast at boot if production is missing secrets or on dev defaults.

    Mock Paystack mode relies on a publicly-known signature secret, so allowing
    it in production would let anyone forge a ``charge.success`` webhook and
    confirm bookings without paying. This guard refuses to boot in that state.
    """
    if not settings.is_production:
        return
    problems: list[str] = []
    if settings.jwt_secret in {"dev-only-secret-change-me", ""} or len(settings.jwt_secret) < 32:
        problems.append("JWT_SECRET must be a strong random value (>= 32 chars) in production.")
    key = settings.paystack_secret_key or ""
    if key == "" or key.startswith("sk_test_placeholder") or key.startswith("xxx"):
        problems.append("PAYSTACK_SECRET_KEY must be a real key in production (mock mode is disabled).")
    from app.services.storage import is_cloudinary_configured

    if not is_cloudinary_configured():
        problems.append("Cloudinary must be configured in production (local-disk uploads are not supported).")
    if "localhost" in settings.database_url or settings.database_url.startswith("postgresql://postgres:devon@"):
        problems.append("DATABASE_URL must point at the production Postgres, not the local dev default.")
    if problems:
        raise RuntimeError("Production config check failed:\n - " + "\n - ".join(problems))
