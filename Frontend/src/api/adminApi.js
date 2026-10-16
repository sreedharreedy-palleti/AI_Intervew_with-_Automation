import apiClient from './apiClient';
import { API_ROUTES } from '../utils/constants';

/**
 * Admin API Service
 * Covers Course CRUD, Enrolled Student Rosters, and Candidate/User Management.
 */
export const adminApi = {
  // --- Course Operations ---
  listCourses: async () => {
    const res = await apiClient.get(API_ROUTES.ADMIN_COURSES);
    return res.data;
  },

  createCourse: async ({ title, description, instructor, duration_weeks, level }) => {
    const res = await apiClient.post(API_ROUTES.ADMIN_COURSES, {
      title,
      description,
      instructor,
      duration_weeks: Number(duration_weeks),
      level,
    });
    return res.data;
  },

  getCourseDetail: async (courseId) => {
    const res = await apiClient.get(API_ROUTES.ADMIN_COURSE_DETAIL(courseId));
    return res.data;
  },

  updateCourse: async (courseId, data) => {
    const res = await apiClient.put(API_ROUTES.ADMIN_COURSE_UPDATE(courseId), data);
    return res.data;
  },

  deleteCourse: async (courseId) => {
    const res = await apiClient.delete(API_ROUTES.ADMIN_COURSE_DELETE(courseId));
    return res.data;
  },

  getCourseEnrolledUsers: async (courseId) => {
    const res = await apiClient.get(API_ROUTES.ADMIN_COURSE_ROSTER(courseId));
    return res.data;
  },

  // --- Enrollment & Shortlist CRUD Operations ---
  updateEnrollmentStatus: async (courseId, userId, application_status, ats_score = null) => {
    const res = await apiClient.put(API_ROUTES.ADMIN_ENROLLMENT_STATUS(courseId, userId), {
      application_status,
      ...(ats_score !== null ? { ats_score: Number(ats_score) } : {}),
    });
    return res.data;
  },

  deleteEnrollment: async (courseId, userId) => {
    const res = await apiClient.delete(API_ROUTES.ADMIN_ENROLLMENT_DELETE(courseId, userId));
    return res.data;
  },

  manualEnrollCandidate: async (courseId, payload) => {
    const res = await apiClient.post(API_ROUTES.ADMIN_ENROLLMENT_MANUAL(courseId), payload);
    return res.data;
  },

  scheduleCandidateAssignment: async (courseId, userId, payload) => {
    const res = await apiClient.post(
      API_ROUTES.ADMIN_ENROLLMENT_SCHEDULE_ASSIGNMENT(courseId, userId),
      payload
    );
    return res.data;
  },

  broadcastCourseAssignment: async (courseId, payload) => {
    const res = await apiClient.post(
      API_ROUTES.ADMIN_COURSE_BROADCAST_ASSIGNMENT(courseId),
      payload
    );
    return res.data;
  },

  // --- User / Candidate Operations ---
  listUsers: async () => {
    const res = await apiClient.get(API_ROUTES.ADMIN_USERS);
    return res.data;
  },

  createUser: async ({ name, email, password, role = 'user', is_verified = true }) => {
    const res = await apiClient.post(API_ROUTES.ADMIN_USERS, {
      name,
      email,
      password,
      role,
      is_verified,
    });
    return res.data;
  },

  getUserDetail: async (userId) => {
    const res = await apiClient.get(API_ROUTES.ADMIN_USER_DETAIL(userId));
    return res.data;
  },

  updateUser: async (userId, data) => {
    const res = await apiClient.put(API_ROUTES.ADMIN_USER_UPDATE(userId), data);
    return res.data;
  },

  deleteUser: async (userId) => {
    const res = await apiClient.delete(API_ROUTES.ADMIN_USER_DELETE(userId));
    return res.data;
  },
};
