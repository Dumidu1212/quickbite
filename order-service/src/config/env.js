// src/config/env.js
//
// Order service configuration with fail-fast validation.
//
// REQUIRED VARIABLES:
//   The order service depends on two upstream services. If either URL is missing,
//   the service cannot function — we crash immediately with a clear message
//   rather than failing mysteriously at runtime when a request arrives.
//
// OPTIONAL VARIABLES:
//   SERVICEBUS_CONN is optional to support local development without Azure.
//   When absent, the publisher logs a warning and skips publishing silently.

'use strict';

require('dotenv').config();

const requiredVars = [
  'MONGODB_URI_ORDERS',
  'USER_SERVICE_URL',
  'MENU_SERVICE_URL',
];

const missing = requiredVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error('[Config] FATAL: Missing required environment variables:');
  missing.forEach((v) => console.error(`  - ${v}`));
  console.error('[Config] Check your .env file against .env.example');
  process.exit(1);
}

const config = {
  // Server
  port:         Number.parseInt(process.env.ORDER_SERVICE_PORT, 10) || 3002,
  nodeEnv:      process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Database
  mongoUri: process.env.MONGODB_URI_ORDERS,

  // Inter-service URLs
  // In docker-compose:  http://user-service:3001, http://menu-service:8001
  // In Azure Container Apps: the internal FQDN of each Container App
  // In local dev:        http://localhost:3001, http://localhost:8001
  userServiceUrl: process.env.USER_SERVICE_URL,
  menuServiceUrl: process.env.MENU_SERVICE_URL,

  // Azure Service Bus — optional for local dev without Azure
  serviceBusConn:  process.env.SERVICEBUS_CONN  || null,
  serviceBusQueue: process.env.SERVICEBUS_QUEUE_NAME || 'order-events',

  // Admin key for PUT /orders/:id/status
  // Stored in Azure Key Vault in production
  adminKey: process.env.ADMIN_KEY || 'local-admin-key-change-in-production',
};

module.exports = config;
