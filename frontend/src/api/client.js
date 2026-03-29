// src/api/client.js
//
// Axios client configuration for the QuickBite frontend.
//
// DEV vs PRODUCTION:
//   Development — Vite proxy routes all relative paths to the correct service.
//     /auth/* and /users/*   → localhost:3001 (User service)
//     /restaurants/*         → localhost:8001 (Menu service)
//     /orders/*              → localhost:3002 (Order service)
//
//   Production — Each service has its own Azure Container Apps URL.
//     Three separate Axios clients are exported, one per service.
//
// TOKEN LIFECYCLE:
//   JWT stored in _token (module variable) — intentionally cleared on refresh.
//   User object persisted in sessionStorage so UI stays logged in after refresh.

import axios from 'axios';

const IS_PROD = import.meta.env.PROD;

const USER_BASE  = IS_PROD ? (import.meta.env.VITE_USER_SERVICE_URL  || '') : '';
const MENU_BASE  = IS_PROD ? (import.meta.env.VITE_MENU_SERVICE_URL  || '') : '';
const ORDER_BASE = IS_PROD ? (import.meta.env.VITE_ORDER_SERVICE_URL || '') : '';

// ── In-memory token ────────────────────────────────────────────────────────

let _token = null;

export const setToken   = (token) => { _token = token; };
export const getToken   = ()      => _token;
export const clearToken = ()      => { _token = null; };
export const hasToken   = ()      => Boolean(_token);

// ── Client factory ─────────────────────────────────────────────────────────

const createClient = (baseURL) => {
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use(
    (config) => {
      if (_token) config.headers.Authorization = `Bearer ${_token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        const url = error.config?.url || '';
        const isAuthEndpoint =
          url.includes('/auth/login') ||
          url.includes('/auth/register');
        if (!isAuthEndpoint) {
          clearToken();
          globalThis.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};

// ── One client per microservice ────────────────────────────────────────────

export const userClient  = createClient(USER_BASE);
export const menuClient  = createClient(MENU_BASE);
export const orderClient = createClient(ORDER_BASE);

export default orderClient;
