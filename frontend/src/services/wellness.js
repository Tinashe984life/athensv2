import api from './api';

export const wellness = {
  // Submit daily wellness check
  submitDailyCheck: (data) => api.post('/wellness/', data),

  // Get wellness entries
  getEntries: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/wellness/${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get today's wellness entry
  getToday: () => api.get('/wellness/today'),

  // Get specific wellness entry
  getEntry: (entryId) => api.get(`/wellness/${entryId}`),

  // Update wellness entry
  updateEntry: (entryId, data) => api.put(`/wellness/${entryId}`, data),

  // Get wellness statistics
  getStats: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/wellness/stats${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get team wellness overview (for coaches)
  getTeamOverview: (teamId = '') => {
    const params = new URLSearchParams();
    if (teamId) params.append('team_id', teamId);
    return api.get(`/wellness/team-overview?${params.toString()}`);
  }
};