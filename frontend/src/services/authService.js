import api from './api';

/**
 * Inicia o registro do novo usuário (envia link de validação).
 * @param {{ name: string, email: string, password: string, password_confirmation: string, recaptcha: string }} data
 */
export const register = (data) => api.post('/auth/register', data);

/**
 * Valida o e-mail do usuário com o token recebido e ativa a conta.
 * @param {{ email: string, token: string }} data
 */
export const verificarEmail = (data) => api.post('/auth/verificar-email', data);

/**
 * Reenvia o e-mail com link de validação.
 * @param {{ email: string }} data
 */
export const reenviarValidacao = (data) => api.post('/auth/reenviar-validacao', data);

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
