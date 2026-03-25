// src/context/adminAuth-context.js
//
// Creates and exports the AdminAuthContext object.
//
// Kept separate from AdminAuthContext.jsx for the same reason as
// auth-context.js — the react-refresh/only-export-components rule
// requires component files to export only components.

import { createContext } from 'react';

const AdminAuthContext = createContext(null);

export default AdminAuthContext;
