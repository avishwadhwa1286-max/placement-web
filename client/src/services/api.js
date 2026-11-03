import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });
api.interceptors.request.use(config => { const token = localStorage.getItem('placement-token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 && !['/auth/login', '/auth/register'].includes(error.config?.url)) window.dispatchEvent(new Event('placement:unauthorized'));
  return Promise.reject(error);
});
export const messageFrom = error => error.response?.data?.message || 'Something went wrong. Please try again.';
export default api;
