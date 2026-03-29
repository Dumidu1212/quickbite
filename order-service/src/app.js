// src/app.js — Order Service entry point
//
// Same structure as user-service/src/app.js.
// The app is exported for testing — server.listen() only called
// when this file is run directly (require.main === module).

'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config/env');
const { connectDB } = require('./config/database');
const healthRoutes = require('./routes/healthRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.isProduction ? process.env.ALLOWED_ORIGIN : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
}));

// Request parsing
app.use(express.json({ limit: '10kb' }));

// HTTP request logging
if (!config.isProduction) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Routes
app.use('/health', healthRoutes);
app.use('/orders', orderRoutes);

// 404 handler — catches any request that didn't match a route above
app.use((_req, res) => {
  return res.status(404).json({
    error: 'NOT_FOUND',
    message: 'The requested endpoint does not exist',
  });
});

// Global error handler — called when any route calls next(error)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(`[Error] ${err.message}`, err.stack);
  return res.status(err.statusCode || 500).json({
    error: err.code || 'INTERNAL_ERROR',
    message: config.isProduction ? 'An unexpected error occurred' : err.message,
  });
});

// Only start the server when run directly — not when imported by tests
if (require.main === module) {
  (async () => {
    await connectDB();
    app.listen(config.port, () => {
      console.info(`[Server] Order service running on port ${config.port}`);
      console.info(`[Server] Health check: http://localhost:${config.port}/health`);
    });
  })();
}

module.exports = app;
