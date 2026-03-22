// tests/health.test.js
//
// IMPORTANT: environment variables MUST be set before importing the app.
// Node.js executes require() synchronously — config/env.js runs the moment
// app.js is imported. If env vars aren't set yet, it calls process.exit(1).
//
// We use a jest.setup file pattern: set env vars at the very top of the
// test file, before any require() calls.

'use strict';

// ── Set env vars FIRST — before any require() ────────────────────────────────
// These override whatever is (or isn't) in the .env file during tests.
// This makes tests self-contained and runnable in CI without a .env file.
process.env.MONGODB_URI_USERS = 'mongodb://localhost:27017/quickbite-test';
process.env.JWT_SECRET = 'test-secret-that-is-exactly-32-characters-long!!';
process.env.JWT_EXPIRES_IN = '24h';
process.env.BCRYPT_ROUNDS = '10'; // fewer rounds = faster tests
process.env.NODE_ENV = 'test';
process.env.USER_SERVICE_PORT = '3001';

// ── NOW import the app — env vars are already set ────────────────────────────
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /health', () => {

  // After ALL tests in this file finish, close the Mongoose connection.
  // Without this, Jest hangs waiting for the connection to close.
  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should return a response with correct service name', async () => {
    const response = await request(app).get('/health');

    // Health can be 200 (DB connected) or 503 (DB not reachable in test env)
    // Both are valid — we just care the endpoint responds
    expect([200, 503]).toContain(response.status);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body.service).toBe('user-service');
  });

  it('should include all required fields in the response', async () => {
    const response = await request(app).get('/health');
    const body = response.body;

    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('service');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('database');
    expect(body).toHaveProperty('timestamp');
  });

  it('should return a valid ISO 8601 timestamp', async () => {
    const response = await request(app).get('/health');
    const timestamp = new Date(response.body.timestamp);

    // new Date() on an invalid string produces an Invalid Date
    // whose getTime() returns NaN
    expect(Number.isNaN(timestamp.getTime())).toBe(false);
  });

  it('should return uptime as a non-negative number', async () => {
    const response = await request(app).get('/health');

    expect(typeof response.body.uptime).toBe('number');
    expect(response.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should return 404 with error code for unknown routes', async () => {
    const response = await request(app).get('/this-route-does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'NOT_FOUND');
    expect(response.body).toHaveProperty('message');
  });

  it('should return 404 for unknown auth routes', async () => {
    const response = await request(app).get('/auth/nonexistent');

    expect(response.status).toBe(404);
  });
});
