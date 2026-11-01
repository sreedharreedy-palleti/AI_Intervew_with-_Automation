/**
 * Application Constants & API Endpoints configuration
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const API_ROUTES = {
  // Candidate / User Auth
  AUTH_USER_SEND_OTP: '/api/v1/auth/user/send-registration-otp',
  AUTH_USER_VERIFY_OTP: '/api/v1/auth/user/verify-registration-otp',
  AUTH_USER_REGISTER: '/api/v1/auth/user/register',
  AUTH_USER_LOGIN: '/api/v1/auth/user/login',
  AUTH_USER_FORGOT_SEND_OTP: '/api/v1/auth/user/forgot-password-send-otp',
  AUTH_USER_FORGOT_VERIFY_OTP: '/api/v1/auth/user/forgot-password-verify-otp',
  AUTH_USER_FORGOT_RESET: '/api/v1/auth/user/forgot-password-update',

  // Admin Auth
  AUTH_ADMIN_LOGIN: '/api/v1/auth/admin/login',

  // Candidate / User Courses
  USER_COURSES: '/api/v1/user/courses',
  USER_COURSE_DETAIL: (courseId) => `/api/v1/user/courses/${courseId}`,
  USER_COURSE_ENROLL: (courseId) => `/api/v1/user/courses/${courseId}/enroll`,

  // Admin Courses & Enrollments
  ADMIN_COURSES: '/api/v1/admin/courses',
  ADMIN_COURSE_DETAIL: (courseId) => `/api/v1/admin/courses/${courseId}`,
  ADMIN_COURSE_UPDATE: (courseId) => `/api/v1/admin/courses/${courseId}`,
  ADMIN_COURSE_DELETE: (courseId) => `/api/v1/admin/courses/${courseId}`,
  ADMIN_COURSE_ROSTER: (courseId) => `/api/v1/admin/courses/${courseId}/enrolled-users`,
  ADMIN_ENROLLMENT_MANUAL: (courseId) => `/api/v1/admin/courses/${courseId}/enrolled-users`,
  ADMIN_ENROLLMENT_STATUS: (courseId, userId) => `/api/v1/admin/courses/${courseId}/enrolled-users/${userId}/status`,
  ADMIN_ENROLLMENT_DELETE: (courseId, userId) => `/api/v1/admin/courses/${courseId}/enrolled-users/${userId}`,
  ADMIN_ENROLLMENT_SCHEDULE_ASSIGNMENT: (courseId, userId) => `/api/v1/admin/courses/${courseId}/enrolled-users/${userId}/schedule-assignment`,
  ADMIN_COURSE_BROADCAST_ASSIGNMENT: (courseId) => `/api/v1/admin/courses/${courseId}/broadcast-assignment`,

  // Admin User Management
  ADMIN_USERS: '/api/v1/admin/users',
  ADMIN_USER_DETAIL: (userId) => `/api/v1/admin/users/${userId}`,
  ADMIN_USER_UPDATE: (userId) => `/api/v1/admin/users/${userId}`,
  ADMIN_USER_DELETE: (userId) => `/api/v1/admin/users/${userId}`,

  // Admin Live Analytics & Visualizations
  ADMIN_ANALYTICS_DASHBOARD: '/api/v1/admin/analytics/dashboard',
};

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

export const APPLICATION_STATUS = {
  SHORTLISTED: 'shortlisted',
  REJECTED: 'rejected',
  PENDING: 'pending',
};

export const DEMO_CREDENTIALS = {
  ADMIN: {
    email: 'admin@example.com',
    password: 'YourAdminPassword123!',
  },
  USER: {
    email: 'candidate@example.com',
    password: 'password123',
  },
};
