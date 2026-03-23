// src/routes/userRoutes.js
//
// User profile endpoints — all protected by authenticate middleware.
// DELETE /users/profile performs a soft delete (sets isActive: false).

'use strict';

const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { validateProfileUpdate } = require('../middleware/validators');
const { getProfile, updateProfile, deleteAccount } = require('../controllers/userController');

const router = express.Router();

// GET /users/profile — returns the authenticated user's profile
router.get('/profile', authenticate, getProfile);

// PUT /users/profile — updates name and phone only
router.put('/profile', authenticate, validateProfileUpdate, updateProfile);

// DELETE /users/profile — soft-deletes the account (sets isActive: false)
// The user must re-authenticate to confirm this is an intentional action
router.delete('/profile', authenticate, deleteAccount);

module.exports = router;
