import api from './api';

export const workload = {
  // Workload Sessions
  createWorkloadSession: async (sessionData) => {
    try {
      const response = await api.post('/workload/sessions', sessionData);
      return response.data;
    } catch (error) {
      console.error('Error creating workload session:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to create workload session' };
    }
  },

  getWorkloadSession: async (sessionId) => {
    try {
      const response = await api.get(`/workload/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting workload session:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to get workload session' };
    }
  },

  getAthleteWorkloadSessions: async (athleteId, filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/workload/sessions/athlete/${athleteId}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error getting athlete workload sessions:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to get athlete workload sessions' };
    }
  },

  updateWorkloadSession: async (sessionId, sessionData) => {
    try {
      const response = await api.put(`/workload/sessions/${sessionId}`, sessionData);
      return response.data;
    } catch (error) {
      console.error('Error updating workload session:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to update workload session' };
    }
  },

  deleteWorkloadSession: async (sessionId) => {
    try {
      const response = await api.delete(`/workload/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting workload session:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to delete workload session' };
    }
  },

  // ACWR Calculations
  calculateACWR: async (athleteId, date = null) => {
    try {
      const params = date ? `?date=${date}` : '';
      const response = await api.get(`/workload/acwr/${athleteId}${params}`);
      return response.data;
    } catch (error) {
      console.error('Error calculating ACWR:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to calculate ACWR' };
    }
  },

  calculateTeamACWR: async (teamId, date = null) => {
    try {
      const params = date ? `?date=${date}` : '';
      const response = await api.get(`/workload/team-acwr/${teamId}${params}`);
      return response.data;
    } catch (error) {
      console.error('Error calculating team ACWR:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to calculate team ACWR' };
    }
  },

  // Workload Trends
  getWorkloadTrends: async (athleteId, filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/workload/workload-trends/${athleteId}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error getting workload trends:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to get workload trends' };
    }
  }
};