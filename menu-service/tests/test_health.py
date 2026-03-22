# tests/test_health.py
#
# Same testing principles as the Node.js services:
#   - Tests are independent and self-contained
#   - We accept both 200 (DB connected) and 503 (DB not reachable)
#   - Tests describe BEHAVIOUR, not implementation details
#
# httpx AsyncClient with ASGITransport lets us make real HTTP requests
# to the FastAPI app without starting an actual server.
# This is the Python/FastAPI equivalent of supertest in Node.js.

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_health_returns_correct_service_name():
    """Health endpoint must identify itself as menu-service."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        response = await ac.get("/health")

    # Both 200 (DB connected) and 503 (DB unreachable) are valid
    assert response.status_code in [200, 503]
    assert response.json()["service"] == "menu-service"


@pytest.mark.asyncio
async def test_health_contains_all_required_fields():
    """Health response must always include all required fields."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        response = await ac.get("/health")

    body = response.json()
    required_fields = ["status", "service", "version", "uptime", "database", "timestamp"]
    for field in required_fields:
        assert field in body, f"Missing required field: '{field}'"


@pytest.mark.asyncio
async def test_health_uptime_is_non_negative_integer():
    """Uptime must be a number >= 0."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        response = await ac.get("/health")

    uptime = response.json()["uptime"]
    assert isinstance(uptime, int)
    assert uptime >= 0


@pytest.mark.asyncio
async def test_restaurants_endpoint_is_registered():
    """GET /restaurants must exist and return 501 (not 404)."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        response = await ac.get("/restaurants/")

    # 501 = registered route, not yet implemented
    # 404 = route doesn't exist — this would be a bug
    assert response.status_code == 501


@pytest.mark.asyncio
async def test_menu_items_endpoint_is_registered():
    """GET /menu/items/:id must exist and return 501 (not 404)."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        response = await ac.get("/menu/items/some-item-id")

    assert response.status_code == 501


@pytest.mark.asyncio
async def test_unknown_route_returns_404():
    """Unknown routes must return 404."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        response = await ac.get("/this-does-not-exist")

    assert response.status_code == 404
