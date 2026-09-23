import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.webp';
import '../styles/admin-layout.css';

// ── Ícones SVG inline ──────────────────────────────────────────────────────
const IconHome = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
);

const IconOrders = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

const IconCatalog = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const IconStock = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const IconReports = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
  </svg>
);

const IconSettings = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const IconSearch = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

// ── Links de navegação ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Início',                  to: '/admin',          icon: <IconHome />,     end: true  },
  { label: 'Pedidos e Pagamentos',    to: '/admin/pedidos',  icon: <IconOrders />,   end: false },
  { label: 'Catálogo de Produtos',    to: '/admin/produtos', icon: <IconCatalog />,  end: false },
  { label: 'Gestão de Estoque',       to: '/admin/estoque',  icon: <IconStock />,    end: false },
  { label: 'Relatórios/Faturamento',  to: '/admin/relatorios',icon: <IconReports />, end: false },
  { label: 'Configurações',           to: '/admin/config',   icon: <IconSettings />, end: false },
];

// ── Inicial do avatar ─────────────────────────────────────────────────────────
function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="al-root">
      {/* ════════════════════════════════════
          SIDEBAR
          ════════════════════════════════════ */}
      <aside className="al-sidebar">

        {/* Logo */}
        <div className="al-logo">
          <img src={logo} alt="Salv Sacra" />
        </div>

        {/* Navegação */}
        <nav className="al-nav" aria-label="Menu principal">
          <div className="al-nav-section">
            {NAV_ITEMS.map(({ label, to, icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `al-nav-link${isActive ? ' active' : ''}`
                }
              >
                {icon}
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Rodapé — botão sair */}
        <div className="al-sidebar-footer">
          <button className="al-nav-link" onClick={handleSignOut} style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sair
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════
          COLUNA DIREITA
          ════════════════════════════════════ */}
      <div className="al-main-col">

        {/* TOP BAR */}
        <header className="al-topbar">

          {/* Busca */}
          <div className="al-search">
            <IconSearch />
            <input
              type="search"
              placeholder="Buscar produtos, pedidos, clientes..."
              aria-label="Buscar"
            />
          </div>

          {/* Perfil */}
          <div className="al-user">
            <div className="al-user-info">
              <span className="al-user-name">{user?.name ?? 'Usuário'}</span>
              <span className="al-user-email">{user?.email ?? ''}</span>
            </div>
            <div className="al-avatar" aria-hidden="true">
              {getInitials(user?.name ?? 'U')}
            </div>
          </div>
        </header>

        {/* CONTEÚDO — renderiza o filho da rota aninhada */}
        <main className="al-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
