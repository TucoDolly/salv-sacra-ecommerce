import api from './api';

export const listarCuponsDisponiveis = () => api.get('/cupons/disponiveis');
export const validarBeneficiosCheckout = (payload) => api.post('/cupons/validar', payload);
export const listarMeusVales = () => api.get('/conta/vales-compra');

export const listarCuponsAdmin = (params = {}) => api.get('/admin/cupons', { params });
export const listarCuponsPromocionaisAdmin = (params = {}) => api.get('/admin/cupons/promocionais', { params });
export const listarValesCompraAdmin = (params = {}) => api.get('/admin/vales-compra', { params });

export const criarCupom = (dados) => api.post('/admin/cupons', dados);
export const atualizarCupom = (id, dados) => api.put(`/admin/cupons/${id}`, dados);
export const removerCupom = (id) => api.delete(`/admin/cupons/${id}`);

export const criarCupomAdmin = criarCupom;
export const atualizarCupomAdmin = atualizarCupom;
export const excluirCupomAdmin = removerCupom;

export const criarValeCompraAdmin = (dados) => api.post('/admin/vales-compra', dados);
export const atualizarValeCompraAdmin = (id, dados) => api.put(`/admin/vales-compra/${id}`, dados);

export const obterHistoricoCupomAdmin = (id) => api.get(`/admin/cupons/${id}/historico`);
export const bloquearCupomAdmin = (id, motivo) => api.post(`/admin/cupons/${id}/bloquear`, { motivo });
export const revogarCupomAdmin = (id, motivo) => api.post(`/admin/cupons/${id}/revogar`, { motivo });
export const desbloquearCupomAdmin = (id, observacao) => api.post(`/admin/cupons/${id}/desbloquear`, { observacao });


