// src/api/client.js
//
// Axios client configuration for the QuickBite frontend.
//
// DEV vs PRODUCTION:
//   Development — Vite proxy routes all relative paths to the correct service.
//     /auth/* /users/*   → localhost:3001 (User service)
//     /restaurants/*     → localhost:8001 (Menu service)
//     /orders/*          → localhost:3002 (Order service)
//
//   Production — Each service has its own Azure Container Apps URL.
//     VITE_USER_SERVICE_URL, VITE_MENU_SERVICE_URL, VITE_ORDER_SERVICE_URL
//     must be set. Missing URLs throw at startup so misconfiguration is
//     caught immediately — not silently at runtime (CodeRabbit S1).
//
// TOKEN LIFECYCLE:
//   JWT stored in _token (module variable) — cleared on page refresh.
//   This is intentional for XSS protection. The user object is persisted
//   in sessionStorage via AuthContext so the UI stays logged in, but
//   authenticated API calls require a fresh login after hard refresh.
//
// 401 HANDLING (CodeRabbit S3):
//   On a 401, both the in-memory token AND the sessionStorage user are
//   cleared before redirecting to /login. This keeps the token module
//   variable and the AuthContext session store in sync.
//
// ADMIN vs CUSTOMER AUTH (CodeRabbit S2):
//   Admin API calls use a separate adminClient that does NOT inject the
//   customer JWT and does NOT redirect to /login on 401.
//   An admin key rejection (403) is handled by AdminAuthContext, not here.

import axios from 'axios';

const IS_PROD = import.meta.env.PROD;

// ── Fail-fast URL resolution ───────────────────────────────────────────────
//
// In production, throw immediately if a required service URL is missing.
// A missing URL would silently turn into a same-origin request that always
// fails — very hard to debug on Azure. Fail loudly instead.

const resolveServiceUrl = (envKey) => {
  const value = import.meta.env[envKey];
  if (IS_PROD && !value) {
    throw new Error(
      `[QuickBite] Missing required environment variable: ${envKey}. ` +
      `Set it in Azure Static Web Apps application settings.`
    );
  }
  // In dev, empty string — Vite proxy handles routing
  return value || '';
};

const USER_BASE  = resolveServiceUrl('VITE_USER_SERVICE_URL');
const MENU_BASE  = resolveServiceUrl('VITE_MENU_SERVICE_URL');
const ORDER_BASE = resolveServiceUrl('VITE_ORDER_SERVICE_URL');

// ── In-memory token ────────────────────────────────────────────────────────

let _token = null;

export const setToken   = (token) => { _token = token; };
export const getToken   = ()      => _token;
export const clearToken = ()      => { _token = null; };
export const hasToken   = ()      => Boolean(_token);

// ── Session clear helper ───────────────────────────────────────────────────
//
// Called on forced 401 logout. Clears both the in-memory token AND the
// sessionStorage user entry so AuthContext and client.js stay in sync.

const clearSession = () => {
  clearToken();
  try {
    sessionStorage.removeItem('quickbite_user');
  } catch {
    // sessionStorage unavailable — no-op
  }
};

// ── Customer client factory ────────────────────────────────────────────────
//
// Injects the customer JWT and redirects to /login on 401.
// Used by auth.api.js, menu.api.js, orders.api.js.

const createCustomerClient = (baseURL) => {
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  });

  // Attach JWT to every outgoing request
  client.interceptors.request.use(
    (config) => {
      if (_token) config.headers.Authorization = `Bearer ${_token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Handle 401 globally — redirect to login except on auth endpoints
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        const url = error.config?.url || '';
        const isAuthEndpoint =
          url.includes('/auth/login') ||
          url.includes('/auth/register');

        if (!isAuthEndpoint) {
          // Clear both token and sessionStorage user before redirecting
          clearSession();
          globalThis.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};

// ── Admin client factory ───────────────────────────────────────────────────
//
// Does NOT inject customer JWT — admin calls use X-Admin-Key header.
// Does NOT redirect to /login on 401/403 — admin auth failures are
// handled by AdminAuthContext which shows an error on AdminLoginPage.
// This prevents an admin key failure from logging out the customer session.

const createAdminClient = (baseURL) => {
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  });

  // No request interceptor — admin key is passed per-call in the header
  // No response interceptor — admin 401/403 handled by AdminAuthContext

  return client;
};

// ── Named exports — one client per microservice ────────────────────────────

export const userClient  = createCustomerClient(USER_BASE);
export const menuClient  = createCustomerClient(MENU_BASE);
export const orderClient = createCustomerClient(ORDER_BASE);

// Admin client — separate from customer clients, no JWT injection
export const adminClient = createAdminClient(ORDER_BASE);

// Default export — orderClient for backward compatibility
export default orderClient;
