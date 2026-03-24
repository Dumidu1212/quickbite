# app/core/config.py
#
# Notify service configuration using pydantic-settings.
# Values are read from environment variables and the .env file.
# pydantic validates types automatically — a non-string SENDGRID_API_KEY
# would raise a clear error at startup rather than a cryptic runtime failure.

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    model_config tells pydantic-settings to read from .env file.
    extra='ignore' prevents errors for unrecognised env vars.
    """

    # Application identity
    app_name:    str = "notify-service"
    app_version: str = "1.0.0"

    # Azure Service Bus — optional for local dev without Azure
    # When empty, consumer does not start and publisher skips silently
    servicebus_conn:       str = ""
    servicebus_queue_name: str = "order-events"

    # SendGrid — optional for local dev
    # When empty, email functions log and return True
    sendgrid_api_key: str = ""

    # Internal API key protecting POST /notify/send
    # Stored in Azure Key Vault in production
    internal_api_key: str = "test-internal-key-for-local-dev"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.
    lru_cache ensures settings are only read once per process,
    not on every function call.
    """
    return Settings()
