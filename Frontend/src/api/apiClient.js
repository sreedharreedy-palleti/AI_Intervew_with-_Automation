import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

/**
 * Axios instance preconfigured with base URL and authorization interceptors.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
});

// Request Interceptor: Attach JWT bearer token & handle multipart FormData
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // When sending FormData (e.g. resume file upload), delete Content-Type
    // so the browser automatically sets 'multipart/form-data; boundary=----WebKitFormBoundary...'
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format error responses cleanly
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred. Please try again.';

    if (error.response) {
      const data = error.response.data;

      if (typeof data === 'string' && data.trim()) {
        message = data;
      } else if (typeof data?.detail === 'string') {
        message = data.detail;
      } else if (Array.isArray(data?.detail)) {
        // FastAPI 422 validation errors
        message = data.detail
          .map((err) => `${err.loc?.slice(1).join('.') || err.loc?.join('.') || 'Field'}: ${err.msg}`)
          .join(', ');
      } else if (data?.message) {
        message = data.message;
      } else if (error.response.status === 400) {
        message = 'Invalid request. Please check all submitted form fields.';
      } else if (error.response.status === 404) {
        message = 'The requested resource was not found.';
      }

      // If unauthorized token expired
      if (error.response.status === 401) {
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.dispatchEvent(new Event('auth:unauthorized'));
        }
      }
    } else if (error.code === 'ERR_NETWORK') {
      message = 'Cannot connect to backend server. Make sure FastAPI server is running on localhost:8000.';
    } else if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      message = 'The AI analysis request took longer than expected. Your application may already be processing; please check your Applications dashboard.';
    } else if (error.request) {
      message = error.message || 'Server did not respond in time. Please try again.';
    } else if (error.message) {
      message = error.message;
    }

    const enhancedError = new Error(message);
    enhancedError.statusCode = error.response?.status;
    enhancedError.original = error;
    return Promise.reject(enhancedError);
  }
);

export default apiClient;
