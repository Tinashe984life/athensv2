import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Helper functions
export const auth = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  
  register: (userData) => 
    api.post('/auth/register', userData),
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },
};

export const health = {
  check: () => api.get('/health'),
};

// NEW: Athlete and Team services
export const athletes = {
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/athletes${queryParams ? `?${queryParams}` : ''}`);
  },
  getById: (athleteId) => api.get(`/athletes/${athleteId}`),
  create: (athleteData) => api.post('/athletes', athleteData),
  update: (athleteId, athleteData) => api.put(`/athletes/${athleteId}`, athleteData),
  delete: (athleteId) => api.delete(`/athletes/${athleteId}`),
  search: (query, teamId = '') => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (teamId) params.append('team_id', teamId);
    return api.get(`/athletes/search?${params.toString()}`);
  }
};

export const teams = {
  getAll: () => api.get('/teams'),
  getById: (teamId) => api.get(`/teams/${teamId}`),
  create: (teamData) => api.post('/teams', teamData),
  update: (teamId, teamData) => api.put(`/teams/${teamId}`, teamData)
};