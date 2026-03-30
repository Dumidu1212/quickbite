# app/messaging/service_bus_consumer.py
#
# Azure Service Bus consumer for the Notify service.
#
# HOW IT WORKS:
#   1. On startup (via FastAPI lifespan), start_consumer() is called as an asyncio task
#   2. It creates a ServiceBusClient using the connection string from settings
#   3. It opens a receiver on the order-events queue
#   4. For each incoming message it calls handle_message()
#   5. handle_message() parses the payload and calls send_order_confirmation()
#   6. On email success: message.complete() — removes from queue permanently
#   7. On email failure: message.abandon() — returns to queue for retry
#   8. After max_delivery_count retries: Azure automatically dead-letters the message
#
# RETRY STRATEGY:
#   Azure Service Bus handles retries automatically via max_delivery_count (default 10).
#   When we call abandon(), the message goes back to the queue with deliveryCount + 1.
#   After max_delivery_count failed deliveries, Azure moves it to the dead-letter queue.
#   We dead-letter immediately for messages we can never process (bad JSON format).
#
# GRACEFUL DEGRADATION:
#   If SERVICEBUS_CONN is not set (local dev), the consumer logs a warning and exits.
#   This allows local development without an Azure subscription.
#   The health endpoint reflects whether the consumer is running.

import asyncio
import json
import logging

from app.core.config import get_settings
from app.email.sendgrid_client import send_order_confirmation

logger   = logging.getLogger(__name__)
settings = get_settings()

# Module-level flag — tracks whether the consumer is actively running.
# Read by the health endpoint to reflect real operational status.
consumer_running = False


async def handle_message(message, receiver) -> None:
    """
    Processes a single Service Bus message.

    Parses the JSON body, calls the email sender, and either completes
    or abandons the message based on the outcome.

    Args:
        message:  The Service Bus message to process
        receiver: The queue receiver, used to complete/abandon/dead-letter
    """
    raw_body = b"".join(message.body)

    # Attempt to parse the JSON payload
    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        # Malformed message — dead-letter immediately, retrying will never succeed
        logger.error("[ServiceBus] Malformed message body — dead-lettering: %s", str(e))
        await receiver.dead_letter_message(
            message,
            reason="MalformedBody",
            error_description=f"Could not parse JSON: {str(e)}",
        )
        return

    # Validate required fields before attempting email send
    required = ["orderId", "userEmail", "restaurantName", "items", "totalPrice"]
    missing  = [f for f in required if f not in payload]
    if missing:
        logger.error("[ServiceBus] Message missing required fields %s — dead-lettering", missing)
        await receiver.dead_letter_message(
            message,
            reason="MissingFields",
            error_description=f"Missing: {', '.join(missing)}",
        )
        return

    # Attempt to send the confirmation email
    logger.info("[ServiceBus] Processing OrderCreated for order %s", payload.get("orderId"))

    success = send_order_confirmation(
        to_email=payload["userEmail"],
        order_id=payload["orderId"],
        restaurant_name=payload["restaurantName"],
        items=payload["items"],
        total_price=payload["totalPrice"],
        delivery_address=payload.get("deliveryAddress", {}),
    )

    if success:
        # Email sent — complete the message to remove it from the queue
        await receiver.complete_message(message)
        logger.info("[ServiceBus] Order %s email sent and message completed", payload["orderId"])
    else:
        # Email failed — abandon so Service Bus retries on next poll
        await receiver.abandon_message(message)
        logger.warning("[ServiceBus] Email failed for order %s — message abandoned for retry", payload["orderId"])


async def start_consumer() -> None:
    """
    Starts the Service Bus queue consumer as a long-running asyncio task.
    Called from the FastAPI lifespan startup handler.
    """
    global consumer_running

    # Skip gracefully if Service Bus connection string is not configured
    if not settings.servicebus_conn or not settings.servicebus_conn.strip():
        logger.warning(
            "[ServiceBus] SERVICEBUS_CONN not configured — consumer not started. "
            "Set SERVICEBUS_CONN in .env to enable email notifications."
        )
        return

    try:
        from azure.servicebus.aio import ServiceBusClient
    except ImportError:
        logger.error("[ServiceBus] azure-servicebus package not installed.")
        return

    # Validate connection string format before attempting to connect.
    # Azure SDK throws ValueError for blank or malformed strings.
    # We catch this here to give a clear startup message instead of a crash.
    try:
        ServiceBusClient.from_connection_string(settings.servicebus_conn)
    except ValueError as e:
        logger.warning(
            "[ServiceBus] Connection string appears malformed — consumer not started. "
            "Check SERVICEBUS_CONN in your .env file. Error: %s", str(e)
        )
        return

    logger.info(
        "[ServiceBus] Starting consumer on queue '%s'",
        settings.servicebus_queue_name,
    )

    consumer_running = True

    try:
        async with ServiceBusClient.from_connection_string(
            settings.servicebus_conn,
            logging_enable=False,
        ) as client:
            logger.info("[ServiceBus] Consumer ready — listening for OrderCreated events")

            # Keep reconnecting — max_wait_time=5 causes the async iterator
            # to complete after 5s of silence. The while loop restarts it.
            while True:
                async with client.get_queue_receiver(
                    queue_name=settings.servicebus_queue_name,
                    max_wait_time=5,
                ) as receiver:
                    async for message in receiver:
                        try:
                            await handle_message(message, receiver)
                        except Exception as e:
                            logger.error(
                                "[ServiceBus] Unexpected error handling message: %s", str(e),
                                exc_info=True,
                            )
                            try:
                                await receiver.abandon_message(message)
                            except Exception:
                                pass
                # Brief pause before re-opening receiver
                await asyncio.sleep(1)

    except asyncio.CancelledError:
        logger.info("[ServiceBus] Consumer task cancelled — shutting down cleanly")
        raise  # must re-raise so asyncio knows the task was cancelled
    except Exception as e:
        logger.error("[ServiceBus] Consumer encountered fatal error: %s", str(e), exc_info=True)
    finally:
        consumer_running = False
        logger.info("[ServiceBus] Consumer stopped")
