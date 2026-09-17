import api from './api';

/**
 * Registra um novo usuário.
 * @param {{ name: string, email: string, password: string, password_confirmation: string }} data
 */
export const register = (data) => api.post('/auth/register', data);

/**
 * Autentica o usuário com email e senha.
 * @param {{ email: string, password: string }} data
 */
export const login = (data) => api.post('/auth/login', data);

/**
 * Revoga o token atual (requer autenticação).
 */
export const logout = () => api.post('/auth/logout');

/**
 * Retorna os dados do usuário autenticado (requer autenticação).
 */
export const getMe = () => api.get('/auth/me');
