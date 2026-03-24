// src/controllers/orderController.js
//
// Order service business logic.
//
// THIS IS THE INTEGRATION HUB OF THE ENTIRE PLATFORM.
// A single POST /orders request touches four separate systems:
//   1. authenticate middleware — validates JWT via User service (sets req.user)
//   2. Menu service  — validates each item, gets authoritative prices
//   3. MongoDB       — persists the order document
//   4. Azure Service Bus — publishes OrderCreated event (fire-and-forget)
//
// JWT VALIDATION:
//   This controller does NOT re-validate the JWT.
//   The authenticate middleware (authMiddleware.js) already called the User
//   service, verified the token, and set req.user = { userId, email }.
//   Repeating that work here would be redundant and create a double-call.
//   The controller trusts the middleware — this is the correct layering.
//
// SECURITY — SERVER-SIDE PRICE CALCULATION:
//   Item prices are fetched from the Menu service, never from the request body.
//   This prevents price manipulation attacks where a client sends price: 0.01.

'use strict';

const { validationResult } = require('express-validator');
const Order               = require('../models/Order');
const { getMenuItem }     = require('../clients/menuClient');
const { publishOrderCreated } = require('../messaging/serviceBusPublisher');

// ── Helper functions ────────────────────────────────────────────────────────

/**
 * Formats express-validator errors into a consistent response shape.
 *
 * @param {import('express-validator').Result} errors
 * @returns {Array<{field: string, message: string}>}
 */
const formatValidationErrors = (errors) =>
  errors.array().map((err) => ({
    field:   err.path,
    message: err.msg,
  }));

/**
 * Validates all items by calling the Menu service in parallel.
 * Returns validated items with authoritative server-side prices.
 * Throws an operational error if any item is not found or unavailable.
 *
 * @param {Array<{itemId: string, quantity: number}>} requestedItems
 * @returns {Promise<Array<{itemId, name, price, quantity}>>}
 */
const validateAndPriceItems = async (requestedItems) => {
  // Parallel calls reduce latency vs sequential
  const results = await Promise.all(
    requestedItems.map((item) => getMenuItem(item.itemId))
  );

  const validatedItems = [];

  for (let i = 0; i < requestedItems.length; i++) {
    const menuItem  = results[i];
    const requested = requestedItems[i];

    if (!menuItem) {
      const error = new Error(`Item ${requested.itemId} was not found in the menu`);
      error.statusCode = 400;
      error.field = `items[${i}].itemId`;
      throw error;
    }

    if (!menuItem.isAvailable) {
      const error = new Error(`"${menuItem.name}" is currently unavailable`);
      error.statusCode = 400;
      error.field = `items[${i}].itemId`;
      throw error;
    }

    // Always use server-side price — ignore any price sent by the client
    validatedItems.push({
      itemId:   menuItem.id,
      name:     menuItem.name,
      price:    menuItem.price,
      quantity: requested.quantity,
    });
  }

  return validatedItems;
};

/**
 * Calculates order total from validated items.
 * Rounded to 2 decimal places to avoid floating-point drift.
 *
 * @param {Array<{price: number, quantity: number}>} items
 * @returns {number}
 */
const calculateTotal = (items) =>
  Math.round(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100
  ) / 100;

// ── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /orders
 *
 * Full order creation flow:
 *   1. Validate request body (express-validator, run before this handler)
 *   2. Read identity from req.user (set by authenticate middleware)
 *   3. Validate and price items via Menu service
 *   4. Calculate total server-side
 *   5. Save to MongoDB
 *   6. Publish OrderCreated to Service Bus (fire-and-forget)
 *   7. Return 201
 */
const createOrder = async (req, res, next) => {
  try {
    // Step 1 — check express-validator results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: formatValidationErrors(errors) });
    }

    // Step 2 — use identity set by authenticate middleware
    // authenticate already called User service, verified the JWT,
    // and set req.user = { userId, email }. No need to re-validate here.
    const { userId, email } = req.user;

    const { restaurantId, restaurantName, items: requestedItems, deliveryAddress } = req.body;

    // Step 3 — validate items and fetch authoritative prices from Menu service
    let validatedItems;
    try {
      validatedItems = await validateAndPriceItems(requestedItems);
    } catch (itemError) {
      return res.status(itemError.statusCode || 400).json({
        errors: [{
          field:   itemError.field || 'items',
          message: itemError.message,
        }],
      });
    }

    // Step 4 — calculate total server-side
    const totalPrice = calculateTotal(validatedItems);

    // Step 5 — save to MongoDB
    const order = await Order.create({
      userId,
      restaurantId,
      restaurantName: restaurantName || 'Restaurant',
      items:          validatedItems,
      totalPrice,
      deliveryAddress: {
        street: deliveryAddress.street.trim(),
        city:   deliveryAddress.city.trim(),
        phone:  deliveryAddress.phone.trim(),
      },
      status: 'placed',
    });

    // Step 6 — publish to Service Bus (fire-and-forget)
    // Order is already persisted. If publish fails we log but still return 201.
    try {
      await publishOrderCreated({
        orderId:         order.id,
        userId,
        userEmail:       email,
        restaurantName:  order.restaurantName,
        items:           validatedItems,
        totalPrice,
        deliveryAddress: order.deliveryAddress,
        createdAt:       order.createdAt,
      });
    } catch (publishError) {
      console.error('[OrderController] Service Bus publish failed:', publishError.message);
    }

    // Step 7 — return created order
    return res.status(201).json({
      message: 'Order placed successfully',
      order:   order.toJSON(),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /orders/:id
 *
 * Returns a single order. Enforces ownership — users can only read their own orders.
 */
const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        error:   'NOT_FOUND',
        message: 'Order not found',
      });
    }

    // Return 404 (not 403) so the order's existence is not revealed to other users
    if (order.userId !== req.user.userId) {
      return res.status(404).json({
        error:   'NOT_FOUND',
        message: 'Order not found',
      });
    }

    return res.status(200).json({ order: order.toJSON() });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /orders/user/:userId
 *
 * Returns paginated order history. Users can only access their own history.
 */
const getUserOrders = async (req, res, next) => {
  try {
    if (req.params.userId !== req.user.userId) {
      return res.status(403).json({
        error:   'FORBIDDEN',
        message: 'You can only access your own order history',
      });
    }

    const page  = Math.max(1, Number.parseInt(req.query.page,  10) || 1);
    const limit = Math.min(20, Number.parseInt(req.query.limit, 10) || 10);
    const skip  = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ userId: req.params.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments({ userId: req.params.userId }),
    ]);

    return res.status(200).json({
      orders:     orders.map((o) => o.toJSON()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext:    page < Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /orders/:id/status
 *
 * Updates order status. Admin-only — protected by X-Admin-Key via adminMiddleware.
 * Cannot update delivered or cancelled orders.
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: formatValidationErrors(errors) });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        error:   'NOT_FOUND',
        message: 'Order not found',
      });
    }

    // Prevent updating terminal states
    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(409).json({
        error:   'CONFLICT',
        message: `Cannot update a ${order.status} order`,
      });
    }

    order.status = req.body.status;
    await order.save();

    return res.status(200).json({
      message: `Order status updated to ${order.status}`,
      order:   order.toJSON(),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  getOrder,
  getUserOrders,
  updateOrderStatus,
};
