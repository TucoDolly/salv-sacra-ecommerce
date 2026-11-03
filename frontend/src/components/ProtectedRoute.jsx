import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Componente de rota protegida com suporte a controle de acesso por papel (role).
 * - Enquanto o AuthContext ainda está verificando o token (loading = true), retorna null.
 * - Se não estiver autenticado, redireciona para /login preservando a rota de destino.
 * - Se requiredRole for fornecido (ex: 'admin') e o usuário não possuir essa role,
 *   redireciona para o login administrativo (/login?admin=1) com a rota salva.
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Aguarda a hidratação do contexto antes de decidir
  if (loading) return null;

  if (!isAuthenticated) {
    const destino = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${destino}`} replace />;
  }

  if (requiredRole && user?.papel !== requiredRole) {
    const destino = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?admin=1&redirect=${destino}`} replace />;
  }

  return children;
}
