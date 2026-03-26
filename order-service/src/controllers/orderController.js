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
//   The authenticate middleware already called the User service,
//   verified the token, and set req.user = { userId, email }.
//
// SECURITY — SERVER-SIDE PRICE CALCULATION:
//   Item prices are fetched from the Menu service, never from the request body.
//   This prevents price manipulation attacks where a client sends price: 0.01.

'use strict';

const { validationResult } = require('express-validator');
const Order                    = require('../models/Order');
const { getMenuItem }          = require('../clients/menuClient');
const { publishOrderCreated }  = require('../messaging/serviceBusPublisher');

// ── Helper functions ────────────────────────────────────────────────────────

const formatValidationErrors = (errors) =>
  errors.array().map((err) => ({
    field:   err.path,
    message: err.msg,
  }));

const validateAndPriceItems = async (requestedItems) => {
  const menuItemPromises = requestedItems.map((item) => getMenuItem(item.itemId));
  const results          = await Promise.all(menuItemPromises);
  const validatedItems   = [];

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

    validatedItems.push({
      itemId:   menuItem.id,
      name:     menuItem.name,
      price:    menuItem.price,
      quantity: requested.quantity,
    });
  }

  return validatedItems;
};

const calculateTotal = (items) =>
  Math.round(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100
  ) / 100;

// ── Controllers ─────────────────────────────────────────────────────────────

const createOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: formatValidationErrors(errors) });
    }

    const { userId, email } = req.user;
    const { restaurantId, restaurantName, items: requestedItems, deliveryAddress } = req.body;

    let validatedItems;
    try {
      validatedItems = await validateAndPriceItems(requestedItems);
    } catch (itemError) {
      return res.status(itemError.statusCode || 400).json({
        errors: [{ field: itemError.field || 'items', message: itemError.message }],
      });
    }

    const totalPrice = calculateTotal(validatedItems);

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

    return res.status(201).json({
      message: 'Order placed successfully',
      order:   order.toJSON(),
    });
  } catch (error) {
    return next(error);
  }
};

const getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Order not found' });
    }

    if (order.userId !== req.user.userId) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Order not found' });
    }

    return res.status(200).json({ order: order.toJSON() });
  } catch (error) {
    return next(error);
  }
};

const getUserOrders = async (req, res, next) => {
  try {
    if (req.params.userId !== req.user.userId) {
      return res.status(403).json({
        error:   'FORBIDDEN',
        message: 'You can only access your own order history',
      });
    }

    // S3649: use the verified identity from req.user (set by authenticate
    // middleware) rather than the raw URL parameter. Both are the same value
    // at this point (ownership check above), but req.user.userId comes from
    // a verified JWT — not directly from user-controlled input.
    const { userId } = req.user;

    const page  = Math.max(1, Number.parseInt(req.query.page,  10) || 1);
    const limit = Math.min(20, Number.parseInt(req.query.limit, 10) || 10);
    const skip  = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments({ userId }),
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

const updateOrderStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: formatValidationErrors(errors) });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Order not found' });
    }

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

const getAllOrdersAdmin = async (req, res, next) => {
  try {
    const page  = Math.max(1, Number.parseInt(req.query.page,  10) || 1);
    const limit = Math.min(50, Number.parseInt(req.query.limit, 10) || 50);
    const skip  = (page - 1) * limit;

    // S3649 fix: use predefined filter objects instead of constructing queries
    // from user input. Each filter object is a hardcoded literal — the user
    // input only selects which predefined object to use, never contributes
    // any value to the query itself.
    const STATUS_FILTERS = Object.freeze({
      placed:    { status: 'placed' },
      confirmed: { status: 'confirmed' },
      preparing: { status: 'preparing' },
      ready:     { status: 'ready' },
      delivered: { status: 'delivered' },
      cancelled: { status: 'cancelled' },
    });

    const requestedStatus = typeof req.query.status === 'string'
      ? req.query.status
      : '';

    if (requestedStatus && !Object.prototype.hasOwnProperty.call(STATUS_FILTERS, requestedStatus)) {
      return res.status(400).json({
        error:   'BAD_REQUEST',
        message: 'Invalid status filter',
      });
    }

    const filter = requestedStatus ? STATUS_FILTERS[requestedStatus] : {};

    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      orders:     orders.map((o) => o.toJSON()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
  getAllOrdersAdmin,
};
