import api from './api';

export const getPedidosAdmin = (params = {}) => api.get('/admin/pedidos', { params });
export const updateStatusPedidoAdmin = (id, status, codigo_rastreio) =>
  api.patch(`/admin/pedidos/${id}/status`, {
    ...(status !== undefined ? { status } : {}),
    ...(codigo_rastreio !== undefined ? { codigo_rastreio } : {}),
  });
export const getPedidoAdmin = (id) => api.get(`/pedidos/${id}`);
