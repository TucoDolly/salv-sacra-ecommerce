import api from './api';

export const getConfiguracoesAdmin = () =>
  api.get('/admin/configuracoes');

export const updateConfiguracoesAdmin = (dados) =>
  api.put('/admin/configuracoes', dados);

export const getConfiguracoesPublicas = () =>
  api.get('/configuracoes');
