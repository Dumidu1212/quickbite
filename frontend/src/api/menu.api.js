// src/api/menu.api.js — Menu service calls

import apiClient from './client';

export const getRestaurants = async (cuisine = null) => {
  const params = cuisine ? { cuisine } : {};
  const response = await apiClient.get('/restaurants', { params });
  return response.data;
};

export const getRestaurant = async (id) => {
  const response = await apiClient.get(`/restaurants/${id}`);
  return response.data;
};

export const getRestaurantMenu = async (restaurantId) => {
  const response = await apiClient.get(`/restaurants/${restaurantId}/menu`);
  return response.data;
};
