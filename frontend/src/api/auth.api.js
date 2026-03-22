// src/api/auth.api.js
//
// All calls related to authentication.
// Each function maps to one backend endpoint.
// Components call these functions — they never call apiClient directly.

import apiClient from './client';

/**
 * Logs in a user and returns { token, user }.
 */
export const loginUser = async (email, password) => {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
};

/**
 * Registers a new user and returns { user }.
 */
export const registerUser = async (name, email, password) => {
  const response = await apiClient.post('/auth/register', { name, email, password });
  return response.data;
};
