// src/clients/menuClient.js
//
// Single place for all communication with the menu-service.
// Same anti-corruption layer pattern as userClient.js.

'use strict';

const axios = require('axios');
const config = require('../config/env');

const menuServiceClient = axios.create({
  baseURL: config.menuServiceUrl,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Fetches a single menu item by ID from the menu-service.
 * Used during order creation to:
 *   1. Verify the item actually exists
 *   2. Get the CURRENT price (never trust the client-sent price)
 *   3. Check isAvailable before accepting the order
 *
 * @param {string} itemId
 * @returns {object|null} The menu item object, or null if not found / error
 */
const getMenuItem = async (itemId) => {
  try {
    const response = await menuServiceClient.get(`/menu/items/${itemId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // Item doesn't exist — caller handles this
    }
    console.error(`[MenuClient] Failed to fetch item ${itemId}: ${error.message}`);
    return null;
  }
};

module.exports = { getMenuItem };
