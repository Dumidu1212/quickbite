// src/config/env.js
//
// Order service configuration — same fail-fast pattern as user-service.
//
// IMPORTANT: The order service depends on TWO other services.
// If USER_SERVICE_URL or MENU_SERVICE_URL are missing, this service
// cannot function — it cannot validate tokens or menu items.
// We crash immediately rather than failing mysteriously at runtime.

'use strict';

require('dotenv').config();

const requiredVars = [
  'MONGODB_URI_ORDERS',
  'USER_SERVICE_URL',
  'MENU_SERVICE_URL',
];

const missing = requiredVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`[Config] FATAL: Missing required environment variables:\n  ${missing.join('\n  ')}`);
  console.error('[Config] Check your .env file against .env.example');
  process.exit(1);
}

const config = {
  // Server
  port: parseInt(process.env.ORDER_SERVICE_PORT, 10) || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Database
  mongoUri: process.env.MONGODB_URI_ORDERS,

  // Inter-service URLs
  // These resolve to container names in docker-compose,
  // and to Azure Container App internal URLs in production
  userServiceUrl: process.env.USER_SERVICE_URL,
  menuServiceUrl: process.env.MENU_SERVICE_URL,

  // Azure Service Bus — used in Sprint 3 when we implement order creation
  // Marked optional here so the scaffold starts without Azure credentials
  serviceBusConn: process.env.SERVICEBUS_CONN || null,
  serviceBusQueue: process.env.SERVICEBUS_QUEUE_NAME || 'order-events',
};

module.exports = config;
