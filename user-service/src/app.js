// src/app.js
//
// APPLICATION ENTRY POINT
//
// This file has two responsibilities:
//   1. Create and configure the Express application (exported for testing)
//   2. Start the HTTP server when run directly
//
// WHY SEPARATE app FROM server.listen?
//   Jest/Supertest needs to import the app WITHOUT starting the server.
//   If we called server.listen() at the module level, every test file
//   would try to bind to port 3001 and fail.
//   By exporting `app` and calling listen() only when this file is
//   the entry point (require.main === module), tests work cleanly.

'use strict';

// Load environment variables FIRST — before any other imports
// that might read from process.env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config/env');         // validates env vars, crashes if missing
const { connectDB } = require('./config/database');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

// ── Create Express application ────────────────────────────────────────────────
const app = express();

// ── Security middleware (applied before any routes) ───────────────────────────

// helmet sets 11 security-related HTTP headers automatically:
//   - X-Content-Type-Options: nosniff (prevents MIME sniffing)
//   - X-Frame-Options: SAMEORIGIN (prevents clickjacking)
//   - Strict-Transport-Security (forces HTTPS)
//   - and more...
app.use(helmet());

// CORS — specifies which origins can call this API.
// In development we allow all origins. In production, this will be
// restricted to the Azure API Management URL only.
app.use(cors({
  origin: config.isProduction ? process.env.ALLOWED_ORIGIN : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Request parsing middleware ─────────────────────────────────────────────────

// Parse JSON request bodies (e.g. POST /auth/register body)
// limit: '10kb' prevents large payload attacks
app.use(express.json({ limit: '10kb' }));

// ── Logging middleware ─────────────────────────────────────────────────────────

// morgan logs every HTTP request: method, path, status, response time
// 'combined' format in production (Apache-style), 'dev' format locally
if (config.isProduction) {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// Health check — must be accessible without authentication
app.use('/health', healthRoutes);

// Auth routes — /auth/register, /auth/login, /auth/validate, /auth/logout
app.use('/auth', authRoutes);

// User routes — /users/profile
app.use('/users', userRoutes);

// ── 404 handler ────────────────────────────────────────────────────────────────

// Any request that doesn't match a route falls through to here.
// We return a consistent JSON error — never an HTML error page.
app.use((_req, res) => {
  return res.status(404).json({
    error: 'NOT_FOUND',
    message: 'The requested endpoint does not exist',
  });
});

// ── Global error handler ───────────────────────────────────────────────────────

// Express calls this when any route handler calls next(error)
// or throws an error.
// IMPORTANT: Must have exactly 4 parameters (err, req, res, next)
// for Express to recognise it as an error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Log the full error server-side for debugging
  console.error(`[Error] ${err.message}`, err.stack);

  // Never expose stack traces to clients in production
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    error: err.code || 'INTERNAL_ERROR',
    message: config.isProduction
      ? 'An unexpected error occurred'
      : err.message,
  });
});

// ── Start server ───────────────────────────────────────────────────────────────

// require.main === module is true when this file is run directly:
//   node src/app.js        → starts server
//   require('./app')       → does NOT start server (used by tests)
if (require.main === module) {
  (async () => {
    await connectDB();
    app.listen(config.port, () => {
      console.info(`[Server] User service running on port ${config.port}`);
      console.info(`[Server] Environment: ${config.nodeEnv}`);
      console.info(`[Server] Health check: http://localhost:${config.port}/health`);
    });
  })();
}

module.exports = app; // exported for Jest/Supertest tests
