// src/hooks/useCart.js
//
// Custom hook for accessing cart state and actions.
//
// WHY A SEPARATE FILE FROM CartContext.jsx?
//   Same reason as useAuth — react-refresh requires component files
//   to export only components. CartContext.jsx exports CartProvider.
//   This file exports useCart. One responsibility each.
//
// USAGE:
//   import useCart from '../hooks/useCart';
//   const { items, totalItems, totalPrice, addItem, clearCart } = useCart();

import { useContext } from 'react';
import CartContext from '../context/cart-context';

/**
 * Returns the current cart context value.
 *
 * @returns {{
 *   items: Array,
 *   restaurantId: string|null,
 *   totalItems: number,
 *   totalPrice: number,
 *   addItem: function,
 *   removeItem: function,
 *   updateQuantity: function,
 *   clearCart: function
 * }}
 */
const useCart = () => {
  const ctx = useContext(CartContext);

  if (!ctx) {
    throw new Error(
      'useCart must be called inside a <CartProvider>. ' +
      'Make sure your component tree is wrapped with <CartProvider>.'
    );
  }

  return ctx;
};

export default useCart;
