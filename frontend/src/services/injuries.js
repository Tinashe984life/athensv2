import api from './api';

export const injuries = {
  // Create injury record
  create: (data) => api.post('/injuries/', data),

  // Get injury records
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/injuries/${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get specific injury
  getById: (injuryId) => api.get(`/injuries/${injuryId}`),

  // Update injury
  update: (injuryId, data) => api.put(`/injuries/${injuryId}`, data),

  // Delete injury
  delete: (injuryId) => api.delete(`/injuries/${injuryId}`),

  // Get injury statistics for athlete
  getAthleteStats: (athleteId) => api.get(`/injuries/stats/${athleteId}`),

  // Get team injury statistics
  getTeamStats: (teamId) => api.get(`/injuries/team-stats/${teamId}`)
};