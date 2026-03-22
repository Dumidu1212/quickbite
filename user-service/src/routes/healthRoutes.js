// src/routes/healthRoutes.js
//
// The /health endpoint has one job: tell the infrastructure whether
// this service is ready to handle traffic.
//
// WHY THIS MATTERS:
//   - Docker healthcheck calls this to decide if the container is healthy
//   - Azure Container Apps uses this before routing traffic to a new revision
//   - The order-service checks this before considering us a valid upstream
//   - CI/CD integration tests call this to confirm deployment succeeded
//
// A good health response includes:
//   - status: "ok" or "error"
//   - service name (so you know which service you're looking at)
//   - version (from package.json)
//   - uptime (how long the process has been running)
//   - database connection status
//   - timestamp

'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { version } = require('../../package.json');

const router = express.Router();

/**
 * GET /health
 * Returns service health status.
 * Returns 200 if healthy, 503 if unhealthy.
 */
router.get('/', (_req, res) => {
  // mongoose.connection.readyState:
  //   0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbState = mongoose.connection.readyState;
  const dbConnected = dbState === 1;

  const health = {
    status: dbConnected ? 'ok' : 'degraded',
    service: 'user-service',
    version,
    uptime: Math.floor(process.uptime()),        // seconds since process started
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  };

  // Return 503 Service Unavailable if database is not connected.
  // This tells the load balancer to stop routing traffic to this instance.
  const statusCode = dbConnected ? 200 : 503;
  return res.status(statusCode).json(health);
});

module.exports = router;
