// src/middleware/adminMiddleware.js
//
// Admin authentication middleware for protected admin operations.
//
// WHY X-ADMIN-KEY INSTEAD OF A SEPARATE ADMIN JWT?
//   For this prototype, a shared secret key is sufficient for admin operations
//   like updating order status. In a production system, admin actions would
//   require a role-based access control system with admin JWT claims.
//   The key is stored in Azure Key Vault and injected via environment variables —
//   it is never hardcoded in source code.

'use strict';

const config = require('../config/env');

/**
 * Middleware that validates the X-Admin-Key header.
 * Rejects requests that do not carry the correct admin key.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const requireAdminKey = (req, res, next) => {
  const adminKey = req.headers['x-admin-key'];

  if (!adminKey || adminKey !== config.adminKey) {
    return res.status(403).json({
      error:   'FORBIDDEN',
      message: 'Valid X-Admin-Key header is required for this operation',
    });
  }

  return next();
};

module.exports = { requireAdminKey };
