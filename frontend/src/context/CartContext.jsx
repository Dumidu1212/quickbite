// src/context/CartContext.jsx
//
// Shopping cart state provider.
//
// RESPONSIBILITIES:
//   - Hold cart items and restaurantId in memory
//   - Expose add, remove, update quantity, and clear actions
//   - Compute derived values: totalItems and totalPrice
//
// WHY useReducer INSTEAD OF useState?
//   The cart has multiple distinct update operations.
//   useReducer collects ALL state transitions in one pure function (cartReducer).
//   Benefits: each transition is explicit and named, easy to reason about,
//   and straightforward to unit test in isolation.
//
// IMMUTABILITY:
//   The reducer never mutates the existing state array.
//   It always returns a new array using spread (...) and filter/map.
//   React depends on reference equality to detect state changes —
//   mutating in place would break re-rendering.
//
// DERIVED VALUES:
//   totalItems and totalPrice are computed from state on every render.
//   They are NOT stored in state separately — that would risk going out of sync.

import { useReducer, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import CartContext from './cart-context';

// ── Action type constants ──────────────────────────────────────────────────
//
// Using constants instead of raw strings prevents typo bugs.
// A typo in a string silently falls to the default case;
// a typo in a constant name throws a ReferenceError immediately.
const ACTIONS = {
  ADD_ITEM:        'ADD_ITEM',
  REMOVE_ITEM:     'REMOVE_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  CLEAR_CART:      'CLEAR_CART',
};

// ── Reducer ────────────────────────────────────────────────────────────────
//
// Pure function: (currentState, action) => newState
// No side effects. No API calls. No async logic.
// Given the same inputs, always returns the same output.
const cartReducer = (state, action) => {
  switch (action.type) {

    case ACTIONS.ADD_ITEM: {
      const existingIndex = state.items.findIndex(
        (item) => item.itemId === action.payload.itemId
      );
      if (existingIndex >= 0) {
        const updated = [...state.items];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return { ...state, items: updated };
      }
      return {
        // Store restaurantId from the first item added
        restaurantId: state.restaurantId || action.payload.restaurantId || null,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      };
    }

    case ACTIONS.REMOVE_ITEM:
      // filter() returns a new array, does not mutate state
      return {
        ...state,
        items: state.items.filter(
          (item) => item.itemId !== action.payload.itemId
        ),
      };

    case ACTIONS.UPDATE_QUANTITY:
      // map() returns a new array — only the matching item changes
      return {
        ...state,
        items: state.items.map((item) =>
          item.itemId === action.payload.itemId
            ? { ...item, quantity: action.payload.quantity }
            : item
        ),
      };

    case ACTIONS.CLEAR_CART:
      // Called after successful order placement in CheckoutPage (Sprint 3)
      return { items: [], restaurantId: null };

    default:
      // Unknown action type — return state unchanged
      // This prevents hard crashes from accidental bad dispatches
      return state;
  }
};

const initialState = { items: [], restaurantId: null };

// ── Provider ───────────────────────────────────────────────────────────────

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Each action wrapped in useCallback for stable function references.
  // Without useCallback, components using these functions re-render
  // every time CartProvider re-renders, even if cart state did not change.
  const addItem = useCallback(
    (item) => dispatch({ type: ACTIONS.ADD_ITEM, payload: item }),
    []
  );

  const removeItem = useCallback(
    (itemId) => dispatch({ type: ACTIONS.REMOVE_ITEM, payload: { itemId } }),
    []
  );

  const updateQuantity = useCallback(
    (itemId, quantity) =>
      dispatch({ type: ACTIONS.UPDATE_QUANTITY, payload: { itemId, quantity } }),
    []
  );

  const clearCart = useCallback(
    () => dispatch({ type: ACTIONS.CLEAR_CART }),
    []
  );

  // Derived values — computed from state, not stored separately
  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = state.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Stable context value — recalculates only when cart state actually changes
  const value = useMemo(
    () => ({
      items:          state.items,
      restaurantId:   state.restaurantId,
      totalItems,
      totalPrice,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [state.items, state.restaurantId, totalItems, totalPrice,
     addItem, removeItem, updateQuantity, clearCart]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

CartProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
