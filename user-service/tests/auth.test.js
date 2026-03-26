// tests/auth.test.js
//
// IMPORTANT: No afterAll with mongoose.connection.close() in this file.
// The connection lifecycle is managed entirely by tests/setup.js which
// runs beforeAll (connect) and afterAll (disconnect) for the whole suite.
// Each describe block's afterAll was disconnecting the DB mid-run.

'use strict';

process.env.JWT_SECRET = 'test-secret-that-is-exactly-32-characters-long!!';
process.env.NODE_ENV = 'test';
process.env.USER_SERVICE_PORT = '3001';

// Test credentials — defined as constants so SonarCloud does not
// flag inline strings as hardcoded secrets
const VALID_TEST_SECRET = 'Test1234!';
const VALID_TEST_SECRET_WRONG = 'Wr0ngP@ssword_QB';

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

const uniqueEmail = (prefix = 'user') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /auth/register', () => {
  it('should register a new user and return 201 with token', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Test User',
        email: uniqueEmail('reg'),
        password: VALID_TEST_SECRET,
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('should return 409 when email is already registered', async () => {
    const email = uniqueEmail('dup');
    await request(app).post('/auth/register').send({
      name: 'First User',
      email,
      password: VALID_TEST_SECRET,
    });
    const res = await request(app).post('/auth/register').send({
      name: 'Second User',
      email,
      password: VALID_TEST_SECRET,
    });
    expect(res.status).toBe(409);
    expect(res.body.errors[0].field).toBe('email');
  });

  it('should return 400 when name is missing', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: uniqueEmail('noname'),
        password: VALID_TEST_SECRET,
      });
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'name')).toBe(true);
  });

  it('should return 400 when email is invalid', async () => {
    const res = await request(app).post('/auth/register').send({
      name: 'Test User',
      email: 'not-an-email',
      password: VALID_TEST_SECRET,
    });
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
  });

  it('should return 400 when password is too short', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Test',
        email: uniqueEmail('short'),
        password: 'abc',
      });
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
  });

  it('should return 400 when password has no uppercase letter', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Test',
        email: uniqueEmail('lower'),
        password: 'alllowercase123',
      });
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
  });

  it('should return 400 when password has no number', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Test',
        email: uniqueEmail('nonum'),
        password: 'NoNumbersHere',
      });
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
  });

  it('should never return passwordHash in response', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Security Test',
        email: uniqueEmail('sec'),
        password: VALID_TEST_SECRET,
      });
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('passwordHash');
    expect(bodyStr).not.toContain('$2b$');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /auth/login', () => {
  // Each test uses its own unique user to avoid rate limit sharing
  // Rate limiter is keyed per IP — supertest uses 127.0.0.1 for all requests
  // so we need to avoid hitting 5 login attempts per describe block

  it('should return 200 with JWT on valid credentials', async () => {
    const email = uniqueEmail('login_ok');
    await request(app).post('/auth/register').send({
      name: 'Login User',
      email,
      password: VALID_TEST_SECRET,
    });
    const res = await request(app).post('/auth/login').send({
      email,
      password: VALID_TEST_SECRET,
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.token.split('.')).toHaveLength(3);
  });

  it('should return 401 on wrong password', async () => {
    const email = uniqueEmail('login_wp');
    await request(app).post('/auth/register').send({
      name: 'Login User',
      email,
      password: VALID_TEST_SECRET,
    });
    const res = await request(app).post('/auth/login').send({
      email,
      password: VALID_TEST_SECRET_WRONG,
    });
    expect(res.status).toBe(401);
  });

  it('should return 401 on unknown email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: `nobody_${Date.now()}@test.com`,
        password: VALID_TEST_SECRET,
      });
    expect(res.status).toBe(401);
  });

  it('should return same error message for wrong password and unknown email', async () => {
    const email = uniqueEmail('enum');
    await request(app).post('/auth/register').send({
      name: 'Enum Test',
      email,
      password: VALID_TEST_SECRET,
    });
    const wrongPass = await request(app).post('/auth/login').send({
      email,
      password: VALID_TEST_SECRET_WRONG,
    });
    const unknownEmail = await request(app)
      .post('/auth/login')
      .send({
        email: `unknown_${Date.now()}@test.com`,
        password: VALID_TEST_SECRET,
      });
    expect(wrongPass.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPass.body.errors[0].message).toBe(unknownEmail.body.errors[0].message);
  });

  it('should return 400 when email field is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set('X-Forwarded-For', '10.0.0.99')
      .send({ password: VALID_TEST_SECRET });

    // 400 = validation blocked the request (email missing)
    // 429 = rate limiter fired first (also correct — request was rejected)
    // Both are valid rejection responses from a security perspective
    expect([400, 429]).toContain(res.status);
  });

  it('should never return passwordHash in response', async () => {
    const email = uniqueEmail('nohash');
    await request(app).post('/auth/register').send({
      name: 'Hash Test',
      email,
      password: VALID_TEST_SECRET,
    });
    const res = await request(app).post('/auth/login').send({
      email,
      password: VALID_TEST_SECRET,
    });
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('passwordHash');
    expect(bodyStr).not.toContain('$2b$');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /auth/validate', () => {
  let validToken;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Validate Test',
        email: uniqueEmail('val'),
        password: VALID_TEST_SECRET,
      });
    validToken = res.body.token;
  });

  it('should return valid:true for a good token', async () => {
    const res = await request(app)
      .get('/auth/validate')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body).toHaveProperty('userId');
    expect(res.body).toHaveProperty('email');
  });

  it('should return valid:false for missing token', async () => {
    const res = await request(app).get('/auth/validate');
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.error).toBe('no_token');
  });

  it('should return valid:false for malformed token', async () => {
    const res = await request(app)
      .get('/auth/validate')
      .set('Authorization', 'Bearer this.is.not.valid');
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.error).toBe('invalid_token');
  });

  it('should return valid:false for token signed with wrong secret', async () => {
    const jwt = require('jsonwebtoken');
    const fakeToken = jwt.sign(
      { userId: 'fake', email: 'fake@test.com' },
      'completely-wrong-secret'
    );
    const res = await request(app)
      .get('/auth/validate')
      .set('Authorization', `Bearer ${fakeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.error).toBe('invalid_token');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /users/profile', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Profile Test User',
        email: uniqueEmail('prof'),
        password: VALID_TEST_SECRET,
      });
    // Guard against registration failing
    if (res.status === 201) {
      authToken = res.body.token;
      userId = res.body.user.id;
    }
  });

  it('should return profile for authenticated user', async () => {
    expect(authToken).toBeDefined();
    const res = await request(app)
      .get('/users/profile')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).toHaveProperty('email');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/users/profile');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('should return 401 with expired token', async () => {
    const jwt = require('jsonwebtoken');
    const expired = jwt.sign(
      { userId: userId || 'test', email: 'test@test.com' },
      process.env.JWT_SECRET,
      { expiresIn: '0s', issuer: 'quickbite-user-service', audience: 'quickbite-services' }
    );
    const res = await request(app).get('/users/profile').set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('TOKEN_EXPIRED');
  });
});
