# tests/test_notify_consumer.py
#
# Tests for the Service Bus consumer and SendGrid client.
#
# TESTING STRATEGY:
#   send_order_confirmation and send_generic_email are SYNCHRONOUS functions.
#   We patch them with MagicMock (not AsyncMock) in consumer tests.
#   Direct tests of the sendgrid functions call them without await.
#
# PATCH TARGETS:
#   We patch at the module where the name is USED, not where it is defined.
#   "app.messaging.service_bus_consumer.send_order_confirmation" — patches
#   the name as imported into the consumer module.
#   "app.email.sendgrid_client.SendGridAPIClient" — patches the name at
#   module level in sendgrid_client.py (now a top-level import, patchable).

import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from app.messaging.service_bus_consumer import handle_message
from app.email.sendgrid_client import (
    send_order_confirmation,
    send_generic_email,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_mock_message(body_bytes: bytes) -> MagicMock:
    """Creates a mock Service Bus message with the given body bytes."""
    message      = MagicMock()
    message.body = iter([body_bytes])
    return message


def make_mock_receiver() -> AsyncMock:
    """Creates a mock Service Bus receiver with async complete/abandon/dead_letter."""
    receiver                     = AsyncMock()
    receiver.complete_message    = AsyncMock()
    receiver.abandon_message     = AsyncMock()
    receiver.dead_letter_message = AsyncMock()
    return receiver


VALID_ORDER_PAYLOAD = {
    "eventType":      "OrderCreated",
    "orderId":        "64d4c3e5f7a891023456789a",
    "userId":         "64a1f3b2c9e4d12345678abc",
    "userEmail":      "dumidu@test.com",
    "restaurantName": "Mario's Pizzeria",
    "items":          [{"name": "Margherita Pizza", "quantity": 1, "price": 14.00}],
    "totalPrice":     14.00,
    "deliveryAddress": {
        "street": "42 Kandy Road",
        "city":   "Colombo",
        "phone":  "+94771234567",
    },
}


# ── Consumer tests ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_handle_message_completes_on_email_success():
    """Valid message + email success → message.complete() called."""
    import json
    body     = json.dumps(VALID_ORDER_PAYLOAD).encode()
    message  = make_mock_message(body)
    receiver = make_mock_receiver()

    # send_order_confirmation is SYNC — patch with MagicMock, not AsyncMock
    with patch(
        "app.messaging.service_bus_consumer.send_order_confirmation",
        return_value=True,
    ) as mock_email:
        await handle_message(message, receiver)

    mock_email.assert_called_once()
    receiver.complete_message.assert_called_once_with(message)
    receiver.abandon_message.assert_not_called()
    receiver.dead_letter_message.assert_not_called()


@pytest.mark.asyncio
async def test_handle_message_abandons_on_email_failure():
    """Valid message + email failure → message.abandon() called (allows retry)."""
    import json
    body     = json.dumps(VALID_ORDER_PAYLOAD).encode()
    message  = make_mock_message(body)
    receiver = make_mock_receiver()

    # send_order_confirmation is SYNC — patch with MagicMock returning False
    with patch(
        "app.messaging.service_bus_consumer.send_order_confirmation",
        return_value=False,
    ):
        await handle_message(message, receiver)

    receiver.abandon_message.assert_called_once_with(message)
    receiver.complete_message.assert_not_called()
    receiver.dead_letter_message.assert_not_called()


@pytest.mark.asyncio
async def test_handle_message_dead_letters_malformed_json():
    """Malformed JSON → message.dead_letter() called immediately."""
    message  = make_mock_message(b"not valid json {{{")
    receiver = make_mock_receiver()

    await handle_message(message, receiver)

    receiver.dead_letter_message.assert_called_once()
    receiver.complete_message.assert_not_called()
    receiver.abandon_message.assert_not_called()

    call_kwargs = receiver.dead_letter_message.call_args.kwargs
    assert call_kwargs["reason"] == "MalformedBody"


@pytest.mark.asyncio
async def test_handle_message_dead_letters_missing_fields():
    """Message missing required fields → dead-lettered immediately."""
    import json
    incomplete = {"orderId": "abc123", "restaurantName": "Test"}
    message    = make_mock_message(json.dumps(incomplete).encode())
    receiver   = make_mock_receiver()

    await handle_message(message, receiver)

    receiver.dead_letter_message.assert_called_once()
    call_kwargs = receiver.dead_letter_message.call_args.kwargs
    assert call_kwargs["reason"] == "MissingFields"


# ── SendGrid client tests ─────────────────────────────────────────────────────
# These functions are SYNCHRONOUS — call them directly without await.

def test_send_order_confirmation_returns_true_without_api_key():
    """When SENDGRID_API_KEY is not set, function returns True without sending."""
    with patch("app.email.sendgrid_client.settings") as mock_settings:
        mock_settings.sendgrid_api_key = ""
        result = send_order_confirmation(
            to_email="test@test.com",
            order_id="abc123",
            restaurant_name="Test Restaurant",
            items=[{"name": "Pizza", "quantity": 1, "price": 10.0}],
            total_price=10.0,
            delivery_address={"street": "123 St", "city": "City", "phone": "123"},
        )
    assert result is True


def test_send_generic_email_returns_true_without_api_key():
    """When SENDGRID_API_KEY is not set, generic email returns True."""
    with patch("app.email.sendgrid_client.settings") as mock_settings:
        mock_settings.sendgrid_api_key = ""
        result = send_generic_email(
            to="test@test.com",
            subject="Test Subject",
            body="Test body content",
        )
    assert result is True


def test_send_order_confirmation_returns_false_on_sendgrid_error():
    """When SendGrid raises an exception, function returns False."""
    with patch("app.email.sendgrid_client.settings") as mock_settings:
        mock_settings.sendgrid_api_key = "SG.fake-key"
        # Patch SendGridAPIClient at module level — now a top-level import
        with patch("app.email.sendgrid_client.SendGridAPIClient") as mock_sg:
            mock_sg.return_value.send.side_effect = Exception("Connection error")
            result = send_order_confirmation(
                to_email="test@test.com",
                order_id="abc123",
                restaurant_name="Test",
                items=[],
                total_price=0,
                delivery_address={},
            )
    assert result is False
