# tests/test_restaurants.py
#
# Tests for restaurant endpoints.
# We use pytest-asyncio with httpx AsyncClient + ASGITransport.
# This is the Python/FastAPI equivalent of Jest + Supertest in Node.js.
#
# IMPORTANT: These tests require a real MongoDB connection because
# we test actual database queries. The MONGODB_URI_MENU in .env
# must point to a real database (Atlas M0 is fine).
#
# WHY NOT MOCK MONGODB?
# Mocking Motor would test that our mock works, not that our queries work.
# Using a real test database gives genuine confidence the code is correct.
# The seed data inserted in conftest.py is cleaned up after tests run.

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_restaurants_returns_list(seeded_restaurant_id):
    """GET /restaurants must return a list containing at least one restaurant."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/restaurants/")

    assert response.status_code == 200
    body = response.json()
    assert "restaurants" in body
    assert "count" in body
    assert isinstance(body["restaurants"], list)
    assert body["count"] >= 1


@pytest.mark.asyncio
async def test_get_restaurants_returns_correct_fields(seeded_restaurant_id):
    """Every restaurant in the list must have all required fields."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/restaurants/")

    restaurants = response.json()["restaurants"]
    assert len(restaurants) > 0

    first = restaurants[0]
    for field in ["id", "name", "cuisine", "address", "rating", "isOpen"]:
        assert field in first, f"Missing field: {field}"


@pytest.mark.asyncio
async def test_get_restaurants_cuisine_filter(seeded_restaurant_id):
    """?cuisine=TestCuisine must filter results correctly."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/restaurants/?cuisine=TestCuisine")

    assert response.status_code == 200
    body = response.json()
    # The seeded restaurant has cuisine "TestCuisine"
    assert body["count"] >= 1
    for r in body["restaurants"]:
        assert "testcuisine" in r["cuisine"].lower()


@pytest.mark.asyncio
async def test_get_restaurants_cuisine_filter_no_match(seeded_restaurant_id):
    """?cuisine= filter with no match must return empty list, not 404."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/restaurants/?cuisine=DoesNotExistXYZ123")

    assert response.status_code == 200
    assert response.json()["count"] == 0
    assert response.json()["restaurants"] == []


@pytest.mark.asyncio
async def test_get_single_restaurant(seeded_restaurant_id):
    """GET /restaurants/:id with valid ID must return the restaurant."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get(f"/restaurants/{seeded_restaurant_id}")

    assert response.status_code == 200
    body = response.json()
    assert "restaurant" in body
    assert body["restaurant"]["id"] == seeded_restaurant_id
    assert body["restaurant"]["name"] == "Test Restaurant"


@pytest.mark.asyncio
async def test_get_single_restaurant_not_found():
    """GET /restaurants/:id with valid but non-existent ID must return 404."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # Valid ObjectId format but does not exist in DB
        response = await ac.get("/restaurants/507f1f77bcf86cd799439011")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_single_restaurant_invalid_id():
    """GET /restaurants/:id with malformed ID must return 404."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/restaurants/not-a-valid-object-id")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_restaurant_menu(seeded_restaurant_id, seeded_item_id):
    """GET /restaurants/:id/menu must return grouped menu items."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get(f"/restaurants/{seeded_restaurant_id}/menu")

    assert response.status_code == 200
    body = response.json()
    assert "menu" in body
    assert "restaurantId" in body
    assert "restaurantName" in body
    # Items should be grouped — menu is a dict of category → list
    assert isinstance(body["menu"], dict)
    # Our seeded item is in category "TestCategory"
    assert "TestCategory" in body["menu"]
    assert len(body["menu"]["TestCategory"]) >= 1


@pytest.mark.asyncio
async def test_get_restaurant_menu_not_found():
    """GET /restaurants/:id/menu with non-existent restaurant must return 404."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/restaurants/507f1f77bcf86cd799439011/menu")

    assert response.status_code == 404
