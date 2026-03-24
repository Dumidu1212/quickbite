// src/routes/orderRoutes.js
//
// Order endpoint routing.
//
// ROUTE STRUCTURE:
//   POST   /orders                 — create order (JWT required)
//   GET    /orders/user/:userId    — order history (JWT required, own orders only)
//   GET    /orders/:id             — single order  (JWT required, own orders only)
//   PUT    /orders/:id/status      — update status (Admin key required)
//
// NOTE ON ROUTE ORDER:
//   GET /orders/user/:userId MUST be registered BEFORE GET /orders/:id.
//   Express matches routes in registration order.
//   If /:id is first, the string "user" would be treated as an order ID
//   and the user history route would never be reached.

'use strict';

const express = require('express');
const { authenticate }       = require('../middleware/authMiddleware');
const { requireAdminKey }    = require('../middleware/adminMiddleware');
const { validateCreateOrder, validateStatusUpdate } = require('../middleware/validators');
const orderController        = require('../controllers/orderController');

const router = express.Router();

// POST /orders — create a new order
// authenticate runs first (validates JWT via User service)
// validateCreateOrder runs second (validates request body fields)
// orderController.createOrder runs last (business logic)
router.post(
  '/',
  authenticate,
  validateCreateOrder,
  orderController.createOrder
);

// GET /orders/user/:userId — order history
// MUST be before /:id to prevent "user" matching as an order ID
router.get(
  '/user/:userId',
  authenticate,
  orderController.getUserOrders
);

// GET /orders/:id — single order
router.get(
  '/:id',
  authenticate,
  orderController.getOrder
);

// PUT /orders/:id/status — admin status update
router.put(
  '/:id/status',
  requireAdminKey,
  validateStatusUpdate,
  orderController.updateOrderStatus
);

module.exports = router;
