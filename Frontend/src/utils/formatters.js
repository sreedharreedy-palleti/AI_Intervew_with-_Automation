/**
 * Formatting and Helper Utilities
 */

import { API_BASE_URL } from './constants';

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
};

export const getResumeUrl = (resumePath) => {
  if (!resumePath) return null;
  if (resumePath.startsWith('http')) return resumePath;
  return `${API_BASE_URL}${resumePath.startsWith('/') ? '' : '/'}${resumePath}`;
};

export const getScoreColorClass = (score) => {
  if (score >= 75) return 'text-emerald-400 border-emerald-500';
  if (score >= 50) return 'text-amber-400 border-amber-500';
  return 'text-rose-400 border-rose-500';
};
