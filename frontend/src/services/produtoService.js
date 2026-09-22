import api from './api';

/**
 * Retorna todos os produtos com categoria, devoção e variações.
 */
export const getProdutos = () => api.get('/produtos');

/**
 * Retorna um produto específico pelo ID.
 * @param {number|string} id
 */
export const getProduto = (id) => api.get(`/produtos/${id}`);

/**
 * Cria um novo produto (com variações incluídas no payload).
 * @param {object} data
 */
export const createProduto = (data) => api.post('/produtos', data);

/**
 * Atualiza um produto existente.
 * @param {number|string} id
 * @param {object} data
 */
export const updateProduto = (id, data) => api.put(`/produtos/${id}`, data);

/**
 * Remove um produto pelo ID.
 * @param {number|string} id
 */
export const deleteProduto = (id) => api.delete(`/produtos/${id}`);

// ── Dados de referência para selects ─────────────────────────────────────────

/**
 * Retorna todas as categorias (id, nome) para popular selects.
 */
export const getCategorias = () => api.get('/categorias');

/**
 * Retorna todas as devoções (id, nome) para popular selects.
 */
export const getDevocaos = () => api.get('/devocaos');

