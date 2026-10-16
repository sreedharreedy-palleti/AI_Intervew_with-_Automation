import apiClient from './apiClient';

/**
 * Assignment and Coding Interview API service.
 */
export const assignmentApi = {
  /**
   * Retrieves the candidate's personalized AI coding assessment by token.
   * Can pass optional credentials (username, uniqueCode) or fromApp flag.
   */
  getAssignment: async (token, { username, uniqueCode, fromApp } = {}) => {
    const params = {};
    if (username) params.username = username;
    if (uniqueCode) params.unique_code = uniqueCode;
    if (fromApp) params.from_app = true;

    const response = await apiClient.get(`/api/v1/assignment/${token}`, { params });
    return response.data;
  },

  /**
   * Verifies candidate's Username and Unique Exam Passcode before unlocking.
   */
  verifyAccess: async (token, { username, uniqueCode, fromApp = false }) => {
    const response = await apiClient.post(`/api/v1/assignment/${token}/verify-access`, {
      username,
      unique_code: uniqueCode,
      from_app: fromApp,
    });
    return response.data;
  },

  /**
   * Fetches official Exam App download details and instructions.
   */
  getAppDownloadInfo: async () => {
    const response = await apiClient.get('/api/v1/assignment/app/download');
    return response.data;
  },

  /**
   * Executes the candidate's code against public test cases and hidden test cases.
   */
  runTests: async (token, { questionId, code, language = 'python' }) => {
    const response = await apiClient.post(`/api/v1/assignment/${token}/run-tests`, {
      question_id: questionId,
      code,
      language,
    });
    return response.data;
  },

  /**
   * Finalizes the technical assessment by submitting all question solutions.
   */
  submitAssignment: async (token, submissions) => {
    const response = await apiClient.post(`/api/v1/assignment/${token}/submit`, {
      submissions,
    });
    return response.data;
  },

  /**
   * Fetches previously submitted evaluation report and AI code review.
   */
  getResults: async (token) => {
    const response = await apiClient.get(`/api/v1/assignment/${token}/results`);
    return response.data;
  },
};

export default assignmentApi;
