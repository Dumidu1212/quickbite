// src/middleware/validators.js
//
// Express-validator validation chains.
//
// WHY SEPARATE VALIDATORS FROM CONTROLLERS?
// The controller should only contain business logic — not a wall of
// if-statements checking field lengths and formats.
// Separating them means:
//   - Each validator is a reusable array of rules
//   - The controller just calls validationResult(req) to get errors
//   - Adding a new validation rule doesn't change the controller
//   - Tests can import validators independently

'use strict';

const { body } = require('express-validator');

/**
 * Validation rules for POST /auth/register
 */
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),   // converts to lowercase, removes dots in gmail etc.

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/\d/).withMessage('Password must contain at least one number'),
];

/**
 * Validation rules for POST /auth/login
 */
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

/**
 * Validation rules for PUT /users/profile
 */
const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

  body('phone')
    .optional()
    .trim()
    .isMobilePhone().withMessage('Please provide a valid phone number'),

  // Prevent updating email or password through this endpoint
  body('email')
    .not().exists().withMessage('Email cannot be updated through this endpoint'),

  body('password')
    .not().exists().withMessage('Use /auth/password to change your password'),
];

module.exports = { validateRegister, validateLogin, validateProfileUpdate };
