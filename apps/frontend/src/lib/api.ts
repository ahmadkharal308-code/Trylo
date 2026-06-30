import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

// Attach JWT from localStorage to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('trylo_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// --- Auth ---
export const register = (body: { email: string; password: string; fullName?: string }) =>
  api.post('/auth/register', body).then((r) => r.data);

export const login = (identifier: string, password: string) =>
  api.post('/auth/login', { identifier, password }).then((r) => r.data);

export const getMe = () => api.get('/auth/me').then((r) => r.data);

// --- Search ---
export const search = (q: string, department?: string) =>
  api.get('/search', { params: { q, department, limit: 20 } }).then((r) => r.data);

export const getTaxonomy = (department?: string) =>
  api.get('/search/taxonomy', { params: { department } }).then((r) => r.data);

// --- Sessions / Swipe ---
export const createSession = (department: string) =>
  api.post('/sessions', { department }).then((r) => r.data);

export const getNextCard = (sessionId: string) =>
  api.get(`/sessions/${sessionId}/next`).then((r) => r.data);

export const recordSwipe = (sessionId: string, productId: string, direction: 'LEFT' | 'RIGHT' | 'UP') =>
  api.post(`/sessions/${sessionId}/swipe`, { productId, direction }).then((r) => r.data);

export const skipSwiping = (sessionId: string) =>
  api.post(`/sessions/${sessionId}/skip`).then((r) => r.data);

export const getResults = (sessionId: string) =>
  api.get(`/sessions/${sessionId}/results`).then((r) => r.data);

// --- Products ---
export const getProduct = (id: string) =>
  api.get(`/products/${id}`).then((r) => r.data);

export const browseProducts = (params: Record<string, unknown>) =>
  api.get('/products', { params }).then((r) => r.data);

// --- Recommendations ---
export const getFeed = (department: string) =>
  api.get('/recommendations', { params: { department } }).then((r) => r.data);
