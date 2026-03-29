// src/api/auth.api.js
//
// All calls related to authentication and user profile management.
// Uses userClient — routes to the User service (port 3001 in dev,
// VITE_USER_SERVICE_URL in production).

import { userClient } from './client';

/**
 * Logs in an existing user.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>}
 */
export const loginUser = async (email, password) => {
  const response = await userClient.post('/auth/login', { email, password });
  return response.data;
};

/**
 * Registers a new user account.
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>}
 */
export const registerUser = async (name, email, password) => {
  const response = await userClient.post('/auth/register', { name, email, password });
  return response.data;
};

/**
 * Fetches the current user's profile.
 * @returns {Promise<{ user: object }>}
 */
export const getProfile = async () => {
  const response = await userClient.get('/users/profile');
  return response.data;
};

/**
 * Updates the current user's profile.
 * @param {{ name?: string, phone?: string }} updates
 * @returns {Promise<{ message: string, user: object }>}
 */
export const updateProfile = async (updates) => {
  const response = await userClient.put('/users/profile', updates);
  return response.data;
};

/**
 * Soft-deletes the authenticated user's account.
 * @returns {Promise<{ message: string }>}
 */
export const deleteAccount = async () => {
  const response = await userClient.delete('/users/profile');
  return response.data;
};
