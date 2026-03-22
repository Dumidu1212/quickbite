// src/config/database.js
//
// MongoDB connection for the order service.
// Identical pattern to user-service — each service manages
// its own database connection independently.

'use strict';

const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.info(`[Database] Order service connected: ${connection.connection.host}`);
  } catch (error) {
    console.error(`[Database] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] Order service disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
  console.info('[Database] Order service reconnected to MongoDB');
});

module.exports = { connectDB };
