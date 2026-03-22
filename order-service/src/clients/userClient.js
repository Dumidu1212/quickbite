// src/clients/userClient.js
//
// MICROSERVICE PRINCIPLE: The order service never imports code from
// the user service. Communication happens ONLY via HTTP.
// This module is the single place that knows how to talk to user-service.
//
// If the user service URL changes, we change it here — nowhere else.
// If the user service API changes, we update the client here — nowhere else.
// This is called the "anti-corruption layer" pattern.

'use strict';

const axios = require('axios');
const config = require('../config/env');

// One Axios instance per upstream service
// timeout: 5000ms — we never wait more than 5 seconds for user-service
const userServiceClient = axios.create({
  baseURL: config.userServiceUrl,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Calls GET /auth/validate on the user-service to verify a JWT.
 *
 * @param {string} token - The raw JWT string (without "Bearer " prefix)
 * @returns {{ valid: boolean, userId?: string, email?: string, error?: string }}
 *
 * Returns { valid: false } on ANY failure (network error, invalid token, etc.)
 * The order service treats any non-valid response as unauthorised.
 */
const validateToken = async (token) => {
  try {
    const response = await userServiceClient.get('/auth/validate', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    // Network error, timeout, or user-service is down
    // Log the error but return { valid: false } — don't crash the order service
    console.error(`[UserClient] Token validation failed: ${error.message}`);
    return { valid: false, error: 'user_service_unavailable' };
  }
};

module.exports = { validateToken };
