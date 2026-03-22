// tests/setup.js
//
// Global test database setup.
// MongoDB Memory Server creates a real in-memory MongoDB instance.
// This file runs once for the ENTIRE test suite (all test files).
// Individual test files must NOT call mongoose.connection.close().

'use strict';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

// Runs ONCE before all test files
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI_USERS = uri;
  await mongoose.connect(uri);
}, 30000);

// Runs ONCE after all test files finish
afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
}, 30000);

// Runs after EACH test — clears all collections for test isolation
afterEach(async () => {
  // Guard: only clear if still connected
  if (mongoose.connection.readyState !== 1) {
    return;
  }
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
