import api from './api';

export const getPedidosAdmin = (params = {}) => api.get('/admin/pedidos', { params });
export const updateStatusPedidoAdmin = (id, status, codigo_rastreio) =>
  api.patch(`/admin/pedidos/${id}/status`, {
    ...(status !== undefined ? { status } : {}),
    ...(codigo_rastreio !== undefined ? { codigo_rastreio } : {}),
  });
export const getPedidoAdmin = (id) => api.get(`/pedidos/${id}`);
export const enviarMelhorEnvioAdmin = (id, payload = {}) => api.post(`/admin/pedidos/${id}/melhor-envio/enviar`, payload);
export const consultarRastreioAdmin = (id) => api.post(`/admin/pedidos/${id}/rastreio/consultar`);
export const sincronizarTodosRastreiosAdmin = () => api.post('/admin/pedidos/rastreio/sincronizar-todos');
export const excluirPedidoAdmin = (id) => api.delete(`/pedidos/${id}`);
