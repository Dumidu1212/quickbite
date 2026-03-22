// src/routes/authRoutes.js
//
// Connects HTTP methods + paths to controller functions.
// Routes are intentionally thin — no logic here.
// Validation middleware runs before the controller.

'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validators');

const router = express.Router();

// Rate limiter for login — prevents brute-force attacks.
// Max 5 login attempts per IP per 15 minutes.
// After the 6th attempt the client receives 429 Too Many Requests.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 5,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,    // adds RateLimit-* headers to response
  legacyHeaders: false,
});

// POST /auth/register — validate input then register
router.post('/register', validateRegister, authController.register);

// POST /auth/login — rate limit then validate then login
router.post('/login', loginRateLimiter, validateLogin, authController.login);

// GET /auth/validate — called by other services to verify JWTs
// No authentication middleware here — the endpoint validates the token itself
router.get('/validate', authController.validateToken);

// POST /auth/logout
router.post('/logout', authController.logout);

module.exports = router;
