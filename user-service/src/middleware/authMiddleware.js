// src/middleware/authMiddleware.js
//
// JWT authentication middleware.
//
// HOW MIDDLEWARE WORKS IN EXPRESS:
// When a request hits a protected route, Express runs this function
// BEFORE the route handler. If the token is valid, we attach the
// decoded user info to req.user and call next() to continue.
// If invalid, we return 401 immediately and the route handler
// never runs.
//
// USAGE:
//   router.get('/profile', authenticate, userController.getProfile);
//   The route handler receives req.user = { userId, email }

'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Verifies the JWT in the Authorization header.
 * On success: attaches decoded payload to req.user and calls next()
 * On failure: returns 401 Unauthorized
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check header exists and has correct format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authorization header missing or malformed. Expected: Bearer <token>',
    });
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'quickbite-user-service',
      audience: 'quickbite-services',
    });

    // Attach user info to request — available in all subsequent handlers
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please log in again.',
      });
    }

    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Invalid authentication token.',
    });
  }
};

module.exports = { authenticate };
