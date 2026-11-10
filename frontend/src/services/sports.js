import api from './api';

export const sports = {
  // Sports catalog
  getAll: () => api.get('/sports/'),
  create: (data) => api.post('/sports/', data),
  update: (sportId, data) => api.put(`/sports/${sportId}`, data),
  remove: (sportId) => api.delete(`/sports/${sportId}`),

  // Metrics
  addMetric: (sportId, data) => api.post(`/sports/${sportId}/metrics`, data),
  updateMetric: (metricId, data) => api.put(`/sports/metrics/${metricId}`, data),
  removeMetric: (metricId) => api.delete(`/sports/metrics/${metricId}`),

  // Metric records
  logRecords: (data) => api.post('/sports/records', data),
  getRecords: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    ).toString();
    return api.get(`/sports/records${query ? `?${query}` : ''}`);
  },
  getAthleteSummary: (athleteId) => api.get(`/sports/records/summary/${athleteId}`),
};
