# tests/test_menu_items.py
#
# Tests for the menu item endpoint.
# GET /menu/items/:id is called by the order-service during order creation.
# These tests verify the exact contract the order-service depends on.

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_get_menu_item_success(seeded_item_id):
    """GET /menu/items/:id must return item with price and isAvailable."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get(f"/menu/items/{seeded_item_id}")

    assert response.status_code == 200
    body = response.json()

    # These fields are required by the order-service integration
    assert body["id"] == seeded_item_id
    assert body["name"] == "Test Item"
    assert body["price"] == 9.99
    assert body["isAvailable"] is True
    assert "restaurantId" in body
    assert "category" in body


@pytest.mark.asyncio
async def test_get_menu_item_not_found():
    """GET /menu/items/:id with valid but non-existent ID must return 404."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/menu/items/507f1f77bcf86cd799439011")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_menu_item_invalid_id():
    """GET /menu/items/:id with malformed ObjectId must return 404."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get("/menu/items/not-a-valid-id")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_menu_item_returns_price_for_order_service(seeded_item_id):
    """
    Price returned must be a number greater than zero.
    The order-service uses this to calculate server-side order totals.
    """
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        response = await ac.get(f"/menu/items/{seeded_item_id}")

    price = response.json()["price"]
    assert isinstance(price, (int, float))
    assert price > 0
