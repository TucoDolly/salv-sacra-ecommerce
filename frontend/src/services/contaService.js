import api from './api';

export const atualizarPerfil = (data) => api.put('/conta/perfil', data);
export const alterarSenha = (data) => api.put('/conta/senha', data);
export const listarPedidos = () => api.get('/conta/pedidos');
export const listarEnderecos = () => api.get('/conta/enderecos');
export const criarEndereco = (data) => api.post('/conta/enderecos', data);
export const atualizarEndereco = (id, data) => api.put(`/conta/enderecos/${id}`, data);
export const removerEndereco = (id) => api.delete(`/conta/enderecos/${id}`);
export const listarCartoes = () => api.get('/conta/cartoes');
export const criarCartao = (data) => api.post('/conta/cartoes', data);
export const removerCartao = (id) => api.delete(`/conta/cartoes/${id}`);
