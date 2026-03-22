// src/routes/userRoutes.js
//
// Profile endpoints — all protected by authenticate middleware.

'use strict';

const express = require('express');
const { authenticate } = require('../middleware/authMiddleware');
const { validateProfileUpdate } = require('../middleware/validators');
const userController = require('../controllers/userController');

const router = express.Router();

// authenticate runs first — rejects requests without valid JWT
// validateProfileUpdate runs second — checks field formats
// userController.getProfile/updateProfile runs last

router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, validateProfileUpdate, userController.updateProfile);

module.exports = router;
