// src/routes/healthRoutes.js — identical pattern to user-service

'use strict';

const express = require('express');
const mongoose = require('mongoose');
const { version } = require('../../package.json');

const router = express.Router();

router.get('/', (_req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  return res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    service: 'order-service',
    version,
    uptime: Math.floor(process.uptime()),
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
