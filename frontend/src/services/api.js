/**
 * Centralized API Service for AI Interview & Assessment Portal
 * Connects directly to localhost Express server (:5000) and FastAPI assessment service (:8000)
 */

import { executeJavaScriptLocally } from './codeExecutionEngine';

export const getApiBaseUrls = () => {
  const nodeUrl = localStorage.getItem('API_NODE_URL') || 'http://localhost:5000';
  const pythonUrl = localStorage.getItem('API_PYTHON_URL') || 'http://localhost:8000';
  return { nodeUrl, pythonUrl };
};

export const setApiBaseUrls = (nodeUrl, pythonUrl) => {
  if (nodeUrl) localStorage.setItem('API_NODE_URL', nodeUrl);
  if (pythonUrl) localStorage.setItem('API_PYTHON_URL', pythonUrl);
};

// -------------------------------------------------------------
// Auth Token & Local Session Management
// -------------------------------------------------------------
export const getAuthToken = () => {
  return localStorage.getItem('HIREPULSE_AUTH_TOKEN') || null;
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('HIREPULSE_AUTH_TOKEN', token);
  } else {
    localStorage.removeItem('HIREPULSE_AUTH_TOKEN');
  }
};

export const clearAuthToken = () => {
  localStorage.removeItem('HIREPULSE_AUTH_TOKEN');
  localStorage.removeItem('HIREPULSE_AUTH_USER');
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem('HIREPULSE_AUTH_USER');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user) => {
  if (user) {
    localStorage.setItem('HIREPULSE_AUTH_USER', JSON.stringify(user));
  } else {
    localStorage.removeItem('HIREPULSE_AUTH_USER');
  }
};

// Generic Fetch Wrapper with JSON response parsing and meaningful errors
async function request(url, options = {}) {
  try {
    const token = getAuthToken();
    const headers = { ...(options.headers || {}) };

    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.error || data?.detail || `HTTP Error ${res.status}: ${res.statusText}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Failed to connect to server at ${url}. Please ensure your localhost backend server is running.`);
    }
    throw error;
  }
}

// -------------------------------------------------------------
// 0. User & Admin Authentication APIs (Zero Console Errors)
// -------------------------------------------------------------
export const registerUser = async ({ name, email, password, role = 'candidate', targetRole = 'Full Stack Developer', phone = '' }) => {
  const { nodeUrl } = getApiBaseUrls();
  const normalizedEmail = (email || '').toLowerCase().trim();
  const payload = { name: name.trim(), email: normalizedEmail, password, role, targetRole, phone };

  const res = await fetch(`${nodeUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  if (data.token) setAuthToken(data.token);
  if (data.user) setStoredUser(data.user);
  return data;
};

export const loginUser = async ({ email, password }) => {
  const { nodeUrl } = getApiBaseUrls();
  const normalizedEmail = (email || '').toLowerCase().trim();
  const payload = { email: normalizedEmail, password };

  const res = await fetch(`${nodeUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }
  if (data.token) setAuthToken(data.token);
  if (data.user) setStoredUser(data.user);
  return data;
};

export const getCurrentUser = async () => {
  const token = getAuthToken();
  if (!token) {
    return { success: false, user: null };
  }

  const { nodeUrl } = getApiBaseUrls();
  const res = await fetch(`${nodeUrl}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) {
    clearAuthToken();
    return { success: false, user: null };
  }
  if (data.user) {
    setStoredUser(data.user);
  }
  return data;
};

export const getAllRegisteredUsers = async ({ search = '', role = '', page = 1, limit = 10 } = {}) => {
  const { nodeUrl } = getApiBaseUrls();
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (role) params.append('role', role);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);

  const res = await fetch(`${nodeUrl}/api/auth/users?${params.toString()}`, {
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch registered users');
  }
  return data;
};

export const updateUserRole = async (userId, { role, status }) => {
  const { nodeUrl } = getApiBaseUrls();
  const res = await fetch(`${nodeUrl}/api/auth/users/${userId}/role`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({ role, status })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update user role');
  }
  return data;
};

export const deleteUserAccount = async (userId) => {
  const { nodeUrl } = getApiBaseUrls();
  const res = await fetch(`${nodeUrl}/api/auth/users/${userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${getAuthToken()}` }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete user account');
  }
  return data;
};

// -------------------------------------------------------------
// 1. Resume ATS Screening API (Node.js Express :5000)
// -------------------------------------------------------------
export const uploadAndAnalyzeResume = async (formData) => {
  const { nodeUrl } = getApiBaseUrls();
  return request(`${nodeUrl}/api/upload-and-analyze`, {
    method: 'POST',
    body: formData // multipart/form-data
  });
};

// -------------------------------------------------------------
// 2. Proctoring APIs (Node.js :5000 or FastAPI :8000)
// -------------------------------------------------------------
export const startProctorSession = async ({ candidateId, candidateName, targetRole, cameraGranted, micGranted }) => {
  const { nodeUrl } = getApiBaseUrls();
  return request(`${nodeUrl}/api/proctor/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ candidateId, candidateName, targetRole, cameraGranted, micGranted })
  });
};

export const logProctorViolation = async ({ sessionId, violationType, details }) => {
  const { nodeUrl } = getApiBaseUrls();
  return request(`${nodeUrl}/api/proctor/violation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, violationType, details })
  });
};

export const analyzeCameraFrameBackend = async ({
  sessionId,
  candidateId,
  facesCount,
  headAxis,
  phoneDetected,
  audioDb,
  timestamp
}) => {
  const { nodeUrl } = getApiBaseUrls();
  return request(`${nodeUrl}/api/proctor/analyze-frame`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      candidateId,
      facesCount,
      headAxis,
      phoneDetected,
      audioDb,
      timestamp
    })
  });
};

export const terminateProctorSession = async ({ sessionId, reason }) => {
  const { nodeUrl } = getApiBaseUrls();
  return request(`${nodeUrl}/api/proctor/terminate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, reason })
  });
};

export const getProctorSessionStatus = async (sessionId) => {
  const { nodeUrl } = getApiBaseUrls();
  return request(`${nodeUrl}/api/proctor/session/${sessionId}`);
};

export const getAllProctorSessions = async () => {
  const { nodeUrl } = getApiBaseUrls();
  return request(`${nodeUrl}/api/proctor/sessions`);
};

// -------------------------------------------------------------
// 3. Coding Assessment APIs (Node.js :5000 & FastAPI :8000)
// -------------------------------------------------------------
export const fetchAssessmentQuestions = async ({ role = 'fullstack', candidateId = null } = {}) => {
  const { nodeUrl, pythonUrl } = getApiBaseUrls();
  const queryParams = new URLSearchParams();
  if (role) queryParams.append('role', role);
  if (candidateId) queryParams.append('candidateId', candidateId);

  // 1. Try Node.js Express backend
  try {
    const nodeRes = await request(`${nodeUrl}/api/assessment/questions?${queryParams.toString()}`);
    if (nodeRes && nodeRes.success && nodeRes.questions?.length > 0) {
      return nodeRes;
    }
  } catch (err) {
    console.warn('Node.js assessment endpoint unavailable, trying Python FastAPI:', err.message);
  }

  // 2. Try Python FastAPI microservice
  try {
    const pyRes = await request(`${pythonUrl}/api/assessment/questions?${queryParams.toString()}`);
    if (pyRes && pyRes.success && pyRes.questions?.length > 0) {
      return pyRes;
    }
  } catch (pyErr) {
    console.warn('FastAPI questions endpoint unavailable:', pyErr.message);
  }

  throw new Error('Failed to retrieve assessment questions from both Express (:5000) and FastAPI (:8000).');
};

export const getAssessmentCandidate = async (candidateId) => {
  const { nodeUrl, pythonUrl } = getApiBaseUrls();
  try {
    return await request(`${nodeUrl}/api/admin/candidates/${candidateId}`);
  } catch {
    try {
      return await request(`${pythonUrl}/api/assessment/${candidateId}`);
    } catch {
      return null;
    }
  }
};

export const executeCandidateCode = async ({
  code,
  language = 'javascript',
  questionId,
  includeHidden = false,
  customInput = null,
  functionName = '',
  visibleTestCases = [],
  hiddenTestCases = []
}) => {
  const { nodeUrl, pythonUrl } = getApiBaseUrls();

  // 1. Try Node.js Express backend execution
  try {
    const res = await request(`${nodeUrl}/api/assessment/execute-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, questionId, includeHidden, customInput })
    });
    if (res && res.success) {
      return res;
    }
  } catch (nodeErr) {
    console.warn('Node execute-code error, attempting fallback:', nodeErr.message);
  }

  // 2. Try Python FastAPI backend execution
  try {
    const pyRes = await request(`${pythonUrl}/api/assessment/execute-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, questionId, includeHidden, customInput })
    });
    if (pyRes && pyRes.success) {
      return pyRes;
    }
  } catch (pyErr) {
    console.warn('FastAPI execute-code error, fallback to browser engine:', pyErr.message);
  }

  // 3. Client-side sandbox evaluation fallback (100% resilient offline)
  return executeJavaScriptLocally({
    code,
    functionName,
    visibleTestCases,
    hiddenTestCases,
    includeHidden
  });
};

export const submitAssessmentExam = async ({
  candidateId,
  sessionId,
  answers = [],
  score = 0,
  correctCount = 0,
  totalQuestions = 0,
  totalTestCasesPassed = 0,
  totalTestCases = 0,
  visiblePassed = 0,
  hiddenPassed = 0,
  codingSubmissions = [],
  proctorMetrics
}) => {
  const { nodeUrl, pythonUrl } = getApiBaseUrls();

  const payload = {
    candidateId: candidateId || 'anonymous',
    sessionId: sessionId || 'session_default',
    answers,
    score,
    correctCount,
    totalQuestions,
    totalTestCasesPassed,
    totalTestCases,
    visiblePassed,
    hiddenPassed,
    codingSubmissions,
    proctorMetrics
  };

  try {
    return await request(`${nodeUrl}/api/assessment/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (nodeErr) {
    return await request(`${pythonUrl}/api/assessment/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
};

// -------------------------------------------------------------
// 4. Admin Portal APIs (Node.js Express :5000)
// -------------------------------------------------------------
export const getDashboardStats = async () => {
  const { nodeUrl } = getApiBaseUrls();
  return request(`${nodeUrl}/api/admin/stats`);
};

export const getAllCandidates = async ({ search = '', role = '', minScore = '', page = 1, limit = 10 } = {}) => {
  const { nodeUrl } = getApiBaseUrls();
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (role) params.append('role', role);
  if (minScore) params.append('minScore', minScore);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);

  return request(`${nodeUrl}/api/admin/candidates?${params.toString()}`);
};

export const getCandidateById = async (id) => {
  const { nodeUrl } = getApiBaseUrls();
  return request(`${nodeUrl}/api/admin/candidates/${id}`);
};

export const createCandidate = async (candidateData) => {
  const { nodeUrl } = getApiBaseUrls();
  return request(`${nodeUrl}/api/admin/candidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(candidateData)
  });
};

export const updateCandidate = async (id, updateData) => {
  const { nodeUrl } = getApiBaseUrls();
  return request(`${nodeUrl}/api/admin/candidates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });
};

export const deleteCandidate = async (id) => {
  const { nodeUrl } = getApiBaseUrls();
  return request(`${nodeUrl}/api/admin/candidates/${id}`, {
    method: 'DELETE'
  });
};

// -------------------------------------------------------------
// 5. Health Check Diagnostics
// -------------------------------------------------------------
export const checkHealthStatus = async () => {
  const { nodeUrl, pythonUrl } = getApiBaseUrls();
  const results = {
    node: { online: false, url: nodeUrl, message: '' },
    python: { online: false, url: pythonUrl, message: '' }
  };

  try {
    const start = performance.now();
    await fetch(`${nodeUrl}/api/admin/stats`, { method: 'GET' });
    const latency = Math.round(performance.now() - start);
    results.node = { online: true, url: nodeUrl, latency: `${latency}ms` };
  } catch (err) {
    results.node = { online: false, url: nodeUrl, message: err.message };
  }

  try {
    const start = performance.now();
    const res = await fetch(`${pythonUrl}/`, { method: 'GET' });
    const latency = Math.round(performance.now() - start);
    if (res.ok) {
      results.python = { online: true, url: pythonUrl, latency: `${latency}ms` };
    } else {
      results.python = { online: false, url: pythonUrl, message: `Status ${res.status}` };
    }
  } catch (err) {
    results.python = { online: false, url: pythonUrl, message: err.message };
  }

  return results;
};
