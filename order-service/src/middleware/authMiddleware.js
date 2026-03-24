// src/middleware/authMiddleware.js
//
// JWT authentication middleware for the Order service.
//
// HOW IT WORKS:
//   Rather than verifying the JWT locally (which would require sharing the
//   JWT_SECRET between services — a security anti-pattern), this middleware
//   calls GET /auth/validate on the User service.
//
//   If valid, the User service returns { valid: true, userId, email }.
//   This middleware attaches that data to req.user and calls next().
//   If invalid for any reason, it returns 401 immediately.
//
// WHY CALL THE USER SERVICE INSTEAD OF VERIFYING LOCALLY?
//   Each service having its own copy of JWT_SECRET creates two problems:
//   1. Secret rotation requires updating every service simultaneously
//   2. A compromised secret in one service exposes all services
//   Centralising verification in the User service means only that service
//   ever needs the secret. All other services trust its response.
//
// FAIL-CLOSED BEHAVIOUR:
//   If the User service is unreachable, we return 401 — not 200.
//   It is better to temporarily reject valid requests than to accept
//   requests from unverified users. This is the correct security posture.

'use strict';

const { validateToken } = require('../clients/userClient');

/**
 * Middleware that validates the JWT by calling the User service.
 * On success: attaches { userId, email } to req.user and calls next().
 * On failure: returns 401 Unauthorized immediately.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check header exists and has the correct Bearer format
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authorization header missing or malformed. Expected: Bearer <token>',
    });
  }

  // Extract the raw token from "Bearer <token>"
  const token = authHeader.split(' ')[1];

  try {
    // Delegate validation to the User service — do NOT verify locally
    const result = await validateToken(token);

    if (!result.valid) {
      // Map user service error codes to meaningful messages
      const messages = {
        token_expired: 'Your session has expired. Please log in again.',
        invalid_token: 'Invalid authentication token.',
        user_service_unavailable: 'Authentication service unavailable. Please try again.',
      };

      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: messages[result.error] || 'Authentication failed.',
      });
    }

    // Attach verified identity to the request for downstream handlers
    req.user = {
      userId: result.userId,
      email: result.email,
    };

    return next();
  } catch (error) {
    // Unexpected error calling user service — fail closed
    console.error('[AuthMiddleware] Unexpected error during token validation:', error.message);
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication failed. Please try again.',
    });
  }
};

module.exports = { authenticate };
