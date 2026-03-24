# app/email/sendgrid_client.py
#
# SendGrid email client — synchronous functions.
#
# WHY SYNCHRONOUS (not async)?
#   The SendGrid Python SDK is a synchronous library. It uses the standard
#   urllib-based http client internally. There is no async version.
#   FastAPI can call synchronous functions from async route handlers without
#   blocking — it runs them in a thread pool executor automatically.
#   Marking them async when they have no await calls is a SonarLint violation (S7503).
#
# WHY TOP-LEVEL IMPORTS?
#   SendGrid is imported at the top of the file (not inside each function).
#   This makes the imports patchable in unit tests via unittest.mock.patch.
#   Lazy imports inside functions cannot be patched by the standard mock library
#   because the module attribute does not exist at patch time.
#
# GRACEFUL DEGRADATION:
#   If SENDGRID_API_KEY is not set, functions log a warning and return True.
#   This allows local development without a SendGrid account.
#   The Service Bus consumer treats True as success and completes the message.

import logging

from app.core.config import get_settings

logger   = logging.getLogger(__name__)
settings = get_settings()

# Top-level conditional import — package may not be installed in minimal envs.
# All functions check settings.sendgrid_api_key before using these.
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, Content, MimeType
    SENDGRID_AVAILABLE = True
except ImportError:
    SendGridAPIClient = None
    Mail              = None
    Content           = None
    MimeType          = None
    SENDGRID_AVAILABLE = False


def _build_order_html(
    order_id: str,
    restaurant_name: str,
    items: list,
    total_price: float,
    delivery_address: dict,
) -> str:
    """
    Builds the HTML body for an order confirmation email.

    Args:
        order_id:         MongoDB order ID (last 8 chars shown to customer)
        restaurant_name:  Name of the restaurant
        items:            List of ordered items [{name, quantity, price}]
        total_price:      Server-calculated order total
        delivery_address: {street, city, phone}

    Returns:
        Formatted HTML string
    """
    items_html = "".join(
        f"""
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6">{item['name']}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center">{item['quantity']}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right">£{item['price']:.2f}</td>
        </tr>
        """
        for item in items
    )

    order_ref = order_id[-8:].upper()

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmed — QuickBite</title>
    </head>
    <body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif">
      <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <div style="background:#111827;padding:28px 32px">
          <h1 style="margin:0;color:#fff;font-size:20px;font-weight:600">QuickBite</h1>
          <p style="margin:6px 0 0;color:#9ca3af;font-size:14px">Your order is confirmed</p>
        </div>
        <div style="padding:32px">
          <p style="margin:0 0 4px;font-size:14px;color:#6b7280">Order reference</p>
          <p style="margin:0 0 24px;font-size:22px;font-weight:600;color:#111827;letter-spacing:1px">#{order_ref}</p>
          <p style="margin:0 0 16px;font-size:14px;color:#374151">
            Your order from <strong>{restaurant_name}</strong> has been received and is being prepared.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:500;border-bottom:2px solid #e5e7eb">Item</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;color:#6b7280;font-weight:500;border-bottom:2px solid #e5e7eb">Qty</th>
                <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:500;border-bottom:2px solid #e5e7eb">Price</th>
              </tr>
            </thead>
            <tbody style="font-size:14px;color:#374151">
              {items_html}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding:12px;font-weight:600;font-size:14px;color:#111827">Total</td>
                <td style="padding:12px;font-weight:600;font-size:14px;color:#111827;text-align:right">£{total_price:.2f}</td>
              </tr>
            </tfoot>
          </table>
          <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px">
            <p style="margin:0 0 8px;font-size:12px;font-weight:500;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Delivery address</p>
            <p style="margin:0;font-size:14px;color:#374151">
              {delivery_address.get('street', '')}<br>
              {delivery_address.get('city', '')}<br>
              {delivery_address.get('phone', '')}
            </p>
          </div>
          <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center">
            Thank you for ordering with QuickBite!
          </p>
        </div>
      </div>
    </body>
    </html>
    """


def _build_order_text(
    order_id: str,
    restaurant_name: str,
    items: list,
    total_price: float,
    delivery_address: dict,
) -> str:
    """Plain-text fallback for the order confirmation email."""
    order_ref  = order_id[-8:].upper()
    items_text = "\n".join(
        f"  - {item['name']} x{item['quantity']}  £{item['price']:.2f}"
        for item in items
    )
    return f"""
QuickBite — Order Confirmed

Order reference: #{order_ref}
Restaurant: {restaurant_name}

Items:
{items_text}

Total: £{total_price:.2f}

Delivery to:
  {delivery_address.get('street', '')}
  {delivery_address.get('city', '')}
  {delivery_address.get('phone', '')}

Thank you for ordering with QuickBite!
    """.strip()


def send_order_confirmation(
    to_email: str,
    order_id: str,
    restaurant_name: str,
    items: list,
    total_price: float,
    delivery_address: dict,
) -> bool:
    """
    Sends an order confirmation email to the customer via SendGrid.

    Called by the Service Bus consumer after receiving an OrderCreated event.
    This function is SYNCHRONOUS — the SendGrid SDK does not support async.

    Args:
        to_email:         Customer email address
        order_id:         MongoDB order ID
        restaurant_name:  Name of the restaurant
        items:            List of ordered items [{name, quantity, price}]
        total_price:      Server-calculated order total
        delivery_address: {street, city, phone}

    Returns:
        True on success or when skipped in dev mode.
        False on SendGrid API error — caller should abandon the message for retry.
    """
    if not settings.sendgrid_api_key:
        logger.warning(
            "[SendGrid] SENDGRID_API_KEY not set — skipping email to %s in dev mode",
            to_email,
        )
        return True

    if not SENDGRID_AVAILABLE:
        logger.error("[SendGrid] sendgrid package not installed — cannot send email")
        return False

    try:
        html_body = _build_order_html(
            order_id, restaurant_name, items, total_price, delivery_address
        )
        text_body = _build_order_text(
            order_id, restaurant_name, items, total_price, delivery_address
        )

        message = Mail(
            from_email=("noreply@quickbite.com", "QuickBite"),
            to_emails=to_email,
            subject=f"Order confirmed — QuickBite #{order_id[-8:].upper()}",
        )
        message.content = [
            Content(MimeType.text, text_body),
            Content(MimeType.html, html_body),
        ]

        sg       = SendGridAPIClient(settings.sendgrid_api_key)
        response = sg.send(message)

        if 200 <= response.status_code < 300:
            logger.info(
                "[SendGrid] Email sent to %s for order %s (status: %d)",
                to_email, order_id, response.status_code,
            )
            return True

        logger.error(
            "[SendGrid] Unexpected status %d sending to %s",
            response.status_code, to_email,
        )
        return False

    except Exception as e:
        logger.error(
            "[SendGrid] Failed to send email to %s for order %s: %s",
            to_email, order_id, str(e),
            exc_info=True,
        )
        return False


def send_generic_email(to: str, subject: str, body: str) -> bool:
    """
    Sends a generic plain-text email via SendGrid.
    Used by POST /notify/send for admin and testing purposes.

    This function is SYNCHRONOUS — the SendGrid SDK does not support async.

    Args:
        to:      Recipient email address
        subject: Email subject line
        body:    Plain text email body

    Returns:
        True on success or when skipped in dev mode.
        False on SendGrid API error.
    """
    if not settings.sendgrid_api_key:
        logger.warning(
            "[SendGrid] SENDGRID_API_KEY not set — skipping generic email in dev mode"
        )
        return True

    if not SENDGRID_AVAILABLE:
        logger.error("[SendGrid] sendgrid package not installed — cannot send email")
        return False

    try:
        message = Mail(
            from_email=("noreply@quickbite.com", "QuickBite"),
            to_emails=to,
            subject=subject,
            plain_text_content=body,
        )

        sg       = SendGridAPIClient(settings.sendgrid_api_key)
        response = sg.send(message)

        if 200 <= response.status_code < 300:
            logger.info(
                "[SendGrid] Generic email sent to %s (status: %d)",
                to, response.status_code,
            )
            return True

        logger.error(
            "[SendGrid] Unexpected status %d for generic email to %s",
            response.status_code, to,
        )
        return False

    except Exception as e:
        logger.error(
            "[SendGrid] Failed to send generic email to %s: %s",
            to, str(e),
            exc_info=True,
        )
        return False
