// src/config/env.js
//
// CLEAN CODE PRINCIPLE: Fail fast.
// If a required environment variable is missing, we crash on startup
// with a descriptive error message. This is much better than failing
// silently or with a confusing error deep in the application.
//
// This module is the single source of truth for all config values.
// No other file should read from process.env directly.

'use strict';

require('dotenv').config();

const requiredVars = [
  'MONGODB_URI_USERS',
  'JWT_SECRET',
];

// Check all required variables exist before the app starts
const missing = requiredVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[Config] FATAL: Missing required environment variables:\n  ${missing.join('\n  ')}`);
  console.error('[Config] Check your .env file against .env.example');
  process.exit(1); // Exit with error code — Docker will restart the container
}

// Validate JWT_SECRET length — short secrets are a security vulnerability
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('[Config] FATAL: JWT_SECRET must be at least 32 characters long');
  process.exit(1);
}

const config = {
  // Server
  port: Number.parseInt(process.env.USER_SERVICE_PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Database
  mongoUri: process.env.MONGODB_URI_USERS,

  // JWT — used for signing and verifying tokens
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // Bcrypt — number of hashing rounds (higher = more secure but slower)
  // 12 rounds is the recommended balance for production
  bcryptRounds: Number.parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
};

module.exports = config;
