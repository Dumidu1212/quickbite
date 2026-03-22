// src/api/orders.api.js — Order service calls

import apiClient from './client';

export const createOrder = async (orderData) => {
  const response = await apiClient.post('/orders', orderData);
  return response.data;
};

export const getOrder = async (orderId) => {
  const response = await apiClient.get(`/orders/${orderId}`);
  return response.data;
};

export const getUserOrders = async (userId) => {
  const response = await apiClient.get(`/orders/user/${userId}`);
  return response.data;
};
