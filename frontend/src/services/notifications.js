import api from './api';

export const notifications = {
  getAll: () => api.get('/dashboard/notifications'),
};
