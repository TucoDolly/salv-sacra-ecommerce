import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
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

      {/* ── Painel Administrativo (layout compartilhado) ── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* /admin → redireciona para /admin/produtos por enquanto */}
        <Route index element={<Navigate to="/admin/produtos" replace />} />

        {/* UC03 — Produtos */}
        <Route path="produtos"            element={<ProdutosList />} />
        <Route path="produtos/novo"       element={<ProdutoForm />} />
        <Route path="produtos/editar/:id" element={<ProdutoForm />} />
      </Route>

      {/* Qualquer outra rota redireciona para home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
