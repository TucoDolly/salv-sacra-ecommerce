import api from './api';

export const getEstoqueAdmin = (params = {}) =>
  api.get('/admin/estoque', { params });

export const updateEstoqueVariacao = (variacaoId, estoque) =>
  api.patch(`/admin/estoque/${variacaoId}`, { estoque });
