# tests/conftest.py

import asyncio
import pytest
import pytest_asyncio
import motor.motor_asyncio
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI_MENU", "mongodb://localhost:27017")


@pytest.fixture(scope="session")
def event_loop():
    """
    Session-scoped event loop.
    Motor binds to the first event loop it sees. If pytest-asyncio creates
    a new loop per test, Motor's executor tries to run on a closed loop.
    Using one loop for the whole session fixes this completely.
    """
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def mongo_client():
    """One Motor client for the entire test session."""
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URI)
    yield client
    client.close()


@pytest_asyncio.fixture
async def seeded_restaurant_id(mongo_client):
    """Creates one test restaurant, yields its ID, then deletes it."""
    db = mongo_client.get_database("menu-db")
    col = db.get_collection("restaurants")

    result = await col.insert_one({
        "name": "Test Restaurant",
        "cuisine": "TestCuisine",
        "address": "123 Test Street, Colombo",
        "imageUrl": None,
        "rating": 4.5,
        "isOpen": True,
        "deliveryTime": "20-30 min",
        "minimumOrder": 5.00,
    })
    restaurant_id = str(result.inserted_id)

    yield restaurant_id

    await col.delete_one({"_id": result.inserted_id})


@pytest_asyncio.fixture
async def seeded_item_id(mongo_client, seeded_restaurant_id):
    """Creates one test menu item linked to the seeded restaurant."""
    db = mongo_client.get_database("menu-db")
    col = db.get_collection("menu_items")

    result = await col.insert_one({
        "restaurantId": seeded_restaurant_id,
        "name": "Test Item",
        "description": "A test menu item",
        "price": 9.99,
        "category": "TestCategory",
        "isAvailable": True,
    })
    item_id = str(result.inserted_id)

    yield item_id

    await col.delete_one({"_id": result.inserted_id})
