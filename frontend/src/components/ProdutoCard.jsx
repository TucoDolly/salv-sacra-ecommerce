import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { getHexCor } from '../constants/cores';
import '../styles/home.css';

export function deduplicarCores(lista) {
  const vistos = new Set();
  const res = [];
  for (const item of lista) {
    if (!item || typeof item !== 'string') continue;
    const limpo = item.trim();
    if (!limpo) continue;
    const chave = limpo.toLowerCase();
    if (!vistos.has(chave)) {
      vistos.add(chave);
      res.push(limpo);
    }
  }
  return res;
}

export default function ProdutoCard({ produto }) {
  const [hovered, setHovered] = useState(false);
  const [fotoIdx, setFotoIdx] = useState(0);
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useWishlist();
  const navigate = useNavigate();
  const favoritado = isFavorite(produto.id);

  const preco = produto.preco_base
    ? Number(produto.preco_base).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : null;

  // Vitrine e cores unificadas
  const vitrine = Array.isArray(produto.imagens_vitrine) && produto.imagens_vitrine.length > 0
    ? produto.imagens_vitrine.filter(Boolean)
    : Array.isArray(produto.imagens) && produto.imagens.length > 0
    ? produto.imagens.filter(Boolean)
    : [];

  const coresConfig = Array.isArray(produto.cores_config) ? produto.cores_config : [];

  const listaFotos = (() => {
    if (coresConfig.length > 0) {
      const fotosDeCores = coresConfig.map((c) => c.imagem_url).filter(Boolean);
      if (fotosDeCores.length > 0) return fotosDeCores;
    }
    if (vitrine.length > 0) return vitrine;
    return produto.imagem_url ? [produto.imagem_url] : [];
  })();

  const fotoExibida = listaFotos[fotoIdx] || listaFotos[0] || produto.imagem_url || '';

  const handleMouseEnter = () => {
    setHovered(true);
    if (listaFotos.length > 1) {
      setFotoIdx(1);
    } else {
      setFotoIdx(0);
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setFotoIdx(0);
  };

  const handlePrevFoto = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (listaFotos.length > 1) {
      setFotoIdx((prev) => (prev - 1 + listaFotos.length) % listaFotos.length);
    }
  };

  const handleNextFoto = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (listaFotos.length > 1) {
      setFotoIdx((prev) => (prev + 1) % listaFotos.length);
    }
  };

  // Cores dinâmicas cadastradas nas variações do produto (rigorosamente deduplicadas sem repetição)
  const coresVariacoesRaw = deduplicarCores((produto.variacoes || []).map((v) => v.cor));
  const coresConfigList = deduplicarCores(
    [...coresConfig]
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
      .map((c) => c.cor)
  );
  const coresVariacoes = coresConfigList.length > 0
    ? coresConfigList.filter((c) => coresVariacoesRaw.length === 0 || coresVariacoesRaw.map((x) => x.toLowerCase()).includes(c.toLowerCase()))
    : coresVariacoesRaw;
  const temAvaliacao = Number(produto.avaliacoes_count) > 0;
  const qtdEstrelas = Math.max(1, Math.min(5, Math.round(Number(produto.avaliacoes_avg_nota || 0))));

  const handleToggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    toggleFavorite(produto);
  };

  return (
    <Link
      to={`/produto/${produto.id}`}
      className="produto-card"
      aria-label={produto.nome}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="produto-card-img">
        <button
          type="button"
          onClick={handleToggleFavorite}
          className="produto-card-fav-btn"
          title={favoritado ? 'Remover dos favoritos' : 'Salvar na lista de desejos'}
          aria-label={favoritado ? 'Remover dos favoritos' : 'Salvar na lista de desejos'}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={favoritado ? '#dc2626' : 'none'} stroke={favoritado ? '#dc2626' : '#444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Setas para navegar nas cores/fotos quando há mais de 2 fotos/cores */}
        {hovered && listaFotos.length > 2 && (
          <>
            <button
              type="button"
              onClick={handlePrevFoto}
              className="card-nav-arrow card-nav-arrow-left"
              title="Foto/Cor anterior"
              aria-label="Foto/Cor anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={handleNextFoto}
              className="card-nav-arrow card-nav-arrow-right"
              title="Próxima foto/cor"
              aria-label="Próxima foto/cor"
            >
              ›
            </button>
          </>
        )}

        {fotoExibida ? (
          <img
            src={fotoExibida}
            alt={produto.nome}
            loading="lazy"
            style={{ objectPosition: 'top center' }}
          />
        ) : (
          <div className="produto-card-placeholder" aria-hidden="true">
            <span>🕊️</span>
          </div>
        )}
      </div>

      {/* Faixa horizontal de cores com a linha divisória escura */}
      <div className="produto-card-dots">
        {coresVariacoes.length > 0 ? (
          coresVariacoes.slice(0, 4).map((c) => (
            <span
              key={c}
              className="produto-card-dot"
              style={{ backgroundColor: getHexCor(c) }}
              title={c}
            />
          ))
        ) : (
          <span
            className="produto-card-dot"
            style={{ backgroundColor: '#1e1e1e' }}
            title="Cor única"
          />
        )}
      </div>

      <div className="produto-card-info">
        <p className="produto-card-nome">{produto.nome}</p>

        <div className="produto-card-rating">
          {temAvaliacao ? (
            <>
              <span className="produto-card-stars">{'★'.repeat(qtdEstrelas)}</span>
              <span className="produto-card-rating-count">({produto.avaliacoes_count})</span>
            </>
          ) : null}
        </div>

        {preco && (
          <p className="produto-card-preco">{preco}</p>
        )}
      </div>
    </Link>
  );
}

