import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import PublicLayout from './components/PublicLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Home from './pages/public/Home';
import ProdutosList from './pages/admin/ProdutosList';
import ProdutoForm from './pages/admin/ProdutoForm';
import './App.css';

/**
 * Redireciona a rota `/admin` para o destino correto:
 * - Admin autenticado → /admin/produtos
 * - Qualquer outro → / (vitrine)
 * Aguarda o loading do AuthContext para não redirecionar antes de saber o estado.
 */
function AdminRedirect() {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated && user?.papel === 'admin') {
    return <Navigate to="/admin/produtos" replace />;
  }
  return <Navigate to="/" replace />;
}

function App() {
  return (
    <Routes>
      {/* ── Vitrine Pública ── */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
      </Route>

      {/* ── Autenticação ── */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* ── Painel Administrativo (layout compartilhado) ── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* /admin → redireciona para /admin/produtos */}
        <Route index element={<AdminRedirect />} />

        {/* UC03 — Produtos */}
        <Route path="produtos"            element={<ProdutosList />} />
        <Route path="produtos/novo"       element={<ProdutoForm />} />
        <Route path="produtos/editar/:id" element={<ProdutoForm />} />
      </Route>

      {/* Qualquer rota não mapeada → vitrine */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
