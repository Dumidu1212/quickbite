// src/routes/authRoutes.js
//
// Authentication endpoints — register, login, validate token, logout.
// STUB: Routes are defined with placeholder handlers.
//       Full implementation happens in Sprint 2.

'use strict';

const express = require('express');

const router = express.Router();

/**
 * POST /auth/register
 * Creates a new user account.
 * Body: { email, password, name }
 */
router.post('/register', (_req, res) => {
  // TODO (Sprint 2): implement registration
  return res.status(501).json({ message: 'Not implemented yet' });
});

/**
 * POST /auth/login
 * Authenticates a user and returns a JWT.
 * Body: { email, password }
 */
router.post('/login', (_req, res) => {
  // TODO (Sprint 2): implement login
  return res.status(501).json({ message: 'Not implemented yet' });
});

/**
 * GET /auth/validate
 * Validates a JWT token. Called by other services (e.g. order-service).
 * Header: Authorization: Bearer <token>
 */
router.get('/validate', (_req, res) => {
  // TODO (Sprint 2): implement token validation
  return res.status(501).json({ message: 'Not implemented yet' });
});

/**
 * POST /auth/logout
 * Invalidates the current JWT token.
 * Header: Authorization: Bearer <token>
 */
router.post('/logout', (_req, res) => {
  // TODO (Sprint 2): implement logout
  return res.status(501).json({ message: 'Not implemented yet' });
});

module.exports = router;
