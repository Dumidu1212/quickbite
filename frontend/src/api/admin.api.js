// src/api/admin.api.js
//
// Admin API calls for the restaurant dashboard.
//
// AUTHENTICATION:
//   All admin endpoints require the X-Admin-Key header.
//   This key is stored in sessionStorage after the admin logs in
//   via AdminLoginPage and is attached to every request here.
//   It is never stored in the React state tree or localStorage.
//
// DESIGN:
//   Admin API calls are kept in a separate file from auth.api.js
//   and orders.api.js to maintain clear separation of concerns.
//   The admin dashboard has different auth (X-Admin-Key header)
//   from the customer-facing app (JWT Bearer token).

import apiClient from './client';

/**
 * Fetches all orders, optionally filtered by status.
 * Called by AdminDashboardPage to populate the order queue.
 *
 * NOTE: This endpoint does not exist yet on the Order service.
 * We call GET /orders/admin/all which we will add to orderRoutes.js.
 * It is protected by X-Admin-Key middleware.
 *
 * @param {string} adminKey - The admin key for X-Admin-Key header
 * @param {string|null} status - Optional status filter e.g. 'placed'
 * @returns {Promise<{orders: Array, pagination: object}>}
 */
export const getAllOrders = async (adminKey, status = null) => {
  const params = status ? { status } : {};
  const response = await apiClient.get('/orders/admin/all', {
    headers: { 'x-admin-key': adminKey },
    params,
  });
  return response.data;
};

/**
 * Updates the status of a specific order.
 * Calls PUT /orders/:id/status on the Order service.
 * Protected by X-Admin-Key header — customers cannot call this.
 *
 * @param {string} adminKey - The admin key
 * @param {string} orderId  - MongoDB ObjectId string
 * @param {string} status   - New status: confirmed|preparing|ready|delivered|cancelled
 * @returns {Promise<{message: string, order: object}>}
 */
export const updateOrderStatus = async (adminKey, orderId, status) => {
  const response = await apiClient.put(
    `/orders/${orderId}/status`,
    { status },
    { headers: { 'x-admin-key': adminKey } }
  );
  return response.data;
};
