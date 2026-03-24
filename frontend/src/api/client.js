// src/api/client.js
//
// Single Axios instance for the entire frontend.
//
// TOKEN LIFECYCLE:
//   The JWT is stored in _token (module variable) after login.
//   It is LOST on page refresh — this is intentional for XSS protection.
//   The user object is restored from sessionStorage after refresh, so the
//   UI shows the user as logged in, but _token is null.
//
//   Pages that make authenticated API calls should check hasToken() first.
//   If the token is missing, redirect to login with a clear message rather
//   than letting the API call fail with 401 and triggering a silent redirect.
//
// 401 HANDLING:
//   The response interceptor redirects to login on 401 for most routes.
//   Auth endpoints (/auth/login, /auth/register) are excluded because
//   401 there means "wrong credentials" — an expected response.

import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// In-memory token — persists for the JS session, cleared on page refresh
let _token = null;

export const setToken  = (token) => { _token = token; };
export const getToken  = () => _token;

// hasToken() lets components check before making protected calls.
// Use this to give users a friendly "session expired" message instead
// of silently redirecting them mid-flow (e.g. during checkout).
export const hasToken  = () => Boolean(_token);

// Request interceptor — attach JWT to every outgoing request
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

// Response interceptor — handle expired/invalid sessions globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/register');

      if (!isAuthEndpoint) {
        setToken(null);
        globalThis.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
