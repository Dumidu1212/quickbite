// src/controllers/userController.js
//
// Handles user profile read and update.
// These endpoints require authentication — they use req.user
// which is set by the authenticate middleware.

'use strict';

const { validationResult } = require('express-validator');
const User = require('../models/User');

/**
 * GET /users/profile
 * Returns the authenticated user's profile.
 * req.user is populated by authenticate middleware.
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return res.status(200).json({ user: user.toJSON() });
  } catch (error) {
    return next(error);
  }
};

/**
 * PUT /users/profile
 * Updates name and/or phone for the authenticated user.
 * Email and password changes are handled by separate endpoints.
 */
const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }

    // Only allow updating name and phone — not email or password
    const allowedUpdates = {};
    if (req.body.name !== undefined) { allowedUpdates.name = req.body.name.trim(); }
    if (req.body.phone !== undefined) { allowedUpdates.phone = req.body.phone.trim(); }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: allowedUpdates },
      {
        new: true,       // return updated document
        runValidators: true,   // run schema validators on update
      }
    );

    if (!user) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: user.toJSON(),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /users/profile
 *
 * Soft-deletes the authenticated user's account.
 *
 * SOFT DELETE vs HARD DELETE:
 *   We set isActive = false rather than removing the document from MongoDB.
 *   Hard deletion would leave orphaned order documents in orders-db that
 *   reference a userId with no corresponding user. Soft delete preserves
 *   referential integrity across services.
 *
 *   A soft-deleted user:
 *     - Cannot log in (login controller rejects isActive: false accounts)
 *     - Cannot call any protected endpoint (JWT still technically valid but
 *       the account is inactive — Sprint 7 will add a blacklist check)
 *     - Their order history remains intact for audit purposes
 *
 * After soft delete the client should call logout() to clear the token.
 */
const deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'User not found',
      });
    }

    return res.status(200).json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getProfile, updateProfile, deleteAccount };

