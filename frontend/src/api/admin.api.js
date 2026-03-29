// src/api/admin.api.js
//
// Admin API calls for the restaurant dashboard.
//
// AUTHENTICATION:
//   Uses adminClient — a separate Axios instance that does NOT inject
//   the customer JWT and does NOT redirect on 401/403. Admin auth failures
//   are handled by AdminAuthContext, which shows an error on AdminLoginPage.
//   This prevents an admin key failure from logging out the customer session.
//
// ADMIN KEY:
//   Passed as X-Admin-Key header on every request. Stored in sessionStorage
//   via AdminAuthContext after successful login verification.

import { adminClient } from './client';

/**
 * Fetches all orders for the restaurant dashboard.
 * Calls GET /orders/admin/all on the Order service.
 *
 * @param {string} adminKey - The X-Admin-Key value
 * @param {string|null} status - Optional status filter
 * @returns {Promise<{ orders: Array, pagination: object }>}
 */
export const getAllOrders = async (adminKey, status = null) => {
  const params = status ? { status } : {};
  const response = await adminClient.get('/orders/admin/all', {
    headers: { 'x-admin-key': adminKey },
    params,
  });
  return response.data;
};

/**
 * Updates the status of a specific order.
 * Calls PUT /orders/:id/status on the Order service.
 *
 * @param {string} adminKey - The X-Admin-Key value
 * @param {string} orderId  - MongoDB ObjectId string
 * @param {string} status   - New status value
 * @returns {Promise<{ message: string, order: object }>}
 */
export const updateOrderStatus = async (adminKey, orderId, status) => {
  const response = await adminClient.put(
    `/orders/${orderId}/status`,
    { status },
    { headers: { 'x-admin-key': adminKey } }
  );
  return response.data;
};
