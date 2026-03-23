// src/context/cart-context.js
//
// Creates and exports the CartContext object.
// Kept separate from CartContext.jsx for the same reason as auth-context.js —
// the react-refresh rule requires component files to export only components.

import { createContext } from 'react';

const CartContext = createContext(null);

export default CartContext;
