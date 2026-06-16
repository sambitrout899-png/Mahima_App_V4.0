import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin } from '../services/api';
import { startSignalR, stopSignalR } from '../services/signalr';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);

  // Start SignalR when logged in
  useEffect(() => {
    if (token) {
      startSignalR(token);
    } else {
      stopSignalR();
    }
  }, [token]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      const { token: t, ...userInfo } = data;
      localStorage.setItem('token', t);
      localStorage.setItem('user', JSON.stringify(userInfo));
      setToken(t);
      setUser(userInfo);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    stopSignalR();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
