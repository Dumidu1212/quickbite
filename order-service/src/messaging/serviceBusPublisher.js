// src/messaging/serviceBusPublisher.js
//
// Handles publishing events to Azure Service Bus.
// STUB implementation — wired up fully in Sprint 3.
//
// WHY ASYNC MESSAGING?
// When an order is placed, the notify-service needs to send a confirmation email.
// We could call notify-service directly (synchronous HTTP), but that creates
// tight coupling — if notify-service is down, the order fails.
//
// Instead, we publish an "OrderCreated" event to a Service Bus queue.
// The notify-service subscribes to that queue independently.
// The order always succeeds even if notify-service is temporarily down —
// it will pick up the event when it recovers. This is called eventual consistency.

'use strict';

/**
 * Publishes an OrderCreated event to Azure Service Bus.
 *
 * @param {object} orderData - The complete order object from MongoDB
 * @returns {Promise<void>}
 */
const publishOrderCreated = async (orderData) => {
  // TODO (Sprint 3): implement with @azure/service-bus SDK
  // The message payload will include:
  //   eventType: 'OrderCreated'
  //   orderId, userId, userEmail, restaurantName, items, totalPrice, createdAt
  console.info(`[ServiceBus] STUB: Would publish OrderCreated for order ${orderData?.id}`);
};

module.exports = { publishOrderCreated };
