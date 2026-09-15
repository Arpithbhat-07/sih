import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY_TOKEN = 'sentinel_token';
const STORAGE_KEY_USER = 'sentinel_user';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY_TOKEN) || null);
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.setAuthToken(token);
      api.getCurrentUser()
        .then((res) => {
          if (res) {
            setUser(res);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(res));
          } else {
            logout();
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      api.setAuthToken(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (username, password) => {
    const res = await api.login(username, password);
    if (res && res.token && res.user) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem(STORAGE_KEY_TOKEN, res.token);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(res.user));
      api.setAuthToken(res.token);
      return res.user;
    }
    throw new Error(res?.detail || 'Authentication failed');
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network failures on logout
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_USER);
      api.setAuthToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role: user?.role || null,
        scope: user?.scope || null,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};