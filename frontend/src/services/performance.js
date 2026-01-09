import api from './api';

export const performance = {
  // Create performance test
  createTest: (data) => api.post('/performance/', data),

  // Get performance tests
  getTests: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/performance/${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get specific performance test
  getTest: (testId) => api.get(`/performance/${testId}`),

  // Update performance test
  updateTest: (testId, data) => api.put(`/performance/${testId}`, data),

  // Delete performance test
  deleteTest: (testId) => api.delete(`/performance/${testId}`),

  // Get performance statistics
  getStats: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/performance/stats${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get athlete performance summary
  getAthleteSummary: (athleteId) => api.get(`/performance/athlete-summary/${athleteId}`)
};