// src/config/database.js
//
// Handles the MongoDB connection lifecycle.
// We use Mongoose because it gives us:
//   - Schema validation before data hits the database
//   - Clean model-based querying
//   - Automatic connection pooling
//
// MICROSERVICE PRINCIPLE: Each service owns its own database connection.
// The user-service ONLY connects to the users database.
// It never queries the menu or orders databases.

'use strict';

const mongoose = require('mongoose');
const config = require('./env');

// Mongoose connection options
// These are production-safe defaults recommended by MongoDB
const MONGOOSE_OPTIONS = {
  // How long to wait for initial connection (ms)
  serverSelectionTimeoutMS: 5000,
  // How long a socket can be idle before closing (ms)
  socketTimeoutMS: 45000,
};

/**
 * Establishes the MongoDB connection.
 * Called once at application startup.
 * Exits the process if connection fails — we cannot run without a database.
 */
const connectDB = async () => {
  try {
    const connection = await mongoose.connect(config.mongoUri, MONGOOSE_OPTIONS);
    console.info(`[Database] Connected to MongoDB: ${connection.connection.host}`);
  } catch (error) {
    console.error(`[Database] Connection failed: ${error.message}`);
    // Exit so Docker/Azure can restart the container and retry
    process.exit(1);
  }
};

// Log when Mongoose disconnects (e.g. network interruption)
mongoose.connection.on('disconnected', () => {
  console.warn('[Database] Disconnected from MongoDB');
});

// Log when Mongoose reconnects automatically
mongoose.connection.on('reconnected', () => {
  console.info('[Database] Reconnected to MongoDB');
});

module.exports = { connectDB };
