
# app/core/database.py
#
# Motor is the official async MongoDB driver for Python.
# We use async because FastAPI is built on asyncio — all I/O must be
# non-blocking so the server can handle other requests while waiting.
#
# MICROSERVICE PRINCIPLE: This service ONLY connects to menu-db.
# It never touches users-db or orders-db.
# Each service owns its data — no cross-database queries ever.

import motor.motor_asyncio
from app.core.config import get_settings

settings = get_settings()

# Create ONE client for the entire application lifetime.
# Motor manages a connection pool internally — we never create a new
# client per request. That would be extremely slow and wasteful.
client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongodb_uri_menu)

# The specific database we own
database = client.get_database("menu-db")


def get_database():
    """
    Returns the database instance.
    Used with FastAPI dependency injection in route handlers:

        @router.get("/restaurants")
        async def get_restaurants(db = Depends(get_database)):
            ...
    """
    return database
