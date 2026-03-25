// src/hooks/useAdminAuth.js
//
// Custom hook for accessing admin authentication state.
// Separated from AdminAuthContext.jsx for react-refresh compliance.

import { useContext } from 'react';
import AdminAuthContext from '../context/adminAuth-context';

/**
 * Returns the admin auth context value.
 *
 * @returns {{
 *   adminKey: string|null,
 *   login: function,
 *   logout: function,
 *   isAuthenticated: boolean
 * }}
 */
const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);

  if (!ctx) {
    throw new Error(
      'useAdminAuth must be called inside an <AdminAuthProvider>. ' +
      'Make sure the admin routes are wrapped with <AdminAuthProvider>.'
    );
  }

  return ctx;
};

export default useAdminAuth;
