// tests/health.test.js
//
// Env vars set FIRST — same critical pattern as user-service tests.
// The config module runs the moment we require('../src/app'),
// so environment variables must already be in process.env by then.

'use strict';

// ── Set all required env vars before any require() ───────────────────────────
process.env.MONGODB_URI_ORDERS = 'mongodb://localhost:27017/quickbite-orders-test';
process.env.USER_SERVICE_URL = 'http://localhost:3001';
process.env.MENU_SERVICE_URL = 'http://localhost:8001';
process.env.NODE_ENV = 'test';
process.env.ORDER_SERVICE_PORT = '3002';
process.env.SERVICEBUS_CONN = 'placeholder';
process.env.SERVICEBUS_QUEUE_NAME = 'order-events';

// ── Import app AFTER env vars are set ────────────────────────────────────────
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

describe('GET /health — order-service', () => {

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should return response with correct service name', async () => {
    const response = await request(app).get('/health');

    expect([200, 503]).toContain(response.status);
    expect(response.headers['content-type']).toMatch(/json/);
    expect(response.body.service).toBe('order-service');
  });

  it('should include all required health fields', async () => {
    const response = await request(app).get('/health');
    const body = response.body;

    const requiredFields = ['status', 'service', 'version', 'uptime', 'database', 'timestamp'];
    requiredFields.forEach((field) => {
      expect(body).toHaveProperty(field);
    });
  });

  it('should return a valid ISO 8601 timestamp', async () => {
    const response = await request(app).get('/health');
    const timestamp = new Date(response.body.timestamp);

    expect(Number.isNaN(timestamp.getTime())).toBe(false);
  });

  it('should return uptime as a non-negative number', async () => {
    const response = await request(app).get('/health');

    expect(typeof response.body.uptime).toBe('number');
    expect(response.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown-endpoint');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('NOT_FOUND');
  });

  it('should return 501 for unimplemented POST /orders', async () => {
    const response = await request(app).post('/orders');

    expect(response.status).toBe(501);
  });

  it('should return 501 for unimplemented GET /orders/:id', async () => {
    const response = await request(app).get('/orders/some-order-id');

    expect(response.status).toBe(501);
  });
});
