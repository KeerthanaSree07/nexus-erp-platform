import axios from 'axios';

export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  // In production or when hosted on a live domain (e.g. Vercel), use the deployed Render backend
  if (
    import.meta.env.PROD ||
    (typeof window !== 'undefined' &&
      window.location &&
      !window.location.hostname.includes('localhost') &&
      !window.location.hostname.includes('127.0.0.1'))
  ) {
    return 'https://nexus-erp-platform.onrender.com';
  }
  return 'http://localhost:4000';
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 30000,
});

export const getErrorMessage = (error, defaultMsg = 'An unexpected error occurred.') => {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  const status = error?.response?.status;
  if (status === 401) {
    return 'Invalid email or password.';
  }
  if (status === 403) {
    return 'Access denied. Your account does not have permission.';
  }
  if (status === 404) {
    return 'Requested endpoint was not found on the server.';
  }
  if (status === 409) {
    return 'A record with this information already exists.';
  }
  if (status === 429) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (status === 503) {
    return 'Database connection not established. The server is running in waiting mode.';
  }
  if (status >= 500) {
    return 'ERP server encountered an error. Please try again later.';
  }
  if (error?.code === 'ECONNABORTED' || error?.message?.toLowerCase().includes('timeout')) {
    return 'Request timed out. Please check your internet connection.';
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'You are currently offline. Please check your internet connection.';
  }
  if (error?.message === 'Network Error' || !error?.response) {
    return 'Could not connect to the ERP server. Please verify the backend is running and CORS allows this origin.';
  }
  return error?.message || defaultMsg;
};

export default api;
