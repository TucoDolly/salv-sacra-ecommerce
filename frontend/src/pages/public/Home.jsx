import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ProdutoCard from '../../components/ProdutoCard';
import '../../styles/home.css';
import bannerSaoJose from '../../assets/banner-sao-jose.jpg';
import bannerDesatadora from '../../assets/banner-desatadora.jpg';
import bannerPorVoce from '../../assets/banner-por-voce.jpg';

const FALLBACK_BANNER_IMGS = [bannerSaoJose, bannerDesatadora, bannerPorVoce];

// ── Ícones inline ──────────────────────────────────────────────────────────────
const IconTruck = () => (
  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);
const IconCreditCard = () => (
  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);
const IconShield = () => (
  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconHeadset = () => (
  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
  </svg>
);
const IconChevronLeft  = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
);
const IconChevronRight = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
);
const IconInstagram = () => (
  <svg width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

// ── Dados dos slides do banner ─────────────────────────────────────────────────
const BANNER_SLIDES = [
  {
    id: 1,
    tag:   'Camiseta Regular Fit',
    title: 'São José',
    cta:   'Saiba mais',
    image: bannerSaoJose,
    tema:  'claro',
    link:  '/produtos?categoria=camisetas',
  },
  {
    id: 2,
    tag:   'Camiseta Regular Fit',
    title: 'Desatadora',
    cta:   'Saiba mais',
    image: bannerDesatadora,
    tema:  'escuro',
    link:  '/produtos?categoria=camisetas',
  },
  {
    id: 3,
    tag:   'Camiseta Oversized',
    title: 'Por Você',
    cta:   'Saiba mais',
    image: bannerPorVoce,
    tema:  'claro',
    link:  '/produtos?categoria=camisetas',
  },
];

// ── Benefícios (faixa abaixo do banner) ───────────────────────────────────────
const BENEFITS = [
  { icon: <IconTruck />,      title: 'Envio seguro',      desc: 'Para todo o Brasil' },
  { icon: <IconCreditCard />, title: 'Parcele em até 12x', desc: 'No cartão de crédito' },
  { icon: <IconShield />,     title: 'Loja 100% segura',  desc: 'Seus dados protegidos' },
  { icon: <IconHeadset />,    title: 'Precisa de ajuda?', desc: 'Fale conosco pelo WhatsApp' },
];

// ── Carrossel de cards com setas ───────────────────────────────────────────────
function CardCarousel({ items, loading, emptyMsg }) {
  const trackRef  = useRef(null);

  const scroll = (dir) => {
    if (trackRef.current) {
      const cardEl = trackRef.current.querySelector('.produto-card');
      const step = cardEl ? (cardEl.offsetWidth + 20) * 4 : trackRef.current.clientWidth;
      trackRef.current.scrollBy({ left: dir * step, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="carousel-skeleton">
        {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton-card" aria-hidden="true"/>)}
      </div>
    );
  }

  if (!items.length) {
    return <p className="carousel-empty">{emptyMsg}</p>;
  }

  return (
    <div className="carousel-wrapper">
      <button className="carousel-btn carousel-btn--prev" onClick={() => scroll(-1)} aria-label="Anterior">
        <IconChevronLeft />
      </button>

      <div className="carousel-track" ref={trackRef}>
        {items.map((p) => <ProdutoCard key={p.id} produto={p} />)}

        {/* Card Ver Catálogo Completo / Ver Vitrine ao final do carrossel */}
        <Link
          to="/produtos?categoria=camisetas"
          className="produto-card produto-card--ver-mais"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '220px',
            background: 'linear-gradient(135deg, #1e1e1e 0%, #121212 100%)',
            borderRadius: '16px',
            padding: '24px 18px',
            textAlign: 'center',
            textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            border: '1.5px solid rgba(212, 175, 55, 0.4)',
            transition: 'transform 0.25s ease, box-shadow 0.25s ease',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.22)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'rgba(212, 175, 55, 0.15)',
              color: '#c5a059',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
            }}
          >
            <IconChevronRight style={{ width: '28px', height: '28px' }} />
          </div>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', color: '#c5a059', fontWeight: 700, marginBottom: '6px' }}>
            Explorar
          </span>
          <h4 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', margin: '0 0 8px', lineHeight: 1.3 }}>
            Ver Catálogo Completo
          </h4>
          <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.4 }}>
            Conheça todas as nossas peças exclusivas
          </span>
          <span
            style={{
              marginTop: '16px',
              padding: '8px 18px',
              borderRadius: '20px',
              background: '#c5a059',
              color: '#111',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Ver Vitrine →
          </span>
        </Link>
      </div>

      <button className="carousel-btn carousel-btn--next" onClick={() => scroll(1)} aria-label="Próximo">
        <IconChevronRight />
      </button>
    </div>
  );
}

// ── Banner principal com slides ────────────────────────────────────────────────
function HeroBanner({ slidesConfig }) {
  const [current, setCurrent] = useState(0);
  const slides = Array.isArray(slidesConfig) && slidesConfig.length > 0 ? slidesConfig : BANNER_SLIDES;
  const total = slides.length;

  useEffect(() => {
    if (current >= total) setCurrent(0);
  }, [current, total]);

  // Auto-play a cada 7s (tempo mais confortável para leitura)
  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => (c + 1) % total), 7000);
    return () => clearInterval(t);
  }, [total]);

  const slide = slides[current] || slides[0];

  return (
    <section
      className={`hero-banner hero-banner--${slide.tema || 'claro'}`}
      style={{ backgroundImage: `url(${slide.image})` }}
      aria-label="Banner principal"
    >
      {/* Conteúdo do slide (centralizado) */}
      <div className="hero-content" key={slide.id || current}>
        <span className="hero-tag">{slide.tag}</span>
        <h1 className="hero-title">{slide.title}</h1>
        <Link to={slide.link} className="hero-cta">{slide.cta || 'Saiba mais'}</Link>
      </div>

      {/* Setas */}
      <button
        className="hero-arrow hero-arrow--prev"
        onClick={() => setCurrent((c) => (c - 1 + total) % total)}
        aria-label="Slide anterior"
      >
        <IconChevronLeft />
      </button>
      <button
        className="hero-arrow hero-arrow--next"
        onClick={() => setCurrent((c) => (c + 1) % total)}
        aria-label="Próximo slide"
      >
        <IconChevronRight />
      </button>

      {/* Indicadores (dots) */}
      <div className="hero-dots" role="tablist" aria-label="Slides">
        {slides.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === current}
            aria-label={`Slide ${i + 1}`}
            className={`hero-dot${i === current ? ' active' : ''}`}
            onClick={() => setCurrent(i)}
          />
        ))}
      </div>
    </section>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Home() {
  const [destaques, setDestaques]       = useState([]);
  const [loadingDestaques, setLoadingD] = useState(true);
  const [slidesBanner, setSlidesBanner] = useState(BANNER_SLIDES);

  // Busca produtos e configurações do carrossel da API
  useEffect(() => {
    // Carrossel configurado pelo Admin
    api.get('/configuracoes')
      .then(({ data }) => {
        if (data?.carrossel_slides) {
          try {
            const parsed = JSON.parse(data.carrossel_slides);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const normalizados = parsed.map((s, idx) => ({
                id: s.id || idx + 1,
                tag: s.tag || 'Camiseta Regular Fit',
                title: s.title || `Slide ${idx + 1}`,
                cta: s.cta || 'Saiba mais',
                tema: s.tema || 'claro',
                image: (s.image && String(s.image).trim()) ? String(s.image).trim() : FALLBACK_BANNER_IMGS[idx % FALLBACK_BANNER_IMGS.length],
                link: s.produto_id ? `/produto/${s.produto_id}` : (s.link || '/produtos?categoria=camisetas'),
              }));
              setSlidesBanner(normalizados);
            }
          } catch {
            // mantém slides padrão
          }
        }
      })
      .catch(() => {});

    // Destaques — primeiros 8 produtos
    api.get('/produtos', { params: { per_page: 8 } })
      .then(({ data }) => {
        const lista = Array.isArray(data) ? data : (data.data ?? []);
        setDestaques(lista.slice(0, 8));
      })
      .catch(() => setDestaques([]))
      .finally(() => setLoadingD(false));
  }, []);

  return (
    <>
      {/* ── 1. Banner hero ──────────────────────────────────────────── */}
      <HeroBanner slidesConfig={slidesBanner} />

      {/* ── 2. Faixa de benefícios ──────────────────────────────────── */}
      <section className="benefits-bar" aria-label="Benefícios">
        {BENEFITS.map(({ icon, title, desc }) => (
          <div key={title} className="benefit-item">
            <span className="benefit-icon">{icon}</span>
            <div className="benefit-text">
              <strong>{title}</strong>
              <span>{desc}</span>
            </div>
          </div>
        ))}
      </section>

      {/* ── 3. Destaques ────────────────────────────────────────────── */}
      <section className="home-section" aria-labelledby="destaques-title">
        <h2 id="destaques-title" className="home-section-title">Destaques</h2>
        <CardCarousel
          items={destaques}
          loading={loadingDestaques}
          emptyMsg="Em breve, novos produtos estarão disponíveis."
        />
      </section>

      {/* ── 4. CTA Instagram (Fiel à Imagem 3) ───────────────────────── */}
      <section className="instagram-cta" aria-label="Siga no Instagram">
        <div className="instagram-header-row">
          <IconInstagram />
          <span className="instagram-username">salv.sacra</span>
        </div>
        <p className="instagram-subtitle">Estamos no instagram</p>
        <a
          href="https://instagram.com/salv.sacra"
          target="_blank"
          rel="noreferrer"
          className="instagram-btn"
        >
          SIGA-NOS
        </a>
      </section>
    </>
  );
}

