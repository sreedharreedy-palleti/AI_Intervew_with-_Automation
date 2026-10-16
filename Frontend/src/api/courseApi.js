import apiClient from './apiClient';
import { API_ROUTES } from '../utils/constants';

/**
 * Candidate Course Catalog and AI Enrollment API Service
 */
export const courseApi = {
  // Fetch available courses for user (with enrolled status flag)
  getCourses: async () => {
    const res = await apiClient.get(API_ROUTES.USER_COURSES);
    return res.data;
  },

  // Fetch single course details
  getCourseDetail: async (courseId) => {
    const res = await apiClient.get(API_ROUTES.USER_COURSE_DETAIL(courseId));
    return res.data;
  },

  // Apply & Enroll with Resume for AI ATS Evaluation
  enrollWithResume: async (courseId, { fullName, dob, college, year, resumeFile }) => {
    const formData = new FormData();
    formData.append('full_name', fullName);
    formData.append('dob', dob);
    formData.append('college', college);
    formData.append('year', year);
    formData.append('resume', resumeFile);

    // Let apiClient and the browser set the multipart/form-data boundary automatically
    const res = await apiClient.post(API_ROUTES.USER_COURSE_ENROLL(courseId), formData, {
      timeout: 180000,
    });
    return res.data;
  },
};
