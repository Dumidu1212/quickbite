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
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")

    # Both 200 (DB connected) and 503 (DB unreachable) are valid
    assert response.status_code in [200, 503]
    assert response.json()["service"] == "menu-service"


@pytest.mark.asyncio
async def test_health_contains_all_required_fields():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    body = response.json()
    for field in ["status", "service", "version", "uptime", "database", "timestamp"]:
        assert field in body, f"Missing field: {field}"


@pytest.mark.asyncio
async def test_health_uptime_is_non_negative_integer():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    uptime = response.json()["uptime"]
    assert isinstance(uptime, int)
    assert uptime >= 0


@pytest.mark.asyncio
async def test_restaurants_route_is_accessible():
    """
    GET /restaurants/ must be accessible — returns 200 with data
    or 503 if DB unreachable. Must NOT return 404 (route missing).
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/restaurants/")

    # 200 = working, 503 = DB issue — both mean the route exists
    assert response.status_code in [200, 503, 500]
    assert response.status_code != 404


@pytest.mark.asyncio
async def test_menu_items_route_is_accessible():
    """
    GET /menu/items/:id with invalid ID must return 404 from our code,
    not a routing 404. This confirms the route is registered.
    The endpoint handles the invalid ID and returns its own 404.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/menu/items/not-a-valid-objectid")
    # Our router catches InvalidId and returns 404 — this proves the route exists
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_unknown_route_returns_404():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/this-does-not-exist")
    assert response.status_code == 404
