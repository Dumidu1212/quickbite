// src/routes/orderRoutes.js
//
// Order endpoints — STUB implementation.
// POST /orders is the most complex endpoint in the whole system.
// It orchestrates calls to user-service AND menu-service before saving.
// Full implementation in Sprint 3.

'use strict';

const express = require('express');

const router = express.Router();

/**
 * POST /orders
 * Creates a new order.
 *
 * Full flow (Sprint 3):
 *   1. Extract JWT from Authorization header
 *   2. Call user-service GET /auth/validate → get userId, email
 *   3. For each item in the order body, call menu-service GET /menu/items/:id
 *   4. Calculate totalPrice server-side from menu-service prices
 *   5. Save order to MongoDB
 *   6. Publish OrderCreated event to Azure Service Bus
 *   7. Return 201 with the saved order
 */
router.post('/', (_req, res) => {
  return res.status(501).json({ message: 'Not implemented yet' });
});

/**
 * GET /orders/:id
 * Returns a single order by MongoDB ID.
 */
router.get('/:id', (_req, res) => {
  return res.status(501).json({ message: 'Not implemented yet' });
});

/**
 * GET /orders/user/:userId
 * Returns paginated order history for a user.
 * Requires JWT matching the requested userId.
 */
router.get('/user/:userId', (_req, res) => {
  return res.status(501).json({ message: 'Not implemented yet' });
});

/**
 * PUT /orders/:id/status
 * Updates order status (e.g. placed → confirmed → preparing → delivered).
 * Admin-only endpoint — checked via X-Admin-Key header.
 */
router.put('/:id/status', (_req, res) => {
  return res.status(501).json({ message: 'Not implemented yet' });
});

module.exports = router;
