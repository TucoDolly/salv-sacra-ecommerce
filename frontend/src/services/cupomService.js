import api from './api';

export const listarCuponsDisponiveis = () => api.get('/cupons/disponiveis');

export const listarCuponsAdmin = () => api.get('/admin/cupons');
export const criarCupom = (dados) => api.post('/admin/cupons', dados);
export const atualizarCupom = (id, dados) => api.put(`/admin/cupons/${id}`, dados);
export const removerCupom = (id) => api.delete(`/admin/cupons/${id}`);

