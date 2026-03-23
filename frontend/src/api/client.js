// src/api/client.js
//
// Single Axios instance for the entire frontend.
//
// RULES:
//   1. ALL API calls use this instance — never create ad-hoc fetch() calls.
//   2. The JWT is stored in a module-level variable, NOT localStorage.
//   3. All requests automatically receive the JWT via the request interceptor.
//   4. 401 responses redirect to /login EXCEPT on auth endpoints.
//
// SECURITY — JWT in memory:
//   localStorage is accessible by any JavaScript on the page (XSS risk).
//   A module-level variable is not accessible to injected scripts.
//   Trade-off: token is lost when the page refreshes.
//
// BASE URL:
//   In development: empty string — Vite proxy routes paths to correct services.
//   In production: VITE_API_BASE_URL is the Azure API Management URL.
//
// 401 HANDLING:
//   The interceptor redirects to /login on 401 for MOST routes.
//   EXCEPTION: /auth/login and /auth/register return 401 for wrong credentials
//   — that is an expected API response, not a session expiry.
//   We must NOT redirect there or the login form's catch block never runs
//   and the user sees no error message.

import axios from 'axios';

// ── Axios instance ──────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── In-memory token ─────────────────────────────────────────────────────────

// Module-level variable — persists for the lifetime of the JS session.
// Cleared on page refresh (intentional security trade-off).
let _token = null;

export const setToken = (token) => { _token = token; };
export const getToken = () => _token;

// ── Request interceptor ─────────────────────────────────────────────────────

// Automatically attaches the JWT Authorization header to every request.
// Components never need to add headers manually.
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ────────────────────────────────────────────────────

// Handles 401 Unauthorized globally.
//
// WHY WE SKIP AUTH ENDPOINTS:
//   POST /auth/login returning 401 means "wrong credentials" — expected.
//   POST /auth/register returning 401 is also possible during validation.
//   If we redirect here, the LoginPage catch block never runs and the
//   user sees a page reload with no error message instead of a toast.
//
// For all OTHER endpoints, 401 means the token has expired or is invalid.
// We clear it and redirect to login so the user can re-authenticate.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthEndpoint =
        requestUrl.includes('/auth/login') ||
        requestUrl.includes('/auth/register');

      if (!isAuthEndpoint) {
        // Session expired — clear token and send user to login
        setToken(null);
        globalThis.location.href = '/login';
      }
      // Auth endpoints: let the error propagate to the calling component's catch block
    }
    return Promise.reject(error);
  }
);

export default apiClient;
