// src/context/AuthContext.jsx
//
// Global authentication state.
// Wraps the entire app so any component can call useAuth()
// to get the current user or trigger login/logout.

import { createContext, useContext, useState, useCallback } from 'react';
import { setToken } from '../api/client';
import { loginUser, registerUser } from '../api/auth.api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = useCallback(async (email, password) => {
    const data = await loginUser(email, password);
    setToken(data.token);   // store JWT in memory
    setUser(data.user);     // store user info in React state
    return data;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await registerUser(name, email, password);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>');
  }
  return ctx;
};
