import api from './api';

export const getRelatoriosAdmin = (params = {}) =>
  api.get('/admin/relatorios', { params });
