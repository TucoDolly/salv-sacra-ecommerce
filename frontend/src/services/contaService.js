import api from './api';

export const obterResumoConta = () => api.get('/conta/resumo');
export const atualizarPerfil = (data) => api.put('/conta/perfil', data);
export const alterarSenha = (data) => api.put('/conta/senha', data);
export const listarPedidos = () => api.get('/conta/pedidos');
export const listarEnderecos = () => api.get('/conta/enderecos');
export const obterUltimoEndereco = () => api.get('/conta/ultimo-endereco');
export const criarEndereco = (data) => api.post('/conta/enderecos', data);
export const atualizarEndereco = (id, data) => api.put(`/conta/enderecos/${id}`, data);
export const removerEndereco = (id) => api.delete(`/conta/enderecos/${id}`);
export const listarCartoes = () => api.get('/conta/cartoes');
export const criarCartao = (data) => api.post('/conta/cartoes', data);
export const removerCartao = (id) => api.delete(`/conta/cartoes/${id}`);
export const listarFavoritos = () => api.get('/conta/favoritos');
export const toggleFavoritoApi = (produtoId) => api.post(`/conta/favoritos/${produtoId}`);
export const sincronizarFavoritosApi = (produtoIds) => api.post('/conta/favoritos/sincronizar', { produto_ids: produtoIds });
export const excluirConta = () => api.delete('/conta/excluir');
