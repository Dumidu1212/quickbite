// src/api/orders.api.js
//
// Order service API calls.
// Maps to endpoints on the Order service (port 3002 in development).
//
// IMPORTANT — server-side price calculation:
//   When creating an order, we send itemId and quantity only.
//   The Order service fetches current prices from the Menu service.
//   We never trust or send prices from the frontend — this prevents
//   price manipulation where a client sends price: 0.01 for a £14 item.

import { orderClient as apiClient } from './client';

/**
 * Places a new order.
 * Calls POST /orders on the Order service.
 * The Order service validates the JWT, verifies each item with the Menu
 * service, calculates the total server-side, and saves to MongoDB.
 *
 * @param {{ restaurantId, items, deliveryAddress }} orderData
 * @returns {Promise<{ order: object }>}
 */
export const createOrder = async (orderData) => {
  const response = await apiClient.post('/orders', orderData);
  return response.data;
};

/**
 * Returns a single order by ID.
 * Called by OrderPage every 10 seconds to poll for status updates.
 *
 * @param {string} orderId - MongoDB ObjectId string
 * @returns {Promise<{ order: object }>}
 */
export const getOrder = async (orderId) => {
  const response = await apiClient.get(`/orders/${orderId}`);
  return response.data;
};

/**
 * Returns paginated order history for a user.
 * Called by OrderHistoryPage (future sprint).
 *
 * @param {string} userId
 * @returns {Promise<{ orders: Array }>}
 */
export const getUserOrders = async (userId) => {
  const response = await apiClient.get(`/orders/user/${userId}`);
  return response.data;
};
