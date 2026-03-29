// src/api/menu.api.js
//
// Menu service API calls.
// Maps to endpoints on the Menu service (port 8001 in development).
//
// NOTE ON BASE URL:
//   VITE_API_BASE_URL points to the User service (port 3001) by default.
//   In production, Azure API Management routes all paths correctly.
//   For local development the menu service runs on port 8001 —
//   either update .env or use a Vite proxy. Sprint 4 resolves this
//   by running everything through docker-compose.

import { menuClient as apiClient } from './client';

/**
 * Returns all restaurants. Optionally filter by cuisine type.
 * Calls GET /restaurants?cuisine=X on the Menu service.
 *
 * @param {string|null} cuisine - Optional cuisine filter e.g. 'Italian'
 * @returns {Promise<{ restaurants: Array, count: number }>}
 */
export const getRestaurants = async (cuisine = null) => {
  const params = cuisine ? { cuisine } : {};
  const response = await apiClient.get('/restaurants/', { params });
  return response.data;
};

/**
 * Returns a single restaurant by MongoDB ID.
 * Calls GET /restaurants/:id on the Menu service.
 *
 * @param {string} id - MongoDB ObjectId string
 * @returns {Promise<{ restaurant: object }>}
 */
export const getRestaurant = async (id) => {
  const response = await apiClient.get(`/restaurants/${id}`);
  return response.data;
};

/**
 * Returns all menu items for a restaurant, grouped by category.
 * Calls GET /restaurants/:id/menu on the Menu service.
 * Used by MenuPage to render section headers (Starters, Mains, etc.)
 *
 * @param {string} restaurantId - MongoDB ObjectId string
 * @returns {Promise<{ restaurantId, restaurantName, menu: object }>}
 */
export const getRestaurantMenu = async (restaurantId) => {
  const response = await apiClient.get(`/restaurants/${restaurantId}/menu`);
  return response.data;
};
