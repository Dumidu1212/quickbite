// src/routes/userRoutes.js
//
// User profile endpoints.
// STUB: Full implementation in Sprint 2.

'use strict';

const express = require('express');

const router = express.Router();

/**
 * GET /users/profile
 * Returns the authenticated user's profile.
 * Requires: Authorization: Bearer <token>
 */
router.get('/profile', (_req, res) => {
  // TODO (Sprint 2): implement with JWT middleware
  return res.status(501).json({ message: 'Not implemented yet' });
});

/**
 * PUT /users/profile
 * Updates name and phone number.
 * Requires: Authorization: Bearer <token>
 */
router.put('/profile', (_req, res) => {
  // TODO (Sprint 2): implement update
  return res.status(501).json({ message: 'Not implemented yet' });
});

module.exports = router;
