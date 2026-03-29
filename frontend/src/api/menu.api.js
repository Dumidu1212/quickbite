// src/api/menu.api.js
//
// Menu service API calls.
// Uses menuClient — routes to the Menu service (port 8001 in dev,
// VITE_MENU_SERVICE_URL in production).

import { menuClient } from './client';

/**
 * Returns all restaurants, optionally filtered by cuisine.
 * @param {string|null} cuisine
 * @returns {Promise<{ restaurants: Array, count: number }>}
 */
export const getRestaurants = async (cuisine = null) => {
  const params = cuisine ? { cuisine } : {};
  const response = await menuClient.get('/restaurants/', { params });
  return response.data;
};

/**
 * Returns a single restaurant by ID.
 * @param {string} id
 * @returns {Promise<{ restaurant: object }>}
 */
export const getRestaurant = async (id) => {
  const response = await menuClient.get(`/restaurants/${id}`);
  return response.data;
};

/**
 * Returns all menu items for a restaurant, grouped by category.
 * @param {string} restaurantId
 * @returns {Promise<{ restaurantId, restaurantName, menu: object }>}
 */
export const getRestaurantMenu = async (restaurantId) => {
  const response = await menuClient.get(`/restaurants/${restaurantId}/menu`);
  return response.data;
};
