import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Componente de rota protegida.
 * Redireciona para /login se o usuário não estiver autenticado.
 * Exibe um loading enquanto verifica a sessão existente.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <p>Carregando...</p>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
