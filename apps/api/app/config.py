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

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
