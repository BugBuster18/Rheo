/**
 * DropShare Client — Axios API helper
 */
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ds_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-clear token on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ds_token');
      localStorage.removeItem('ds_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
