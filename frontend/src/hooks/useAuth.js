// src/hooks/useAuth.js
//
// Custom hook for accessing authentication state and actions.
//
// WHY A SEPARATE FILE FROM AuthContext.jsx?
//   The react-refresh/only-export-components ESLint rule requires that
//   files exporting components export ONLY components.
//   AuthContext.jsx exports AuthProvider (a component).
//   This file exports useAuth (a hook — not a component).
//   Keeping them separate satisfies the rule and gives each file one job.
//
// USAGE:
//   import useAuth from '../hooks/useAuth';
//   const { user, login, logout, isAuthenticated } = useAuth();
//
// ERROR BEHAVIOUR:
//   Throws a descriptive error if called outside <AuthProvider>.
//   This gives a clear message during development instead of a cryptic
//   "Cannot read properties of null" error from useContext returning null.

import { useContext } from 'react';
import AuthContext from '../context/auth-context';

/**
 * Returns the current authentication context value.
 *
 * @returns {{
 *   user: object|null,
 *   login: function,
 *   register: function,
 *   logout: function,
 *   isAuthenticated: boolean
 * }}
 */
const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      'useAuth must be called inside an <AuthProvider>. ' +
      'Make sure your component tree is wrapped with <AuthProvider>.'
    );
  }

  return ctx;
};

export default useAuth;
