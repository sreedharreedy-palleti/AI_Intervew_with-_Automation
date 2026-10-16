import apiClient from './apiClient';
import { API_ROUTES } from '../utils/constants';

/**
 * Authentication API Service
 * Covers candidate OTP workflow, login, registration, password recovery, and admin login.
 */
export const authApi = {
  // Candidate Registration Step 1: Send OTP to email
  sendRegistrationOtp: async (email) => {
    const res = await apiClient.post(API_ROUTES.AUTH_USER_SEND_OTP, { email });
    return res.data;
  },

  // Candidate Registration Step 2: Verify OTP
  verifyRegistrationOtp: async (email, otp) => {
    const res = await apiClient.post(API_ROUTES.AUTH_USER_VERIFY_OTP, { email, otp });
    return res.data;
  },

  // Candidate Registration Step 3: Complete registration
  registerUser: async ({ name, email, password, role = 'user' }) => {
    const res = await apiClient.post(API_ROUTES.AUTH_USER_REGISTER, {
      name,
      email,
      password,
      role,
    });
    return res.data;
  },

  // Candidate Login
  loginUser: async ({ email, password }) => {
    const res = await apiClient.post(API_ROUTES.AUTH_USER_LOGIN, { email, password });
    return res.data;
  },

  // Admin Direct Login
  loginAdmin: async ({ email, password }) => {
    const res = await apiClient.post(API_ROUTES.AUTH_ADMIN_LOGIN, { email, password });
    return res.data;
  },

  // Password Recovery Step 1: Send OTP
  forgotPasswordSendOtp: async (email) => {
    const res = await apiClient.post(API_ROUTES.AUTH_USER_FORGOT_SEND_OTP, { email });
    return res.data;
  },

  // Password Recovery Step 2: Verify OTP
  forgotPasswordVerifyOtp: async (email, otp) => {
    const res = await apiClient.post(API_ROUTES.AUTH_USER_FORGOT_VERIFY_OTP, { email, otp });
    return res.data;
  },

  // Password Recovery Step 3: Set New Password
  forgotPasswordReset: async (email, new_password) => {
    const res = await apiClient.post(API_ROUTES.AUTH_USER_FORGOT_RESET, { email, new_password });
    return res.data;
  },
};
