import api from './api';

export const admin = {
  getUsers: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await api.get(`/admin/users${queryParams ? `?${queryParams}` : ''}`);
      return response.data;
    } catch (error) {
      console.error('Error getting users:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to get users' };
    }
  },

  createUser: async (userData) => {
    try {
      const response = await api.post('/admin/users', userData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to create user' };
    }
  },

  updateUser: async (userId, userData) => {
    try {
      const response = await api.put(`/admin/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to update user' };
    }
  },

  deleteUser: async (userId) => {
    try {
      const response = await api.delete(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to delete user' };
    }
  },

  getReports: async () => {
    try {
      const response = await api.get('/admin/reports/summary');
      return response.data;
    } catch (error) {
      console.error('Error getting reports:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to get reports' };
    }
  },

  exportCsv: async (exportType) => {
    try {
      const response = await api.get(`/admin/export/csv`, {
        params: { type: exportType },
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error exporting CSV:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to export CSV' };
    }
  },

  downloadDatabase: async () => {
    try {
      const response = await api.get('/admin/download/db', {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error downloading database:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to download database' };
    }
  },

  getSystemHealth: async () => {
    try {
      const response = await api.get('/admin/system/health');
      return response.data;
    } catch (error) {
      console.error('Error getting system health:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to get system health' };
    }
  },

  getBackups: async () => {
    try {
      const response = await api.get('/admin/backups');
      return response.data;
    } catch (error) {
      console.error('Error listing backups:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to list backups' };
    }
  },

  createBackup: async () => {
    try {
      const response = await api.post('/admin/backups');
      return response.data;
    } catch (error) {
      console.error('Error creating backup:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to create backup' };
    }
  },

  downloadBackup: async (filename) => {
    try {
      const response = await api.get(`/admin/backups/${encodeURIComponent(filename)}/download`, {
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error downloading backup:', error);
      return { success: false, message: error.response?.data?.message || 'Failed to download backup' };
    }
  }
};
