// src/api/auth.api.js
//
// All calls related to authentication and user profile management.
// Each function maps to one endpoint on the User service.
// Components call these functions — they never call apiClient directly.
// This means if the User service API changes, only this file needs updating.

import apiClient from './client';

/**
 * Logs in an existing user.
 * Calls POST /auth/login on the User service.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>}
 */
export const loginUser = async (email, password) => {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
};

/**
 * Registers a new user account.
 * Calls POST /auth/register on the User service.
 * Returns the same shape as loginUser on success.
 *
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>}
 */
export const registerUser = async (name, email, password) => {
  const response = await apiClient.post('/auth/register', {
    name,
    email,
    password,
  });
  return response.data;
};

/**
 * Fetches the current user's profile from the User service.
 * Requires a valid JWT — the request interceptor in api/client.js
 * attaches the Authorization header automatically.
 * Calls GET /users/profile.
 *
 * @returns {Promise<{ user: object }>}
 */
export const getProfile = async () => {
  const response = await apiClient.get('/users/profile');
  return response.data;
};

/**
 * Updates the current user's profile.
 * Only name and phone can be updated — email changes are not supported.
 * Calls PUT /users/profile on the User service.
 *
 * @param {{ name?: string, phone?: string }} updates
 * @returns {Promise<{ message: string, user: object }>}
 */
export const updateProfile = async (updates) => {
  const response = await apiClient.put('/users/profile', updates);
  return response.data;
};


/**
 * Soft-deletes the authenticated user's account.
 * Calls DELETE /users/profile on the User service.
 * Sets isActive: false — does not remove the MongoDB document.
 * The client should call logout() after this succeeds.
 *
 * @returns {Promise<{ message: string }>}
 */
export const deleteAccount = async () => {
  const response = await apiClient.delete('/users/profile');
  return response.data;
};
