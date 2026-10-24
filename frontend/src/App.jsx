import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import PublicLayout from './components/PublicLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MinhaContaPage from './pages/MinhaContaPage';
import Home from './pages/public/Home';
import ProdutoDetalhe from './pages/public/ProdutoDetalhe';
import CatalogoPage from './pages/public/CatalogoPage';
import CheckoutPage from './pages/public/CheckoutPage';
import ContatoPage from './pages/public/ContatoPage';
import GuiaMedidasPage from './pages/public/GuiaMedidasPage';
import ProdutosList from './pages/admin/ProdutosList';
import ProdutoForm from './pages/admin/ProdutoForm';
import PedidosList from './pages/admin/PedidosList';
import EstoqueList from './pages/admin/EstoqueList';
import RelatoriosPage from './pages/admin/RelatoriosPage';
import ConfiguracoesPage from './pages/admin/ConfiguracoesPage';
import AdminDashboard from './pages/admin/AdminDashboard';
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
        <Route path="/produtos" element={<CatalogoPage />} />
        <Route path="/produto/:id" element={<ProdutoDetalhe />} />
        <Route path="/contato" element={<ContatoPage />} />
        <Route path="/guia-de-medidas" element={<GuiaMedidasPage />} />
      </Route>

      {/* ── Fluxo de Checkout ── */}
      <Route path="/checkout" element={<CheckoutPage />} />

      {/* ── Autenticação ── */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/minha-conta" element={<MinhaContaPage />} />

      {/* ── Painel Administrativo (layout compartilhado) ── */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* /admin → Início / Dashboard */}
        <Route index element={<AdminDashboard />} />

        {/* UC03 — Produtos */}
        <Route path="produtos"            element={<ProdutosList />} />
        <Route path="produtos/novo"       element={<ProdutoForm />} />
        <Route path="produtos/editar/:id" element={<ProdutoForm />} />

        {/* Gestão de Pedidos e Pagamentos */}
        <Route path="pedidos"             element={<PedidosList />} />

        {/* Gestão de Estoque */}
        <Route path="estoque"             element={<EstoqueList />} />

        {/* Relatórios e Faturamento */}
        <Route path="relatorios"          element={<RelatoriosPage />} />

        {/* Configurações da Loja */}
        <Route path="config"              element={<ConfiguracoesPage />} />
      </Route>

      {/* Qualquer rota não mapeada → vitrine */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
