# app/core/config.py
#
# CLEAN CODE: Single source of truth for all configuration.
# pydantic-settings automatically reads from environment variables AND the .env file.
# If a required variable (one with no default) is missing, Pydantic raises a
# ValidationError at startup — the app crashes immediately with a clear message.
# This is the Python equivalent of the fail-fast pattern in the Node.js services.

from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # Server config
    menu_service_port: int = 8001
    app_name: str = "QuickBite Menu Service"
    app_version: str = "1.0.0"

    # Database — no default means this MUST exist in .env or env vars
    # If missing, Pydantic raises ValidationError before the app starts
    mongodb_uri_menu: str

    model_config = ConfigDict(env_file=".env", case_sensitive=False)


# lru_cache means get_settings() only runs once per process.
# Every module that calls get_settings() gets the SAME object back.
# This prevents reading the .env file repeatedly on every request.
@lru_cache()
def get_settings() -> Settings:
    return Settings()
