import api from './api';

export const recovery = {
  // Recovery Sessions
  createRecoverySession: async (sessionData) => {
    try {
      const response = await api.post('/recovery/sessions', sessionData);
      return response.data;
    } catch (error) {
      console.error('Error creating recovery session:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to create recovery session' };
    }
  },

  getRecoverySession: async (sessionId) => {
    try {
      const response = await api.get(`/recovery/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting recovery session:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to get recovery session' };
    }
  },

  getAthleteRecoverySessions: async (athleteId, filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/recovery/sessions/athlete/${athleteId}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error getting athlete recovery sessions:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to get athlete recovery sessions' };
    }
  },

  updateRecoverySession: async (sessionId, sessionData) => {
    try {
      const response = await api.put(`/recovery/sessions/${sessionId}`, sessionData);
      return response.data;
    } catch (error) {
      console.error('Error updating recovery session:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to update recovery session' };
    }
  },

  // Prehab Recommendations
  createPrehabRecommendation: async (recommendationData) => {
    try {
      const response = await api.post('/recovery/prehab/recommendations', recommendationData);
      return response.data;
    } catch (error) {
      console.error('Error creating prehab recommendation:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to create prehab recommendation' };
    }
  },

  getPrehabRecommendation: async (recommendationId) => {
    try {
      const response = await api.get(`/recovery/prehab/recommendations/${recommendationId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting prehab recommendation:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to get prehab recommendation' };
    }
  },

  getAthletePrehabRecommendations: async (athleteId, status = null) => {
    try {
      const params = status ? `?status=${status}` : '';
      const response = await api.get(`/recovery/prehab/recommendations/athlete/${athleteId}${params}`);
      return response.data;
    } catch (error) {
      console.error('Error getting athlete prehab recommendations:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to get athlete prehab recommendations' };
    }
  },

  updatePrehabRecommendation: async (recommendationId, recommendationData) => {
    try {
      const response = await api.put(`/recovery/prehab/recommendations/${recommendationId}`, recommendationData);
      return response.data;
    } catch (error) {
      console.error('Error updating prehab recommendation:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to update prehab recommendation' };
    }
  },

  // Exercise Library
  getExerciseLibrary: async () => {
    try {
      const response = await api.get('/recovery/prehab/exercise-library');
      return response.data;
    } catch (error) {
      console.error('Error getting exercise library:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to get exercise library' };
    }
  },

  // Workload-Recovery Balance
  getWorkloadRecoveryBalance: async (athleteId, filters = {}) => {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/recovery/workload-recovery-balance/${athleteId}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error getting workload recovery balance:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to get workload recovery balance' };
    }
  }
};