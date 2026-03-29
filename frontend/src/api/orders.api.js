// src/api/orders.api.js
//
// Order service API calls.
// Uses orderClient — routes to the Order service (port 3002 in dev,
// VITE_ORDER_SERVICE_URL in production).
//
// SECURITY: We never send prices from the frontend. Only itemId and
// quantity are sent — the Order service fetches prices from the Menu
// service server-side. This prevents price manipulation attacks.

import { orderClient } from './client';

/**
 * Places a new order.
 * @param {{ restaurantId, restaurantName, items, deliveryAddress }} orderData
 * @returns {Promise<{ order: object }>}
 */
export const createOrder = async (orderData) => {
  const response = await orderClient.post('/orders', orderData);
  return response.data;
};

/**
 * Returns a single order by ID.
 * Called by OrderPage every 10 seconds to poll for status updates.
 * @param {string} orderId
 * @returns {Promise<{ order: object }>}
 */
export const getOrder = async (orderId) => {
  const response = await orderClient.get(`/orders/${orderId}`);
  return response.data;
};

/**
 * Returns paginated order history for a user.
 * @param {string} userId
 * @returns {Promise<{ orders: Array, pagination: object }>}
 */
export const getUserOrders = async (userId) => {
  const response = await orderClient.get(`/orders/user/${userId}`);
  return response.data;
};
