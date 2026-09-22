import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Componente de rota protegida.
 * - Enquanto o AuthContext ainda está verificando o token no localStorage
 *   (loading = true), retorna null para evitar redirect prematuro para /login.
 * - Após a verificação, redireciona para /login se não autenticado.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  // Aguarda a hidratação do contexto antes de decidir
  if (loading) return null;

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}
