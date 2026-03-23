// src/context/AuthContext.jsx
//
// Authentication state provider.
//
// RESPONSIBILITIES:
//   - Hold the current user object in React state
//   - Expose login(), register(), logout() actions
//   - Persist user info in sessionStorage to survive page refreshes
//
// TOKEN vs USER PERSISTENCE:
//   The JWT is kept in memory only (module variable in api/client.js).
//   This is the secure choice — injected scripts cannot steal it.
//
//   The USER OBJECT (name, email, id) is stored in sessionStorage.
//   It contains no secrets — it is the same data the API returns publicly.
//   This means after a page refresh, the user sees their name and the
//   restaurants page immediately. When they make an API call that needs
//   auth (like placing an order), the missing token causes a 401 which
//   redirects to login. This is a much better UX than an immediate redirect.
//
//   sessionStorage is cleared when the browser tab closes — more private
//   than localStorage which persists indefinitely.
//
// useMemo on context value:
//   Prevents a new object being created on every render, which would
//   cause all consumers to re-render unnecessarily (S6481).

import { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import AuthContext from './auth-context';
import { setToken } from '../api/client';
import { loginUser, registerUser } from '../api/auth.api';

// sessionStorage key for persisting the user object across page refreshes
const USER_STORAGE_KEY = 'quickbite_user';

// ── Helpers ─────────────────────────────────────────────────────────────────

// Read user from sessionStorage on initial load.
// Returns null if nothing is stored or if the stored value is invalid JSON.
const loadUserFromSession = () => {
  try {
    const stored = sessionStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    // Corrupted storage — treat as not logged in
    return null;
  }
};

// Save user object to sessionStorage (no secrets — safe to persist)
const saveUserToSession = (user) => {
  sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

// Clear the stored user on logout
const clearUserFromSession = () => {
  sessionStorage.removeItem(USER_STORAGE_KEY);
};

// ── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  // Initialise from sessionStorage so page refresh does not log the user out
  const [user, setUser] = useState(() => loadUserFromSession());

  // ── Actions ───────────────────────────────────────────────────────────────

  const login = useCallback(async (email, password) => {
    const data = await loginUser(email, password);
    setToken(data.token);
    setUser(data.user);
    saveUserToSession(data.user);
    return data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await registerUser(name, email, password);
    setToken(data.token);
    setUser(data.user);
    saveUserToSession(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    clearUserFromSession();
  }, []);

  const isAuthenticated = !!user;

  const value = useMemo(
    () => ({ user, login, register, logout, isAuthenticated }),
    [user, login, register, logout, isAuthenticated]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
