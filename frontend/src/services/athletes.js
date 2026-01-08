import api from './api';

export const athletes = {
  // Get all athletes (filtered by user role)
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/athletes${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get specific athlete
  getById: (athleteId) => api.get(`/athletes/${athleteId}`),

  // Create new athlete
  create: (athleteData) => api.post('/athletes', athleteData),

  // Update athlete
  update: (athleteId, athleteData) => api.put(`/athletes/${athleteId}`, athleteData),

  // Delete athlete
  delete: (athleteId) => api.delete(`/athletes/${athleteId}`),

  // Search athletes
  search: (query, teamId = '') => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (teamId) params.append('team_id', teamId);
    return api.get(`/athletes/search?${params.toString()}`);
  }
};

export const teams = {
  // Get all teams
  getAll: () => api.get('/teams'),

  // Get specific team
  getById: (teamId) => api.get(`/teams/${teamId}`),

  // Create new team
  create: (teamData) => api.post('/teams', teamData),

  // Update team
  update: (teamId, teamData) => api.put(`/teams/${teamId}`, teamData)
};