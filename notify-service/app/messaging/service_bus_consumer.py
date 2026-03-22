# app/messaging/service_bus_consumer.py
#
# Azure Service Bus consumer — STUB implementation.
# Full implementation in Sprint 3.
#
# HOW THIS WORKS (Sprint 3):
#   1. On startup, this consumer connects to the Azure Service Bus queue
#   2. It polls continuously for new messages
#   3. When a message arrives, it calls send_order_confirmation()
#   4. If the email sends successfully, it COMPLETES the message (removes from queue)
#   5. If the email fails, it ABANDONS the message (goes back to queue for retry)
#   6. After 3 failed attempts, the message goes to the dead-letter queue
#
# WHY RUN IN BACKGROUND?
#   The FastAPI server runs on the main thread.
#   The Service Bus consumer runs as an asyncio background task.
#   They share the same event loop — no threads needed.

import asyncio
from app.core.config import get_settings

settings = get_settings()


async def start_consumer():
    """
    Starts the Service Bus consumer as a background task.
    Called from the FastAPI lifespan startup handler.
    """
    print(
        f"[ServiceBus] STUB: Consumer would connect to queue "
        f"'{settings.servicebus_queue_name}' and start listening for OrderCreated events"
    )
    # TODO (Sprint 3): implement with azure-servicebus SDK
    # The real implementation will:
    #   async with ServiceBusClient.from_connection_string(conn) as client:
    #       async with client.get_queue_receiver(queue_name) as receiver:
    #           async for message in receiver:
    #               await handle_message(message, receiver)
