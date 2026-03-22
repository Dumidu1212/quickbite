# app/core/config.py
#
# Notify service config.
# NOTE: Unlike the other services, notify-service has NO database.
# Its "inputs" come from Azure Service Bus (async events).
# Its "outputs" go to SendGrid (transactional email).
# This is a pure event-driven worker service.

from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # Server
    notify_service_port: int = 8002
    app_name: str = "QuickBite Notify Service"
    app_version: str = "1.0.0"

    # SendGrid — used to send transactional emails
    sendgrid_api_key: str
    sendgrid_from_email: str = "noreply@quickbite.com"

    # Internal API key — required to call POST /notify/send directly
    # Prevents external callers from triggering emails
    internal_api_key: str

    # Azure Service Bus — used to consume OrderCreated events
    servicebus_conn: str
    servicebus_queue_name: str = "order-events"

    model_config = ConfigDict(env_file=".env", case_sensitive=False)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
