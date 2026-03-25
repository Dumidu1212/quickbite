// src/context/AdminAuthContext.jsx
//
// Admin authentication state provider.
//
// RESPONSIBILITIES:
//   - Store the admin key in sessionStorage after login
//   - Expose login(), logout(), isAuthenticated flag
//   - Verify the key against the Order service before accepting it
//
// SECURITY:
//   The admin key is stored in sessionStorage (not localStorage).
//   sessionStorage is cleared when the browser tab closes.
//   The key is sent as X-Admin-Key header on every admin API call.
//   It is never stored in a cookie or sent automatically by the browser.
//
// ADMIN KEY vs JWT:
//   The customer-facing app uses JWT stored in a module variable.
//   The admin dashboard uses a shared secret key stored in sessionStorage.
//   These are separate auth mechanisms for separate user types.
//   A full production system would use role-based JWT claims instead,
//   but a shared admin key is sufficient for this prototype.

import { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import AdminAuthContext from './adminAuth-context';
import { updateOrderStatus } from '../api/admin.api';

// sessionStorage key for persisting the admin key across refreshes
const ADMIN_KEY_STORAGE = 'quickbite_admin_key';

// ── Helpers ────────────────────────────────────────────────────────────────

const loadAdminKeyFromSession = () => {
  try {
    return sessionStorage.getItem(ADMIN_KEY_STORAGE) || null;
  } catch {
    return null;
  }
};

const saveAdminKeyToSession = (key) => {
  sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
};

const clearAdminKeyFromSession = () => {
  sessionStorage.removeItem(ADMIN_KEY_STORAGE);
};

// ── Provider ───────────────────────────────────────────────────────────────

export const AdminAuthProvider = ({ children }) => {
  const [adminKey, setAdminKey] = useState(() => loadAdminKeyFromSession());

  // Verify the key by making a real API call that requires it.
  // We use a status update on a non-existent order — if the key is wrong
  // we get 403, if the key is correct we get 404 (order not found).
  // This confirms the key is valid without requiring a dedicated verify endpoint.
  const login = useCallback(async (key) => {
    try {
      await updateOrderStatus(key, '000000000000000000000000', 'confirmed');
    } catch (err) {
      // 404 means the key was accepted but the order does not exist — key is valid
      if (err.response?.status === 404) {
        setAdminKey(key);
        saveAdminKeyToSession(key);
        return { success: true };
      }
      // 403 means the key was rejected
      if (err.response?.status === 403) {
        return { success: false, message: 'Invalid admin key. Please try again.' };
      }
      // Network error — Order service not reachable
      return { success: false, message: 'Cannot connect to Order service.' };
    }
    // If the update somehow succeeded (very unlikely with a fake ID), key is valid
    setAdminKey(key);
    saveAdminKeyToSession(key);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setAdminKey(null);
    clearAdminKeyFromSession();
  }, []);

  const value = useMemo(
    () => ({
      adminKey,
      login,
      logout,
      isAuthenticated: Boolean(adminKey),
    }),
    [adminKey, login, logout]
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

AdminAuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
