// tests/health.test.js

'use strict';

// env vars and DB connection handled by tests/setup.js
process.env.JWT_SECRET = 'test-secret-that-is-exactly-32-characters-long!!';
process.env.NODE_ENV = 'test';
process.env.USER_SERVICE_PORT = '3001';

const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  it('should return response with correct service name', async () => {
    const response = await request(app).get('/health');
    expect([200, 503]).toContain(response.status);
    expect(response.body.service).toBe('user-service');
  });

  it('should include all required fields', async () => {
    const response = await request(app).get('/health');
    ['status', 'service', 'version', 'uptime', 'database', 'timestamp'].forEach((f) => {
      expect(response.body).toHaveProperty(f);
    });
  });

  it('should return valid ISO timestamp', async () => {
    const response = await request(app).get('/health');
    expect(Number.isNaN(new Date(response.body.timestamp).getTime())).toBe(false);
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/unknown');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('NOT_FOUND');
  });

  it('should return 400 for unimplemented POST /auth/register with empty body', async () => {
    const response = await request(app).post('/auth/register').send({});
    expect(response.status).toBe(400);
  });
});
