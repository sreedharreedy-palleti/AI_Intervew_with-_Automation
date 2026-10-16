import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { USER_ROLES } from '../utils/constants';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore authenticated session from localStorage on app boot
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }

    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  // Save session state to localStorage
  const setSession = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  // Candidate login
  const loginUser = async ({ email, password }) => {
    const data = await authApi.loginUser({ email, password });
    setSession(data.access_token, data.user);
    return data;
  };

  // Admin login
  const loginAdmin = async ({ email, password }) => {
    const data = await authApi.loginAdmin({ email, password });
    setSession(data.access_token, data.user);
    return data;
  };

  // Complete candidate registration
  const registerUser = async (payload) => {
    const data = await authApi.registerUser(payload);
    setSession(data.access_token, data.user);
    return data;
  };

  // Logout session
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
  }, []);

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === USER_ROLES.ADMIN,
    loginUser,
    loginAdmin,
    registerUser,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
