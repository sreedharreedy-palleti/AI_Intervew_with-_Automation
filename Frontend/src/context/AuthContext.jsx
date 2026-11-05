import React, { createContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { USER_ROLES } from '../utils/constants';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore authenticated session from sessionStorage on app boot
  // Using sessionStorage ensures that closing the page/tab/browser automatically locks out / logs out both candidate and admin accounts.
  useEffect(() => {
    try {
      // Clean up any legacy persistent localStorage session to guarantee automatic logout on page close
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      const storedToken = sessionStorage.getItem('token');
      const storedUser = sessionStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
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

  // Save session state to sessionStorage (ephemeral to active page session)
  const setSession = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    sessionStorage.setItem('token', newToken);
    sessionStorage.setItem('user', JSON.stringify(newUser));
    // Proactively clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.clear();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
