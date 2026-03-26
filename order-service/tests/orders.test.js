// tests/orders.test.js
//
// Integration tests for Order service endpoints.
//
// TESTING STRATEGY:
//   We mock authMiddleware directly instead of mocking userClient.
//   This is cleaner because:
//   1. It avoids Jest module-caching issues with destructured imports
//   2. It tests the controller in isolation from auth concerns
//   3. We can precisely control req.user per test
//
//   The authenticate middleware is responsible for JWT validation —
//   that logic is tested by its own unit test. Here we just
//   simulate its output (req.user) to test controller behaviour.
//
// MOCK STRATEGY:
//   authMiddleware  → mocked to set req.user directly
//   menuClient      → mocked to return configurable menu items
//   serviceBusPublisher → mocked to skip Azure Service Bus

'use strict';

// ── Required env vars BEFORE any require() ───────────────────────────────────
process.env.MONGODB_URI_ORDERS    = 'mongodb://localhost:27017/quickbite-orders-test';
process.env.USER_SERVICE_URL      = 'http://localhost:3001';
process.env.MENU_SERVICE_URL      = 'http://localhost:8001';
process.env.NODE_ENV              = 'test';
process.env.ORDER_SERVICE_PORT    = '3002';
process.env.SERVICEBUS_CONN       = '';
process.env.SERVICEBUS_QUEUE_NAME = 'order-events';
process.env.ADMIN_KEY             = 'test-admin-key';

// ── Mock external dependencies ────────────────────────────────────────────────

// Mock authMiddleware so tests control req.user directly.
// This avoids Jest destructuring/caching issues with userClient mocks
// and cleanly separates controller tests from auth middleware tests.
jest.mock('../src/middleware/authMiddleware');
jest.mock('../src/clients/menuClient');
jest.mock('../src/messaging/serviceBusPublisher');

const request                = require('supertest');
const mongoose               = require('mongoose');
const { MongoMemoryServer }  = require('mongodb-memory-server');
const app                    = require('../src/app');
const { authenticate }       = require('../src/middleware/authMiddleware');
const { getMenuItem }        = require('../src/clients/menuClient');
const { publishOrderCreated} = require('../src/messaging/serviceBusPublisher');

// ── Test fixtures ─────────────────────────────────────────────────────────────

const VALID_USER    = { userId: 'user-abc-123', email: 'dumidu@test.com' };
const VALID_ITEM_ID = 'item-abc-123';

const validMenuItem = {
  id:           VALID_ITEM_ID,
  restaurantId: 'rest-abc-123',
  name:         'Margherita Pizza',
  price:        14,
  isAvailable:  true,
};

const validOrderBody = {
  restaurantId:   'rest-abc-123',
  restaurantName: "Mario's Pizzeria",
  items: [
    { itemId: VALID_ITEM_ID, quantity: 2 },
  ],
  deliveryAddress: {
    street: '42 Kandy Road',
    city:   'Colombo',
    phone:  '+94771234567',
  },
};

// ── Test setup ────────────────────────────────────────────────────────────────

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(() => {
  // Default: authenticate passes through with valid user
  // Individual tests can override this to simulate auth failures
  authenticate.mockImplementation((req, _res, next) => {
    req.user = { ...VALID_USER };
    return next();
  });

  // Default: menu item exists and is available
  getMenuItem.mockResolvedValue(validMenuItem);

  // Default: Service Bus publish succeeds silently
  publishOrderCreated.mockResolvedValue();
});

afterEach(async () => {
  // Clear all orders between tests to prevent state leakage
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  jest.clearAllMocks();
});

// ── Helper — creates an order and returns its ID ──────────────────────────────

const createTestOrder = async () => {
  authenticate.mockImplementation((req, _res, next) => {
    req.user = { ...VALID_USER };
    return next();
  });
  getMenuItem.mockResolvedValue(validMenuItem);
  publishOrderCreated.mockResolvedValue();

  const res = await request(app)
    .post('/orders')
    .set('Authorization', 'Bearer valid-token')
    .send(validOrderBody);

  return res.body.order.id;
};

// ── POST /orders ──────────────────────────────────────────────────────────────

describe('POST /orders', () => {

  it('should create an order and return 201 with the saved order', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', 'Bearer valid-token')
      .send(validOrderBody);

    expect(res.status).toBe(201);
    expect(res.body.order).toHaveProperty('id');
    expect(res.body.order.status).toBe('placed');
    expect(res.body.order.userId).toBe(VALID_USER.userId);
  });

  it('should calculate total server-side ignoring client-sent price', async () => {
    // Client tries to send a manipulated low price — should be ignored
    const manipulatedBody = {
      ...validOrderBody,
      items: [{ itemId: VALID_ITEM_ID, quantity: 1, price: 0.01 }],
    };

    const res = await request(app)
      .post('/orders')
      .set('Authorization', 'Bearer valid-token')
      .send(manipulatedBody);

    expect(res.status).toBe(201);
    // Must use menu-service price (14.00 × 1 = 14.00), not client price (0.01)
    expect(res.body.order.totalPrice).toBe(14);
  });

  it('should return 401 when authenticate middleware rejects the request', async () => {
    // Simulate what authMiddleware does when JWT is missing or invalid
    authenticate.mockImplementation((_req, res) => {
      return res.status(401).json({
        error:   'UNAUTHORIZED',
        message: 'Authorization header missing or malformed',
      });
    });

    const res = await request(app).post('/orders').send(validOrderBody);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHORIZED');
  });

  it('should return 400 when an item does not exist in the menu', async () => {
    getMenuItem.mockResolvedValue(null); // item not found

    const res = await request(app)
      .post('/orders')
      .set('Authorization', 'Bearer valid-token')
      .send(validOrderBody);

    expect(res.status).toBe(400);
    expect(res.body.errors[0].message).toContain('not found');
  });

  it('should return 400 when an item is unavailable', async () => {
    getMenuItem.mockResolvedValue({ ...validMenuItem, isAvailable: false });

    const res = await request(app)
      .post('/orders')
      .set('Authorization', 'Bearer valid-token')
      .send(validOrderBody);

    expect(res.status).toBe(400);
    expect(res.body.errors[0].message).toContain('unavailable');
  });

  it('should return 400 when items array is empty', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', 'Bearer valid-token')
      .send({ ...validOrderBody, items: [] });

    expect(res.status).toBe(400);
    expect(res.body.errors.some((e) => e.field === 'items')).toBe(true);
  });

  it('should return 400 when delivery address is missing', async () => {
    const bodyWithoutAddress = { ...validOrderBody };
    delete bodyWithoutAddress.deliveryAddress;

    const res = await request(app)
      .post('/orders')
      .set('Authorization', 'Bearer valid-token')
      .send(bodyWithoutAddress);

    expect(res.status).toBe(400);
  });

  it('should still return 201 if Service Bus publish fails', async () => {
    // Service Bus unavailable — order must still be saved and 201 returned
    publishOrderCreated.mockRejectedValue(new Error('Service Bus unavailable'));

    const res = await request(app)
      .post('/orders')
      .set('Authorization', 'Bearer valid-token')
      .send(validOrderBody);

    expect(res.status).toBe(201);
    expect(res.body.order).toHaveProperty('id');
  });
});

// ── GET /orders/:id ───────────────────────────────────────────────────────────

describe('GET /orders/:id', () => {

  it('should return the order for the authenticated owner', async () => {
    const orderId = await createTestOrder();

    const res = await request(app)
      .get(`/orders/${orderId}`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.order.id).toBe(orderId);
  });

  it('should return 404 for a different user trying to access the order', async () => {
    const orderId = await createTestOrder();

    // Switch to a different user — should NOT be able to see this order
    authenticate.mockImplementation((req, _res, next) => {
      req.user = { userId: 'different-user', email: 'other@test.com' };
      return next();
    });

    const res = await request(app)
      .get(`/orders/${orderId}`)
      .set('Authorization', 'Bearer valid-token');

    // 404 not 403 — prevents revealing the order exists to other users
    expect(res.status).toBe(404);
  });

  it('should return 404 for a non-existent order ID', async () => {
    const res = await request(app)
      .get('/orders/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });
});

// ── GET /orders/user/:userId ──────────────────────────────────────────────────

describe('GET /orders/user/:userId', () => {

  it('should return order history for the authenticated user', async () => {
    // Create two orders
    await createTestOrder();
    await createTestOrder();

    const res = await request(app)
      .get(`/orders/user/${VALID_USER.userId}`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(2);
    expect(res.body.pagination).toHaveProperty('total', 2);
  });

  it('should return 403 when accessing another user\'s history', async () => {
    // Attacker is logged in as a different user
    authenticate.mockImplementation((req, _res, next) => {
      req.user = { userId: 'attacker-id', email: 'attacker@test.com' };
      return next();
    });

    const res = await request(app)
      .get(`/orders/user/${VALID_USER.userId}`)
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
  });
});

// ── PUT /orders/:id/status ────────────────────────────────────────────────────

describe('PUT /orders/:id/status', () => {

  it('should update status with valid admin key', async () => {
    const orderId = await createTestOrder();

    const res = await request(app)
      .put(`/orders/${orderId}/status`)
      .set('x-admin-key', 'test-admin-key')
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('confirmed');
  });

  it('should return 403 without admin key', async () => {
    const orderId = await createTestOrder();

    const res = await request(app)
      .put(`/orders/${orderId}/status`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(403);
  });

  it('should return 403 with wrong admin key', async () => {
    const orderId = await createTestOrder();

    const res = await request(app)
      .put(`/orders/${orderId}/status`)
      .set('x-admin-key', 'wrong-key')
      .send({ status: 'confirmed' });

    expect(res.status).toBe(403);
  });

  it('should return 400 with invalid status value', async () => {
    const orderId = await createTestOrder();

    const res = await request(app)
      .put(`/orders/${orderId}/status`)
      .set('x-admin-key', 'test-admin-key')
      .send({ status: 'invalid-status' });

    expect(res.status).toBe(400);
  });
});
