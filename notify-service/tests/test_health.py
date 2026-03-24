# tests/test_health.py

import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from unittest.mock import patch


@pytest.mark.asyncio
async def test_health_returns_200():
    """Notify service health must always return 200 (no DB dependency)."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        response = await ac.get("/health")

    # notify-service has no DB — always 200
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_returns_correct_service_name():
    """Health response must identify this service correctly."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        response = await ac.get("/health")

    assert response.json()["service"] == "notify-service"
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_health_contains_all_required_fields():
    """Health response must include all standard fields."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        response = await ac.get("/health")

    body = response.json()
    for field in ["status", "service", "version", "uptime", "timestamp"]:
        assert field in body, f"Missing field: '{field}'"


@pytest.mark.asyncio
async def test_notify_send_rejects_missing_key():
    """POST /notify/send without X-Internal-Key must return 403."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        response = await ac.post(
            "/notify/send",
            json={
                "to": "customer@example.com",
                "subject": "Order Confirmed",
                "body": "Your order has been placed.",
            },
        )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_notify_send_rejects_wrong_key():
    """POST /notify/send with wrong X-Internal-Key must return 403."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        response = await ac.post(
            "/notify/send",
            headers={"x-internal-key": "wrong-key-value"},
            json={
                "to": "customer@example.com",
                "subject": "Test",
                "body": "Test body",
            },
        )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_notify_send_accepts_correct_key():
    """POST /notify/send with correct X-Internal-Key must return 202 with accepted:True."""
    # Mock send_generic_email so no real SendGrid call is made during testing.
    # This test verifies the auth logic and response shape — not SendGrid itself.
    # SendGrid integration is tested separately in test_notify_consumer.py.
    with patch("app.routers.notify.send_generic_email", return_value=True):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test"
        ) as ac:
            response = await ac.post(
                "/notify/send",
                headers={"x-internal-key": "test-internal-key-for-local-dev"},
                json={
                    "to": "customer@example.com",
                    "subject": "Order Confirmed",
                    "body": "Your QuickBite order has been placed.",
                },
            )

    assert response.status_code == 202
    assert response.json()["accepted"] is True


@pytest.mark.asyncio
async def test_unknown_route_returns_404():
    """Unknown routes must return 404."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        response = await ac.get("/nonexistent-endpoint")

    assert response.status_code == 404
