// src/messaging/serviceBusPublisher.js
//
// Publishes events to Azure Service Bus.
//
// WHY ASYNC MESSAGING FOR NOTIFICATIONS?
//   Sending a confirmation email is not part of the order creation transaction.
//   If we called the Notify service directly (synchronous HTTP):
//     - A slow Notify service delays every order
//     - A down Notify service breaks every order
//   With Service Bus:
//     - The order always succeeds as long as MongoDB write succeeds
//     - The email is delivered eventually — even if Notify service was briefly down
//     - Messages are durable — stored by Azure until consumed
//
// FIRE-AND-FORGET:
//   publishOrderCreated() is called after the order is saved to MongoDB.
//   If publishing fails, the order is already persisted and the 201 is returned.
//   The publish failure is logged for operational monitoring via Azure Monitor.
//
// CONNECTION MANAGEMENT:
//   We create one ServiceBusClient per process and reuse it for all messages.
//   Creating a new client per message is expensive (TLS handshake each time).
//   The client is lazily initialised on the first publish call.
//
// GRACEFUL DEGRADATION:
//   If SERVICEBUS_CONN is not configured (local development without Azure),
//   the publisher logs a warning and skips the publish silently.
//   This allows local development without an Azure subscription.

'use strict';

const { ServiceBusClient } = require('@azure/service-bus');
const config = require('../config/env');

// Lazily initialised — created once on first publish, reused thereafter
let sbClient  = null;
let sbSender  = null;

/**
 * Returns a cached Service Bus sender, creating one if needed.
 * Lazily initialised to avoid startup errors when SERVICEBUS_CONN is absent.
 *
 * @returns {import('@azure/service-bus').ServiceBusSender}
 */
const getSender = () => {
  if (!sbSender) {
    sbClient = new ServiceBusClient(config.serviceBusConn);
    sbSender = sbClient.createSender(config.serviceBusQueue);
  }
  return sbSender;
};

/**
 * Publishes an OrderCreated event to the Azure Service Bus queue.
 *
 * The Notify service subscribes to this queue and sends a confirmation email
 * when it receives this message. The publish is asynchronous — the caller
 * does not wait for the email to be sent.
 *
 * Message body schema:
 * {
 *   eventType:       'OrderCreated',
 *   orderId:         string,
 *   userId:          string,
 *   userEmail:       string,
 *   restaurantName:  string,
 *   items:           Array<{name, quantity, price}>,
 *   totalPrice:      number,
 *   deliveryAddress: {street, city, phone},
 *   createdAt:       Date,
 * }
 *
 * @param {object} orderData — the order details to include in the event
 * @returns {Promise<void>}
 */
const publishOrderCreated = async (orderData) => {
  // Gracefully skip if Service Bus is not configured (local dev without Azure)
  if (!config.serviceBusConn) {
    console.warn('[ServiceBus] SERVICEBUS_CONN not set — skipping publish in local dev mode');
    return;
  }

  const message = {
    // contentType tells the consumer how to parse the message body
    contentType: 'application/json',
    subject:     'OrderCreated',

    // The full event payload — everything the Notify service needs to send the email
    body: {
      eventType:       'OrderCreated',
      orderId:         orderData.orderId,
      userId:          orderData.userId,
      userEmail:       orderData.userEmail,
      restaurantName:  orderData.restaurantName,
      items:           orderData.items.map((item) => ({
        name:     item.name,
        quantity: item.quantity,
        price:    item.price,
      })),
      totalPrice:      orderData.totalPrice,
      deliveryAddress: orderData.deliveryAddress,
      createdAt:       orderData.createdAt,
    },
  };

  try {
    const sender = getSender();
    await sender.sendMessages(message);
    console.info(`[ServiceBus] Published OrderCreated event for order ${orderData.orderId}`);
  } catch (error) {
    // Log error with full context for Azure Monitor alerting
    // Do NOT re-throw — publisher failure must not break order creation
    console.error('[ServiceBus] Failed to publish OrderCreated event:', {
      orderId: orderData.orderId,
      error:   error.message,
    });
    throw error; // re-throw so controller can log but still return 201
  }
};

/**
 * Gracefully closes the Service Bus connection.
 * Called during application shutdown to allow in-flight messages to complete.
 */
const closeConnection = async () => {
  try {
    if (sbSender) {
      await sbSender.close();
      sbSender = null;
    }
    if (sbClient) {
      await sbClient.close();
      sbClient = null;
    }
    console.info('[ServiceBus] Connection closed cleanly');
  } catch (error) {
    console.error('[ServiceBus] Error closing connection:', error.message);
  }
};

module.exports = { publishOrderCreated, closeConnection };
