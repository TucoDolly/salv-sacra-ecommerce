import api from './api';

// ── Cliente ─────────────────────────────────────────────────────────────
export const obterNotificacoesCliente = () => api.get('/notificacoes');

export const marcarNotificacaoLidaCliente = (id) =>
  api.patch(`/notificacoes/${id}/lida`);

export const marcarTodasLidasCliente = () =>
  api.patch('/notificacoes/marcar-todas-lidas');

export const removerNotificacaoCliente = (id) =>
  api.delete(`/notificacoes/${id}`);

export const limparTodasCliente = () =>
  api.delete('/notificacoes/limpar-todas');

// ── Admin ───────────────────────────────────────────────────────────────
export const obterNotificacoesAdmin = () => api.get('/admin/notificacoes');

export const obterContadoresAdmin = () => api.get('/admin/contadores');

export const marcarNotificacaoLidaAdmin = (id) =>
  api.patch(`/admin/notificacoes/${id}/lida`);

export const marcarTodasLidasAdmin = () =>
  api.patch('/admin/notificacoes/marcar-todas-lidas');

export const removerNotificacaoAdmin = (id) =>
  api.delete(`/admin/notificacoes/${id}`);

export const limparTodasAdmin = () =>
  api.delete('/admin/notificacoes/limpar-todas');

