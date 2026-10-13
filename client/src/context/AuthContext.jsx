import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useNotification } from './NotificationContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('billflow_token') || null);
  const [loading, setLoading] = useState(true);
  const { success, error: showError } = useNotification();

  const fetchProfile = useCallback(async () => {
    try {
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.user);
        setBusiness(res.data.business);
      }
    } catch (err) {
      console.error('Failed to restore auth session:', err);
      setToken(null);
      localStorage.removeItem('billflow_token');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token: authToken, user: authUser, business: authBusiness } = res.data;
      localStorage.setItem('billflow_token', authToken);
      setToken(authToken);
      setUser(authUser);
      setBusiness(authBusiness);
      success(`Welcome back, ${authUser.name}!`);
      return { success: true, business: authBusiness };
    } catch (err) {
      showError(err.message || 'Login failed');
      return { success: false, error: err.message };
    }
  };

  const register = async (formData) => {
    try {
      const res = await api.post('/auth/register', formData);
      const { token: authToken, user: authUser, business: authBusiness } = res.data;
      localStorage.setItem('billflow_token', authToken);
      setToken(authToken);
      setUser(authUser);
      setBusiness(authBusiness);
      success('Account created successfully!');
      return { success: true, business: authBusiness };
    } catch (err) {
      showError(err.message || 'Registration failed');
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('billflow_token');
    setToken(null);
    setUser(null);
    setBusiness(null);
    success('Logged out successfully');
  };

  const updateBusinessState = (updatedBusiness) => {
    setBusiness((prev) => ({ ...prev, ...updatedBusiness }));
  };

  const seedDemoData = async () => {
    try {
      const res = await api.post('/seed/demo');
      if (res.data.success) {
        success('Demo data loaded successfully!');
        await fetchProfile();
        return { success: true };
      }
    } catch (err) {
      showError(err.message || 'Failed to seed demo data');
      return { success: false };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        updateBusinessState,
        refreshProfile: fetchProfile,
        seedDemoData,
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
