// src/api/client.js
//
// Single Axios instance for the entire frontend.
// ALL API calls go through this — never create ad-hoc fetch() calls elsewhere.
//
// SECURITY: JWT stored in memory (module variable), NOT localStorage.
// localStorage is readable by any JavaScript on the page, making it
// vulnerable to XSS attacks. A module variable is inaccessible to
// injected scripts. Trade-off: token is lost on page refresh.

import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// In-memory token — module-level variable, not localStorage
let _token = null;

export const setToken = (token) => {
  _token = token;
};

export const getToken = () => _token;

// Request interceptor — automatically attaches JWT to every request
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

// Response interceptor — redirect to login on 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setToken(null);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
