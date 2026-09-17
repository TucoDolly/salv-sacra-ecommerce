import { Link, NavLink } from "react-router-dom";
import logoImg from "../assets/logo.webp";
import "./MainLayout.css";

/* ── SVG icons inline ────────────────────────────────────── */
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconHeadset = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconCart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);
const IconInstagram = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
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
function SiteHeader() {
  return (
    <header>
      {/* Topbar */}
      <div className="topbar">
        ✦ FRETE GRÁTIS PARA COMPRAS ACIMA DE R$500 ✦
      </div>

      {/* Logo + Busca + Ações */}
      <div className="site-header">
        <div className="header-inner">
          <Link to="/" className="header-logo">
            <img src={logoImg} alt="Salv Sacra" className="logo-img" />
          </Link>

          <div className="header-search">
            <input type="search" placeholder="O que você está buscando?" />
            <button type="button" aria-label="Buscar">
              <IconSearch />
            </button>
          </div>

          <nav className="header-actions">
            <a href="#" className="header-action-item">
              <IconHeadset /> Atendimento
            </a>
            <Link to="/login" className="header-action-item">
              <IconUser /> Minha conta
            </Link>
            <a href="#" className="header-action-item">
              <IconCart /> Meu carrinho
            </a>
          </nav>
        </div>
      </div>

      {/* Navbar */}
      <nav className="site-navbar">
        <div className="navbar-inner">
          <NavLink to="/"           className="nav-link">Início</NavLink>
          <NavLink to="/produtos"   className="nav-link">Mais vendidos</NavLink>
          <a href="#"               className="nav-link">Camisetas ▾</a>
          <a href="#"               className="nav-link">Acessórios ▾</a>
          <a href="#"               className="nav-link">Contato</a>
          <a href="#"               className="nav-link">Guia de medidas</a>
        </div>
      </nav>
    </header>
  );
}

/* ── Footer ─────────────────────────────────────────────── */
const PAYMENT_METHODS = [
  "Visa", "Master", "Amex", "Diners", "Elo", "Hiper", "Discover", "Pix"
];

function SiteFooter() {
  return (
    <footer className="site-footer">
      {/* Colunas */}
      <div className="footer-columns">
        {/* Quem somos */}
        <div className="footer-col">
          <h4>Quem somos</h4>
          <a href="#">Teste</a>
        </div>

        {/* Institucional */}
        <div className="footer-col">
          <h4>Institucional</h4>
          <a href="#">Termos de uso</a>
          <a href="#">Política de privacidade</a>
        </div>

        {/* Contato */}
        <div className="footer-col">
          <h4>Entre em contato</h4>
          <div className="contact-item">
            <IconWhatsapp />
            <span>5548996205153</span>
          </div>
          <div className="contact-item">
            <IconPhone />
            <span>48996205153</span>
          </div>
          <div className="contact-item">
            <IconMail />
            <a href="mailto:salvsacra@gmail.com">salvsacra@gmail.com</a>
          </div>
          <div className="contact-item">
            <IconMapPin />
            <span>Rua Manoel Antunes Corrêa, 2171</span>
          </div>
        </div>

        {/* Siga-nos */}
        <div className="footer-col">
          <h4>Siga-nos!</h4>
          <a href="https://instagram.com" target="_blank" rel="noreferrer" className="social-btn" aria-label="Instagram">
            <IconInstagram />
          </a>
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
          Copyright <a href="#">SALV SACRA</a> · 2026. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}

/* ── Layout principal ───────────────────────────────────── */
export default function MainLayout({ children, breadcrumbs }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <SiteHeader />

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

      <SiteFooter />
    </div>
  );
}
