import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, login as loginService, logout as logoutService, register as registerService } from '../services/authService';

const TOKEN_KEY = 'sanctum_token';

const AuthContext = createContext(null);

/**
 * Provedor de autenticação.
 * Gerencia o token no localStorage e o estado do usuário logado.
 */
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true enquanto verifica sessão existente

  // Ao montar, verifica se já existe um token salvo e busca os dados do usuário
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    getMe()
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (credentials) => {
    const { data } = await loginService(credentials);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data;
  }, []);

  const signUp = useCallback(async (userData) => {
    const { data } = await registerService(userData);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutService();
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, isAuthenticated: !!user }),
    [user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para consumir o contexto de autenticação.
 * Deve ser utilizado dentro de <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
