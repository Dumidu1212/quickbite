// src/controllers/authController.js
//
// Authentication business logic.
//
// CLEAN CODE PRINCIPLE — controllers are thin:
// Controllers only do three things:
//   1. Extract data from the request
//   2. Call a service/model function
//   3. Send the response
//
// Complex logic (hashing, token generation) lives in helper functions
// at the bottom of this file, not inline in the handlers.
// This makes each handler easy to read and each helper easy to test.

'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const config = require('../config/env');

// ── Helper functions ──────────────────────────────────────────────────────────

/**
 * Hashes a plain-text password using bcrypt.
 * bcrypt is intentionally slow — the 12 rounds means each hash
 * takes ~300ms, making brute-force attacks impractical.
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, config.bcryptRounds);
};

/**
 * Compares a plain-text password against a stored hash.
 * Returns true if they match, false otherwise.
 * Uses bcrypt.compare which is safe against timing attacks.
 */
const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Signs a JWT containing the user's ID and email.
 * The token expires in 24 hours.
 * The secret is from config — never hardcoded.
 */
const signToken = (user) => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
      issuer: 'quickbite-user-service',   // identifies who issued the token
      audience: 'quickbite-services',     // identifies who can use it
    }
  );
};

/**
 * Formats express-validator errors into a consistent structure.
 * Every validation error in this service uses this format:
 *   { errors: [{ field: "email", message: "Email is required" }] }
 */
const formatValidationErrors = (errors) => {
  return errors.array().map((err) => ({
    field: err.path,
    message: err.msg,
  }));
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /auth/register
 *
 * Creates a new user account.
 * 1. Validate input fields
 * 2. Check email is not already taken
 * 3. Hash the password
 * 4. Save the user
 * 5. Return 201 with user object (no passwordHash)
 */
const register = async (req, res, next) => {
  try {
    // Step 1: Check express-validator results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: formatValidationErrors(errors) });
    }

    const { name, email, password } = req.body;

    // Step 2: Check for duplicate email
    // We check manually rather than relying on the MongoDB unique index error
    // because the index error message is not user-friendly
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        errors: [{ field: 'email', message: 'An account with this email already exists' }],
      });
    }

    // Step 3: Hash the password
    const passwordHash = await hashPassword(password);

    // Step 4: Create and save the user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash,
    });

    // Step 5: Sign token and return response
    const token = signToken(user);

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: user.toJSON(),   // toJSON removes passwordHash automatically
    });
  } catch (error) {
    // Pass unexpected errors to the global error handler in app.js
    return next(error);
  }
};

/**
 * POST /auth/login
 *
 * Authenticates a user and returns a JWT.
 * 1. Validate input
 * 2. Find user by email
 * 3. Compare password with hash
 * 4. Return JWT
 *
 * SECURITY: We return the same error message whether the email
 * doesn't exist OR the password is wrong. This prevents user
 * enumeration — an attacker cannot tell if an email is registered.
 */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: formatValidationErrors(errors) });
    }

    const { email, password } = req.body;

    // Find user — explicitly select passwordHash (excluded by default via select:false)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

    // SECURITY: Generic error — don't reveal whether email exists
    const invalidCredentialsError = {
      errors: [{ field: 'email', message: 'Invalid email or password' }],
    };

    if (!user) {
      return res.status(401).json(invalidCredentialsError);
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json(invalidCredentialsError);
    }

    // Compare passwords
    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json(invalidCredentialsError);
    }

    // Sign and return token
    const token = signToken(user);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /auth/validate
 *
 * Validates a JWT token. Called by other microservices (order-service)
 * to verify a user's identity without sharing the JWT secret.
 *
 * This endpoint NEVER returns 401 — it always returns 200 with
 * { valid: true/false } so the calling service can handle the result.
 * Throwing 401 here would confuse the calling service.
 */
const validateToken = (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(200).json({
      valid: false,
      error: 'no_token',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: 'quickbite-user-service',
      audience: 'quickbite-services',
    });

    return res.status(200).json({
      valid: true,
      userId: decoded.userId,
      email: decoded.email,
    });
  } catch (error) {
    // jwt.verify throws specific error types we can use for better messages
    const errorCode = error.name === 'TokenExpiredError'
      ? 'token_expired'
      : 'invalid_token';

    return res.status(200).json({
      valid: false,
      error: errorCode,
    });
  }
};

/**
 * POST /auth/logout
 *
 * For now returns 200. Full implementation in Sprint 7
 * will add token blacklisting using a jti claim.
 */
const logout = (_req, res) => {
  return res.status(200).json({ message: 'Logged out successfully' });
};

module.exports = { register, login, validateToken, logout };
