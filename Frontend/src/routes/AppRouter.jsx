import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import MainLayout from '../components/layout/MainLayout';
import AdminLayout from '../components/layout/AdminLayout';

// Guards
import ProtectedRoute from '../components/guards/ProtectedRoute';
import AdminRoute from '../components/guards/AdminRoute';
import PublicOnlyRoute from '../components/guards/PublicOnlyRoute';
import AdminLoginRoute from '../components/guards/AdminLoginRoute';

// Auth Pages
import UserLogin from '../pages/auth/UserLogin';
import UserRegister from '../pages/auth/UserRegister';
import ForgotPassword from '../pages/auth/ForgotPassword';
import AdminLogin from '../pages/auth/AdminLogin';

// Candidate Pages
import CourseCatalog from '../pages/user/CourseCatalog';
import CourseDetail from '../pages/user/CourseDetail';
import MyEnrollments from '../pages/user/MyEnrollments';

// Assignment / Interview Simulation Page
import AssignmentView from '../pages/assignment/AssignmentView';
import InterviewView from '../pages/interview/InterviewView';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminEnrollments from '../pages/admin/AdminEnrollments';
import AdminCourses from '../pages/admin/AdminCourses';
import AdminCourseRoster from '../pages/admin/AdminCourseRoster';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminUserDetail from '../pages/admin/AdminUserDetail';
import AdminAppDownloads from '../pages/admin/AdminAppDownloads';

// 404 Page
import NotFound from '../pages/NotFound';

const AppRouter = () => {
  return (
    <Routes>
      {/* Auth Public-Only Routes */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <UserLogin />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <UserRegister />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPassword />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/admin/login"
        element={
          <AdminLoginRoute>
            <AdminLogin />
          </AdminLoginRoute>
        }
      />

      {/* Main Candidate Experience (with Navbar & Footer) */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/courses" replace />} />
        <Route path="/courses" element={<CourseCatalog />} />
        <Route path="/courses/admin" element={<Navigate to="/admin" replace />} />
        <Route path="/courses/:courseId" element={<CourseDetail />} />

        {/* Protected Candidate Routes */}
        <Route
          path="/my-enrollments"
          element={
            <ProtectedRoute>
              <MyEnrollments />
            </ProtectedRoute>
          }
        />
        <Route path="/download-app" element={<Navigate to="/courses" replace />} />

        {/* 404 inside MainLayout */}
        <Route path="/404" element={<NotFound />} />
      </Route>

      {/* Dedicated Locked Proctored Examination Routes (Standalone - No Navbar, No Chatbot) */}
      <Route path="/assignment" element={<AssignmentView />} />
      <Route path="/assignment/app" element={<AssignmentView />} />
      <Route path="/assignment/:assignmentToken" element={<AssignmentView />} />
      <Route path="/interview/:interviewToken" element={<InterviewView />} />

      {/* Admin Portal Experience (with Sidebar & Topbar) */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="enrollments" element={<AdminEnrollments />} />
        <Route path="courses" element={<AdminCourses />} />
        <Route path="courses/:courseId/roster" element={<AdminCourseRoster />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:userId" element={<AdminUserDetail />} />
        <Route path="app-downloads" element={<AdminAppDownloads />} />
        <Route path="ai-assistant" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="chatbot" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      {/* Global Fallback Route */}
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
};

export default AppRouter;
