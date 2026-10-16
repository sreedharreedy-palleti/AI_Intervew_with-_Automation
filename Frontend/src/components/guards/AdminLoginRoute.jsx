import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Loader from '../common/Loader';

/**
 * Route guard for Admin Login page.
 * If user is already an admin, redirect straight to admin dashboard.
 * If user is a candidate or not authenticated, allow access to admin login so they can authenticate as admin.
 */
const AdminLoginRoute = ({ children }) => {
  const { isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return <Loader fullScreen text="Loading..." />;
  }

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

export default AdminLoginRoute;
