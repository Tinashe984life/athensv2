import api from './api';

export const users = {
  uploadAvatar: (userId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/users/${userId}/avatar`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteAvatar: (userId) => api.delete(`/users/${userId}/avatar`),
};
