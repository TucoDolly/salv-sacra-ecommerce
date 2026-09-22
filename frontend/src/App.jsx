import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProdutosList from './pages/admin/ProdutosList';
import ProdutoForm from './pages/admin/ProdutoForm';
import './App.css';

/**
 * Redireciona / para o destino certo conforme o estado de autenticação.
 * Aguarda o loading do AuthContext para não redirecionar antes de saber o estado.
 */
function HomeRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={isAuthenticated ? '/admin/produtos' : '/login'} replace />;
}

function App() {
  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Rota raiz — redireciona para o destino correto */}
      <Route path="/" element={<HomeRedirect />} />

      {/* ── UC03 — Admin: Produtos ── */}
      <Route
        path="/admin/produtos"
        element={
          <ProtectedRoute>
            <ProdutosList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/produtos/novo"
        element={
          <ProtectedRoute>
            <ProdutoForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/produtos/editar/:id"
        element={
          <ProtectedRoute>
            <ProdutoForm />
          </ProtectedRoute>
        }
      />

      {/* Qualquer outra rota redireciona para home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

