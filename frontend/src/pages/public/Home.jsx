import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/home.css';

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
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

// ── Dados dos slides do banner ─────────────────────────────────────────────────
const BANNER_SLIDES = [
  {
    id: 1,
    tag:     'Camiseta Regular Fit',
    title:   'São José',
    subtitle:'Conforto e devoção em cada detalhe.',
    cta:     'Saiba mais',
    bg:      'linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 50%, #3a3a3a 100%)',
  },
  {
    id: 2,
    tag:     'Nova Coleção',
    title:   'Nossa Senhora',
    subtitle:'Fé expressa com estilo e qualidade.',
    cta:     'Ver coleção',
    bg:      'linear-gradient(135deg, #1e1810 0%, #2e2418 50%, #3c3020 100%)',
  },
  {
    id: 3,
    tag:     'Edição Limitada',
    title:   'Divino Pai Eterno',
    subtitle:'Peças exclusivas para quem vive a fé.',
    cta:     'Conhecer',
    bg:      'linear-gradient(135deg, #0d1a10 0%, #162510 50%, #1e3015 100%)',
  },
];

// ── Benefícios (faixa abaixo do banner) ───────────────────────────────────────
const BENEFITS = [
  { icon: <IconTruck />,      title: 'Frete grátis',      desc: 'Compras acima de R$500' },
  { icon: <IconCreditCard />, title: 'Parcele em até 12x', desc: 'Em até 12x sem juros' },
  { icon: <IconShield />,     title: 'Loja 100% segura',  desc: 'Seus dados protegidos' },
  { icon: <IconHeadset />,    title: 'Precisa de ajuda?', desc: 'Fale conosco pelo WhatsApp' },
];

// ── Componente de card de produto ──────────────────────────────────────────────
function ProdutoCard({ produto }) {
  const preco = produto.preco_base
    ? Number(produto.preco_base).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;

  return (
    <Link to={`/produto/${produto.id}`} className="produto-card" aria-label={produto.nome}>
      <div className="produto-card-img">
        {produto.imagem_url ? (
          <img
            src={produto.imagem_url}
            alt={produto.nome}
            loading="lazy"
          />
        ) : (
          <div className="produto-card-placeholder" aria-hidden="true">
            <span>🕊️</span>
          </div>
        )}
      </div>
      <div className="produto-card-info">
        <p className="produto-card-nome">{produto.nome}</p>
        {preco && <p className="produto-card-preco">{preco}</p>}
      </div>
    </Link>
  );
}

// ── Carrossel de cards com setas ───────────────────────────────────────────────
function CardCarousel({ items, loading, emptyMsg }) {
  const trackRef  = useRef(null);
  const CARD_W    = 228; // largura + gap

  const scroll = (dir) => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: dir * CARD_W * 2, behavior: 'smooth' });
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
      </div>

      <button className="carousel-btn carousel-btn--next" onClick={() => scroll(1)} aria-label="Próximo">
        <IconChevronRight />
      </button>
    </div>
  );
}

// ── Banner principal com slides ────────────────────────────────────────────────
function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const total = BANNER_SLIDES.length;

  // Auto-play a cada 5s
  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => (c + 1) % total), 5000);
    return () => clearInterval(t);
  }, [total]);

  const slide = BANNER_SLIDES[current];

  return (
    <section className="hero-banner" style={{ background: slide.bg }} aria-label="Banner principal">
      {/* Conteúdo do slide */}
      <div className="hero-content">
        <span className="hero-tag">{slide.tag}</span>
        <h1 className="hero-title">{slide.title}</h1>
        <p className="hero-subtitle">{slide.subtitle}</p>
        <button className="hero-cta">{slide.cta}</button>
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
        {BANNER_SLIDES.map((_, i) => (
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
  const [vemPorAi, setVemPorAi]         = useState([]);
  const [loadingDestaques, setLoadingD] = useState(true);
  const [loadingVem, setLoadingV]       = useState(true);

  // Busca produtos da API
  useEffect(() => {
    // Destaques — primeiros 8 produtos
    api.get('/produtos', { params: { per_page: 8 } })
      .then(({ data }) => {
        const lista = Array.isArray(data) ? data : (data.data ?? []);
        setDestaques(lista.slice(0, 8));
      })
      .catch(() => setDestaques([]))
      .finally(() => setLoadingD(false));

    // Vem por aí — próximos 8 produtos (offset simples)
    api.get('/produtos', { params: { per_page: 16 } })
      .then(({ data }) => {
        const lista = Array.isArray(data) ? data : (data.data ?? []);
        setVemPorAi(lista.slice(8, 16));
      })
      .catch(() => setVemPorAi([]))
      .finally(() => setLoadingV(false));
  }, []);

  return (
    <>
      {/* ── 1. Banner hero ──────────────────────────────────────────── */}
      <HeroBanner />

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

      {/* ── 4. Vem por aí ───────────────────────────────────────────── */}
      <section className="home-section" aria-labelledby="vem-title">
        <h2 id="vem-title" className="home-section-title">Vem por aí!</h2>
        <CardCarousel
          items={vemPorAi}
          loading={loadingVem}
          emptyMsg="Novidades chegando em breve."
        />
      </section>

      {/* ── 5. CTA Instagram ────────────────────────────────────────── */}
      <section className="instagram-cta" aria-label="Siga no Instagram">
        <IconInstagram />
        <strong>salv.sacra</strong>
        <span>Follow us no Instagram</span>
        <a
          href="https://instagram.com/salv.sacra"
          target="_blank"
          rel="noreferrer"
          className="instagram-btn"
        >
          Siga-nos
        </a>
      </section>
    </>
  );
}
