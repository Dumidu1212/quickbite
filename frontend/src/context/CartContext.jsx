// src/context/CartContext.jsx
//
// Global cart state using useReducer.
// useReducer is better than useState for complex state with multiple
// update types (add, remove, increment, clear).
// Each action type has one clear purpose — easy to test and debug.

import { createContext, useContext, useReducer, useCallback } from 'react';

const CartContext = createContext(null);

// All possible actions on the cart
const CART_ACTIONS = {
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART: 'CLEAR_CART',
};

// Pure function — given a state and action, returns a new state.
// No side effects. Easy to unit test.
const cartReducer = (state, action) => {
  switch (action.type) {
    case CART_ACTIONS.ADD_ITEM: {
      const existingIndex = state.items.findIndex(
        (item) => item.itemId === action.payload.itemId
      );
      if (existingIndex >= 0) {
        // Item already in cart — increment quantity
        const updated = [...state.items];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return { ...state, items: updated };
      }
      // New item — add with quantity 1
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      };
    }
    case CART_ACTIONS.REMOVE_ITEM:
      return {
        ...state,
        items: state.items.filter((item) => item.itemId !== action.payload.itemId),
      };
    case CART_ACTIONS.UPDATE_QUANTITY:
      return {
        ...state,
        items: state.items.map((item) =>
          item.itemId === action.payload.itemId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };
    case CART_ACTIONS.CLEAR_CART:
      return { ...state, items: [], restaurantId: null };
    default:
      return state;
  }
};

const initialState = { items: [], restaurantId: null };

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addItem = useCallback((item) => {
    dispatch({ type: CART_ACTIONS.ADD_ITEM, payload: item });
  }, []);

  const removeItem = useCallback((itemId) => {
    dispatch({ type: CART_ACTIONS.REMOVE_ITEM, payload: { itemId } });
  }, []);

  const updateQuantity = useCallback((itemId, quantity) => {
    dispatch({ type: CART_ACTIONS.UPDATE_QUANTITY, payload: { itemId, quantity } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: CART_ACTIONS.CLEAR_CART });
  }, []);

  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        restaurantId: state.restaurantId,
        totalItems,
        totalPrice,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside a <CartProvider>');
  }
  return ctx;
};
