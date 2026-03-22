# app/core/database.py
#
# Motor is the async MongoDB driver for Python.
# We create ONE client for the entire application lifetime.
# Motor manages connection pooling internally.
#
# MICROSERVICE PRINCIPLE:
# This service ONLY connects to menu-db.
# It never touches users-db or orders-db.

import motor.motor_asyncio
from app.core.config import get_settings

settings = get_settings()

client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongodb_uri_menu)
database = client.get_database("menu-db")

# Separate collections — each accessed by name
restaurants_collection = database.get_collection("restaurants")
menu_items_collection = database.get_collection("menu_items")


def get_database():
    """Returns the database instance for dependency injection."""
    return database
