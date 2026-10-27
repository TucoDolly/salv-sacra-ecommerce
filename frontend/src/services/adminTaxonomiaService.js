import api from './api';

// kind: 'categorias' | 'devocaos'
export const listarTaxonomia = (kind) => api.get(`/${kind}`);
export const criarTaxonomia = (kind, nome) => api.post(`/${kind}`, { nome });
export const atualizarTaxonomia = (kind, id, nome) => api.put(`/${kind}/${id}`, { nome });
export const excluirTaxonomia = (kind, id) => api.delete(`/${kind}/${id}`);
