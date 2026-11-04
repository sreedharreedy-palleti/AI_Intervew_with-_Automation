import apiClient from './apiClient';

export const interviewApi = {
  startOrResumeInterview: async (payload) => {
    const res = await apiClient.post('/api/v1/interview/start', payload);
    return res.data;
  },

  verifyPrecheck: async (interviewToken, payload) => {
    const res = await apiClient.post(`/api/v1/interview/${interviewToken}/precheck`, payload);
    return res.data;
  },

  getInterviewSession: async (interviewToken) => {
    const res = await apiClient.get(`/api/v1/interview/${interviewToken}`);
    return res.data;
  },

  verifyAccess: async (interviewToken, payload) => {
    const res = await apiClient.post(`/api/v1/interview/${interviewToken}/verify-access`, payload);
    return res.data;
  },

  submitAnswer: async (interviewToken, payload) => {
    const res = await apiClient.post(`/api/v1/interview/${interviewToken}/answer`, payload);
    return res.data;
  },

  analyzeProctorFrame: async (interviewToken, payload) => {
    const res = await apiClient.post(`/api/v1/interview/${interviewToken}/proctor/analyze-frame`, payload);
    return res.data;
  },

  getInterviewReport: async (interviewToken) => {
    const res = await apiClient.get(`/api/v1/interview/${interviewToken}/report`);
    return res.data;
  },

  checkQualification: async (userId, courseId = '') => {
    const url = courseId
      ? `/api/v1/interview/candidate/${userId}/qualification?course_id=${courseId}`
      : `/api/v1/interview/candidate/${userId}/qualification`;
    const res = await apiClient.get(url);
    return res.data;
  },

  adminListSessions: async () => {
    const res = await apiClient.get('/api/v1/interview/admin/sessions');
    return res.data;
  },

  adminScheduleInterview: async (interviewToken, payload) => {
    const res = await apiClient.post(`/api/v1/interview/${interviewToken}/schedule`, payload);
    return res.data;
  },

  resetTrial: async (interviewToken) => {
    const res = await apiClient.post(`/api/v1/interview/${interviewToken}/reset-trial`);
    return res.data;
  },
};

export default interviewApi;

