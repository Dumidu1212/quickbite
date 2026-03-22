# app/email/sendgrid_client.py
#
# SendGrid email client — STUB implementation.
# Full implementation in Sprint 3.
#
# WHY SENDGRID?
# SendGrid is a managed email delivery service.
# It handles: email deliverability, bounce handling, spam filtering.
# Free tier: 100 emails/day — sufficient for this prototype.
#
# We wrap SendGrid in our own module (not calling it directly from routes)
# because:
#   1. We can swap SendGrid for another provider by changing one file
#   2. We can mock this module in tests without real SendGrid calls
#   3. We can add retry logic, logging, and error handling in one place

from app.core.config import get_settings

settings = get_settings()


async def send_order_confirmation(
    to_email: str,
    order_id: str,
    restaurant_name: str,
    items: list,
    total_price: float,
    delivery_address: dict,
) -> bool:
    """
    Sends an order confirmation email to the customer.

    Returns True on success, False on failure.
    The caller handles retries via Service Bus message abandonment.

    TODO (Sprint 3): implement with sendgrid Python library
    """
    print(
        f"[SendGrid] STUB: Would send order confirmation to {to_email} "
        f"for order {order_id} (total: ${total_price:.2f})"
    )
    return True


async def send_generic_email(to: str, subject: str, body: str) -> bool:
    """
    Sends a generic email. Used by POST /notify/send for testing and admin.

    TODO (Sprint 3): implement with sendgrid Python library
    """
    print(f"[SendGrid] STUB: Would send email to {to} — subject: {subject}")
    return True
