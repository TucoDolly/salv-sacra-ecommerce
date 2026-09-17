import axios from 'axios';

/**
 * Instância base do axios configurada para a API do back-end.
 * O token Bearer é injetado automaticamente via interceptor
 * caso exista um token salvo no localStorage.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Injeta o token em todas as requisições quando disponível
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sanctum_token');
  if (token) {
    config.headers.Authorization = Bearer ;
  }
  return config;
});

export default api;
