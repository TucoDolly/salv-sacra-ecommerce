import api from './api';

export const getPedidosAdmin = (params = {}) => api.get('/admin/pedidos', { params });
export const updateStatusPedidoAdmin = (id, status) => api.patch(`/admin/pedidos/${id}/status`, { status });
export const getPedidoAdmin = (id) => api.get(`/pedidos/${id}`);
