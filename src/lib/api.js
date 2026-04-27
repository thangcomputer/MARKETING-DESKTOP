import axios from 'axios';

// Use production API url from environment if set, otherwise fallback to local dev server
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3777';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach JWT token for authenticated routes
api.interceptors.request.use(
  (config) => {
    // We would normally read this from electron-store or localStorage
    const token = localStorage.getItem('omni_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle global errors (like 401 unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Logic to handle auto-logout, token expiry, etc.
      console.warn("Unauthorized access - token may be expired.");
    }
    return Promise.reject(error);
  }
);
