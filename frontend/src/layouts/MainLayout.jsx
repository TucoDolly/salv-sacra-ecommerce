import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { useWishlist } from "../contexts/WishlistContext";
import { obterResumoConta } from "../services/contaService";
import CarrinhoDrawer from "../components/CarrinhoDrawer";
import logoImg from "../assets/logo.webp";
import "./MainLayout.css";

/* ── SVG icons inline ────────────────────────────────────── */
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconHeart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const IconCart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);
const IconInstagram = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block' }}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);
const IconWhatsapp = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);
const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.67a16 16 0 0 0 6.06 6.06l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const IconMapPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

/* ── Header ─────────────────────────────────────────────── */
function SiteHeader({ configs }) {
  const { totalItens, openCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { totalFavoritos } = useWishlist();
  const [termoBusca, setTermoBusca] = useState('');
  const [modalFavoritosLogin, setModalFavoritosLogin] = useState(false);
  const [pedidosPendentesCount, setPedidosPendentesCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setPedidosPendentesCount(0);
      return;
    }

    const verificarPendentes = () => {
      obterResumoConta()
        .then(({ data }) => {
          setPedidosPendentesCount(Number(data?.pedidos_pendentes || 0));
        })
        .catch(() => {});
    };

    verificarPendentes();
    window.addEventListener('salv-pedidos-atualizados', verificarPendentes);
    return () => window.removeEventListener('salv-pedidos-atualizados', verificarPendentes);
  }, [isAuthenticated, location.pathname]);

  const logoDestino = isAuthenticated && user?.papel === 'admin' ? '/admin' : '/';

  const handleBuscar = (e) => {
    e.preventDefault();
    if (termoBusca.trim()) {
      navigate(`/produtos?busca=${encodeURIComponent(termoBusca.trim())}`);
    }
  };

  const handleFavoritosClick = (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      navigate('/minha-conta?aba=favoritos');
    } else {
      setModalFavoritosLogin(true);
    }
  };

  const exibirBanner = configs.aviso_topo_ativo !== '0';
  const textoBanner = configs.aviso_topo_texto || '✦ SALV SACRA — VISTA A SUA FÉ COM ELEGÂNCIA E PROPÓSITO ✦';

  return (
    <header>
      {/* Topbar dinâmico */}
      {exibirBanner && (
        <div className="topbar">
          {textoBanner}
        </div>
      )}

      {/* Logo + Busca + Ações */}
      <div className="site-header">
        <div className="header-inner">
          <Link to={logoDestino} className="header-logo" title={isAuthenticated && user?.papel === 'admin' ? 'Ir para o Painel do Administrador' : 'Ir para o Início'}>
            <img src={logoImg} alt={configs.nome_loja || "Salv Sacra"} className="logo-img" />
          </Link>

          <form onSubmit={handleBuscar} className="header-search">
            <input
              type="search"
              placeholder="O que você está buscando?"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
            />
            <button type="submit" aria-label="Buscar">
              <IconSearch />
            </button>
          </form>

          <nav className="header-actions">
            <button
              type="button"
              onClick={handleFavoritosClick}
              className="header-action-item"
              title="Favoritos"
            >
              <IconHeart /> Favoritos
            </button>
            <Link
              to={isAuthenticated ? (pedidosPendentesCount > 0 ? '/minha-conta?aba=pedidos' : '/minha-conta') : '/login'}
              className="header-action-item"
              style={{ position: 'relative' }}
              title={pedidosPendentesCount > 0 ? 'Você possui um pedido pendente aguardando pagamento!' : 'Minha conta'}
            >
              <IconUser /> Minha conta
              {isAuthenticated && pedidosPendentesCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '12px',
                    background: '#dc2626',
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    boxShadow: '0 2px 6px rgba(220,38,38,0.45)',
                    lineHeight: '14px',
                  }}
                >
                  !
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={openCart}
              className="header-action-item"
              style={{ position: 'relative' }}
            >
              <IconCart /> Meu carrinho
              {totalItens > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '12px',
                    background: '#c4953a',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                  }}
                >
                  {totalItens}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Navbar com Dropdowns Fiéis às Imagens 3, 4 e 5 */}
      <nav className="site-navbar">
        <div className="navbar-inner">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Início
          </NavLink>

          {/* Camisetas: link normal */}
          <Link
            to="/produtos?categoria=camisetas"
            className={`nav-link ${
              location.pathname === '/produtos' && location.search.includes('categoria=camisetas')
                ? 'active'
                : ''
            }`}
          >
            Camisetas
          </Link>

          <Link to="/guia-de-medidas" className={`nav-link ${location.pathname === '/guia-de-medidas' ? 'active' : ''}`}>Guia de medidas</Link>
          <Link to="/contato" className={`nav-link ${location.pathname === '/contato' ? 'active' : ''}`}>Contato</Link>
        </div>
      </nav>

      {/* Modal de Aviso de Login para Favoritos */}
      {modalFavoritosLogin && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setModalFavoritosLogin(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '430px',
              width: '100%',
              padding: '28px 24px',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35)',
              textAlign: 'center',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '26px',
              }}
            >
              ❤️
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e1e1e', margin: '0 0 12px' }}>
              Lista de Favoritos
            </h3>

            <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 22px' }}>
              Você deve realizar login para favoritar os produtos.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setModalFavoritosLogin(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#374151',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <Link
                to="/login?redirect=%2Fminha-conta%3Faba%3Dfavoritos"
                onClick={() => {
                  sessionStorage.setItem('salv_redirect_after_auth', '/minha-conta?aba=favoritos');
                  setModalFavoritosLogin(false);
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '6px',
                  background: '#1e1e1e',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Fazer login
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ── Footer ─────────────────────────────────────────────── */
const PAYMENT_METHODS = [
  "Visa", "Master", "Amex", "Diners", "Elo", "Hiper", "Discover", "Pix"
];

function SiteFooter({ configs }) {
  const whatsNumero = (configs.contato_whatsapp || '5548996205153').replace(/\D/g, '');
  const whatsUrl = `https://wa.me/${whatsNumero}`;

  return (
    <footer className="site-footer">
      {/* Colunas */}
      <div className="footer-columns">
        {/* Quem somos */}
        <div className="footer-col">
          <h4>Quem somos</h4>
          <Link to="/quem-somos">Salv Sacra</Link>
        </div>

        {/* Institucional */}
        <div className="footer-col">
          <h4>Institucional</h4>
          <Link to="/termos-de-uso">Termos de uso</Link>
          <Link to="/politica-de-privacidade">Política de privacidade</Link>
        </div>

        {/* Contato */}
        <div className="footer-col">
          <h4>Entre em contato</h4>
          <div className="contact-item">
            <IconWhatsapp />
            <a href={whatsUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
              {configs.contato_whatsapp || '5548996205153'}
            </a>
          </div>
          <div className="contact-item">
            <IconPhone />
            <span>{configs.contato_telefone || '(48) 99620-5153'}</span>
          </div>
          <div className="contact-item">
            <IconMail />
            <a href={`mailto:${configs.contato_email || 'salvsacra2@gmail.com'}`}>{configs.contato_email || 'salvsacra2@gmail.com'}</a>
          </div>
        </div>

        {/* Nossa Localização */}
        <div className="footer-col">
          <h4>Nossa Localização</h4>
          <div className="contact-item" style={{ marginLeft: '-14px' }}>
            <IconMapPin />
            <div>
              {configs.contato_endereco && configs.contato_endereco.includes(' - ') ? (
                <>
                  <span style={{ display: 'block', color: '#333', fontSize: '13px', lineHeight: 1.4 }}>
                    {configs.contato_endereco.split(' - ')[0]}
                  </span>
                  <span style={{ display: 'block', color: '#333', fontSize: '13px', lineHeight: 1.4, marginTop: '3px' }}>
                    {configs.contato_endereco.split(' - ').slice(1).join(' - ')}
                  </span>
                </>
              ) : (
                <>
                  <span style={{ display: 'block', color: '#333', fontSize: '13px', lineHeight: 1.4 }}>
                    {configs.contato_endereco || 'Rua Manoel Antunes Corrêa, 2171'}
                  </span>
                  {!configs.contato_endereco?.toLowerCase().includes('tubarão') && (
                    <span style={{ display: 'block', color: '#333', fontSize: '13px', lineHeight: 1.4, marginTop: '3px' }}>
                      Bairro Oficinas · Tubarão - SC
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Meios de pagamento */}
      <div className="footer-payment">
        <span className="footer-payment-label">Meios de pagamento</span>
        <div className="payment-icons">
          {PAYMENT_METHODS.map((m) => (
            <span key={m} className="payment-badge">{m}</span>
          ))}
        </div>
        <div className="safe-badge">
          🛡️<br />Google<br />Safe Browsing<br />
          <small>SITE 100% SEGURO</small>
        </div>
      </div>

      {/* Copyright */}
      <div className="footer-copyright">
        <p>
          Copyright <a href="#">{configs.nome_loja || 'SALV SACRA'}</a> · {new Date().getFullYear()}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}

/* ── Layout principal ───────────────────────────────────── */
export default function MainLayout({ children, breadcrumbs }) {
  const [configs, setConfigs] = useState({});

  useEffect(() => {
    fetch('/api/configuracoes')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          setConfigs(data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <SiteHeader configs={configs} />

      <main className="main-content">
        {/* Breadcrumb */}
        {breadcrumbs && (
          <div className="breadcrumb-bar">
            <nav className="breadcrumb" aria-label="Navegação estrutural">
              {breadcrumbs.map((crumb, i) => (
                <span key={i}>
                  {i > 0 && <span className="breadcrumb-sep"> &gt; </span>}
                  {crumb.to
                    ? <Link to={crumb.to} className="breadcrumb-link">{crumb.label}</Link>
                    : <span className="breadcrumb-current">{crumb.label}</span>
                  }
                </span>
              ))}
            </nav>
          </div>
        )}

        {children}
      </main>

      <SiteFooter configs={configs} />

      {/* Gaveta lateral do Carrinho de Compras */}
      <CarrinhoDrawer />
    </div>
  );
}
