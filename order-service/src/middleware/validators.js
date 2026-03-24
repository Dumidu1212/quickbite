// src/middleware/validators.js
//
// Input validation rules for Order service endpoints.
//
// WHY VALIDATE HERE AND NOT IN THE CONTROLLER?
//   Controllers should contain business logic only — not field checking.
//   Separating validators makes each rule explicit, reusable, and testable.
//   The controller calls validationResult(req) to collect errors in one place.
//
// VALIDATION PHILOSOPHY:
//   We validate structure and format here (field types, lengths, patterns).
//   We validate business rules in the controller (item exists, item available).
//   These are different concerns and belong in different layers.

'use strict';

const { body, param } = require('express-validator');

/**
 * Validation rules for POST /orders
 *
 * We validate:
 *   - restaurantId: must be a non-empty string
 *   - items: must be a non-empty array, each item needs itemId and quantity
 *   - deliveryAddress: must have street, city, and phone
 *
 * We deliberately do NOT validate item prices from the client —
 * prices are always fetched server-side from the Menu service.
 */
const validateCreateOrder = [
  body('restaurantId')
    .trim()
    .notEmpty()
    .withMessage('Restaurant ID is required'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),

  body('items.*.itemId')
    .trim()
    .notEmpty()
    .withMessage('Each item must have a valid itemId'),

  body('items.*.quantity')
    .isInt({ min: 1, max: 99 })
    .withMessage('Item quantity must be between 1 and 99'),

  body('deliveryAddress.street')
    .trim()
    .notEmpty()
    .withMessage('Delivery street address is required')
    .isLength({ max: 200 })
    .withMessage('Street address cannot exceed 200 characters'),

  body('deliveryAddress.city')
    .trim()
    .notEmpty()
    .withMessage('Delivery city is required')
    .isLength({ max: 100 })
    .withMessage('City cannot exceed 100 characters'),

  body('deliveryAddress.phone')
    .trim()
    .notEmpty()
    .withMessage('Delivery phone number is required')
    .matches(/^\+?[\d\s\-()]{7,20}$/)
    .withMessage('Please provide a valid phone number'),
];

/**
 * Validation rules for PUT /orders/:id/status
 */
const validateStatusUpdate = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Order ID is required'),

  body('status')
    .isIn(['placed', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'])
    .withMessage('Invalid order status. Must be one of: placed, confirmed, preparing, ready, delivered, cancelled'),
];

module.exports = { validateCreateOrder, validateStatusUpdate };
