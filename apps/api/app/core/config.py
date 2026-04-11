from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --------------------------------------------------
    # APP
    # --------------------------------------------------
    app_name: str = "Learnex API"
    app_env: str = "development"

    # --------------------------------------------------
    # SECURITY (JWT)
    # --------------------------------------------------
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    # --------------------------------------------------
    # DATABASE
    # --------------------------------------------------
    postgres_db: str = "learnex"
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_host: str = "postgres"
    postgres_port: int = 5432

    # --------------------------------------------------
    # REDIS
    # --------------------------------------------------
    redis_host: str = "redis"
    redis_port: int = 6379

    # --------------------------------------------------
    # FILE STORAGE
    # --------------------------------------------------
    upload_dir: str = "/app/uploads"
    media_base_url: str = "http://localhost:8000/uploads"
    max_upload_size_mb: int = 100

    # --------------------------------------------------
    # ENV CONFIG
    # --------------------------------------------------
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    # --------------------------------------------------
    # DATABASE URL
    # --------------------------------------------------
    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # --------------------------------------------------
    # REDIS URL
    # --------------------------------------------------
    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/0"


settings = Settings()