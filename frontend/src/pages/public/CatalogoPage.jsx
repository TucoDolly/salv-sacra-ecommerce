import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { getHexCor } from '../../constants/cores';
import { useWishlist } from '../../contexts/WishlistContext';
import '../../styles/catalogo.css';

// Ícone de ordenação
const IconSort = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="3" x2="12" y2="15" />
    <line x1="12" y1="21" x2="12.01" y2="21" />
  </svg>
);

// Subcomponente de Card do Produto com suporte a foto 2 no hover e bolinhas de variações reais
function CatalogoItemCard({ prod }) {
  const [hovered, setHovered] = useState(false);
  const { isFavorite, toggleFavorite } = useWishlist();
  const favoritado = isFavorite(prod.id);

  const vitrine = Array.isArray(prod.imagens_vitrine) && prod.imagens_vitrine.length > 0
    ? prod.imagens_vitrine
    : Array.isArray(prod.imagens) && prod.imagens.length > 0
    ? prod.imagens
    : [];

  const foto1 = vitrine[0] || prod.imagem_url;
  const foto2 = vitrine[1] || null;
  const fotoExibida = hovered && foto2 ? foto2 : foto1;

  const coresVariacoes = Array.from(new Set((prod.variacoes || []).map((v) => v.cor))).filter(Boolean);

  return (
    <Link
      to={`/produto/${prod.id}`}
      className="catalogo-product-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="catalogo-product-img-wrap" style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(prod);
          }}
          title={favoritado ? 'Remover dos favoritos' : 'Salvar na lista de desejos'}
          aria-label={favoritado ? 'Remover dos favoritos' : 'Salvar na lista de desejos'}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            zIndex: 5,
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.92)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
            color: favoritado ? '#dc2626' : '#555',
            transition: 'transform 0.15s ease, color 0.15s ease',
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill={favoritado ? '#dc2626' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {fotoExibida ? (
          <img src={fotoExibida} alt={prod.nome} loading="lazy" />
        ) : (
          <span style={{ fontSize: '32px' }}>🕊️</span>
        )}
        {coresVariacoes.length > 0 && (
          <div className="catalogo-card-dots">
            {coresVariacoes.slice(0, 4).map((c) => (
              <span
                key={c}
                className="catalogo-dot"
                style={{ backgroundColor: getHexCor(c) }}
                title={c}
              />
            ))}
          </div>
        )}
      </div>

      <div className="catalogo-product-info">
        <span className="catalogo-product-name">{prod.nome}</span>
        {Number(prod.avaliacoes_count) > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '12px', color: '#c4953a', marginTop: '4px', fontWeight: 700 }}>
            <span>★ {Number(prod.avaliacoes_avg_nota || 0).toFixed(1).replace('.', ',')}</span>
            <span style={{ color: '#777', fontSize: '11px', fontWeight: 500 }}>({prod.avaliacoes_count})</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default function CatalogoPage({ modoFixo = null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros ativos
  const [coresSelecionadas, setCoresSelecionadas] = useState([]);
  const [modeloSelecionado, setModeloSelecionado] = useState('');
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState([]);
  const [devocoesSelecionadas, setDevocoesSelecionadas] = useState([]);
  const [colecoesSelecionadas, setColecoesSelecionadas] = useState([]);
  const [precoMin, setPrecoMin] = useState('');
  const [precoMax, setPrecoMax] = useState('');

  // Ordenação
  const [ordenacao, setOrdenacao] = useState('Mais vendidos');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortRef = useRef(null);

  // Parâmetros de URL
  const categoriaParam = searchParams.get('categoria') || '';
  const colecaoParam = searchParams.get('colecao') || '';
  const buscaParam = searchParams.get('busca') || '';

  // Configuração de Título e Breadcrumb baseada no contexto
  const getContextInfo = () => {
    if (buscaParam) {
      return {
        title: `Busca: "${buscaParam}"`,
        breadcrumb: `BUSCA > ${buscaParam.toUpperCase()}`,
      };
    }
    if (colecaoParam.toLowerCase().includes('regular')) {
      return {
        title: 'Regular Fit',
        breadcrumb: 'CAMISETAS > REGULAR FIT',
      };
    }
    if (colecaoParam.toLowerCase().includes('over')) {
      return {
        title: 'Oversized',
        breadcrumb: 'CAMISETAS > OVERSIZED',
      };
    }
    if (categoriaParam.toLowerCase().includes('camisetas')) {
      return {
        title: 'Camisetas',
        breadcrumb: 'CAMISETAS',
      };
    }
    return {
      title: 'Mais Vendidos',
      breadcrumb: 'MAIS VENDIDOS',
    };
  };

  const contextInfo = getContextInfo();

  // Fechar dropdown de ordenação ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Busca produtos na API
  useEffect(() => {
    setLoading(true);
    const params = {};
    if (buscaParam) params.busca = buscaParam;
    if (categoriaParam) params.categoria = categoriaParam;
    if (colecaoParam) params.colecao = colecaoParam;

    api.get('/produtos', { params })
      .then((res) => {
        setProdutos(res.data || []);
      })
      .catch((err) => {
        console.error('Erro ao buscar produtos no catálogo:', err);
        setProdutos([]);
      })
      .finally(() => setLoading(false));
  }, [buscaParam, categoriaParam, colecaoParam]);

  // ── Cálculo dinâmico das quantidades reais dos filtros com base no catálogo carregado ──
  // 1. Cores dinâmicas
  const opcoesCoresDinamicas = (() => {
    const mapa = new Map();
    produtos.forEach((prod) => {
      (prod.variacoes || []).forEach((v) => {
        if (!v.cor) return;
        const nomeCor = v.cor.trim();
        const estoque = Number(v.estoque || 0);
        if (estoque > 0) {
          mapa.set(nomeCor, (mapa.get(nomeCor) || 0) + estoque);
        }
      });
    });

    // Se houver cores cadastradas com estoque, retorna elas; senão, mostra as cadastradas ou padrão
    const entries = Array.from(mapa.entries());
    if (entries.length > 0) {
      return entries.map(([nome, qtd]) => ({
        nome,
        corHex: getHexCor(nome),
        qtd,
      }));
    }

    // Fallback caso ainda não tenha variações
    return [
      { nome: 'Preto', corHex: '#1e1e1e', qtd: 0 },
      { nome: 'Areia', corHex: '#d8c49e', qtd: 0 },
      { nome: 'Branco', corHex: '#ffffff', qtd: 0 },
      { nome: 'Marrom', corHex: '#6d4c41', qtd: 0 },
    ];
  })();

  // 2. Modelos dinâmicos (Regular Fit, Oversized, Ambos)
  const OPCOES_MODELOS = [
    {
      nome: 'Regular Fit',
      qtd: produtos.filter((p) => {
        const m = (p.modelo || p.colecao || '').toLowerCase();
        return m.includes('regular') || m.includes('ambos');
      }).length,
    },
    {
      nome: 'Oversized',
      qtd: produtos.filter((p) => {
        const m = (p.modelo || p.colecao || '').toLowerCase();
        return m.includes('over') || m.includes('ambos');
      }).length,
    },
    {
      nome: 'Ambos',
      qtd: produtos.filter((p) => (p.modelo || p.colecao || '').toLowerCase().includes('ambos')).length,
    },
  ];

  // 3. Tamanhos dinâmicos (soma das quantidades reais em estoque de cada tamanho)
  const ordemTamanhos = ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2'];
  const opcoesTamanhosDinamicos = ordemTamanhos.map((tam) => {
    let totalEstoque = 0;
    produtos.forEach((prod) => {
      (prod.variacoes || []).forEach((v) => {
        if (v.tamanho?.toUpperCase() === tam.toUpperCase()) {
          totalEstoque += Number(v.estoque || 0);
        }
      });
    });
    return {
      nome: tam,
      qtd: totalEstoque,
    };
  });

  // 4. Devoções dinâmicas (calcula quantidade de camisetas por devoção)
  const opcoesDevocoesDinamicas = (() => {
    const mapa = new Map();
    produtos.forEach((prod) => {
      const nomeDevocao = prod.devocao?.nome;
      if (nomeDevocao) {
        mapa.set(nomeDevocao, (mapa.get(nomeDevocao) || 0) + 1);
      }
    });

    return Array.from(mapa.entries()).map(([nome, qtd]) => ({
      nome,
      qtd,
    }));
  })();

  // 5. Coleções dinâmicas (Santos, Datas Comemorativas, Geral, Inverno, Verão, etc.)
  const opcoesColecoesDinamicas = (() => {
    const opcoesPadrao = ['Santos', 'Datas Comemorativas', 'Geral', 'Inverno', 'Verão'];
    const mapa = new Map(opcoesPadrao.map((c) => [c, 0]));
    produtos.forEach((prod) => {
      const col = (prod.colecao || '').trim();
      if (col && col !== 'Regular Fit' && col !== 'Oversized') {
        mapa.set(col, (mapa.get(col) || 0) + 1);
      }
    });

    return Array.from(mapa.entries()).map(([nome, qtd]) => ({
      nome,
      qtd,
    }));
  })();

  // 5. Marcas
  const OPCOES_MARCAS = [
    { nome: 'Salv', qtd: produtos.length },
    { nome: 'Salv Sacra', qtd: produtos.length },
  ];

  const OPCOES_ORDENACAO = [
    'Preço: menor ao maior',
    'Preço: maior ao menor',
    'A - Z',
    'Z - A',
    'Mais novo ao mais antigo',
    'Mais antigo ao mais novo',
    'Mais vendidos',
    'Destaque',
  ];

  // Alternar checkbox
  const toggleFiltro = (item, lista, setLista) => {
    if (lista.includes(item)) {
      setLista(lista.filter((i) => i !== item));
    } else {
      setLista([...lista, item]);
    }
  };

  // Alternar modelo (seleção única: impede selecionar mais de uma opção)
  const toggleModelo = (item) => {
    setModeloSelecionado((prev) => (prev === item ? '' : item));
  };

  // Filtragem e ordenação local
  const produtosFiltrados = produtos
    .filter((prod) => {
      // Filtro de preço
      const preco = Number(prod.preco_base || 0);
      if (precoMin && preco < Number(precoMin)) return false;
      if (precoMax && preco > Number(precoMax)) return false;

      // Filtro de cores selecionadas
      if (coresSelecionadas.length > 0) {
        const temCor = (prod.variacoes || []).some((v) => coresSelecionadas.includes(v.cor));
        if (!temCor) return false;
      }

      // Filtro de modelo selecionado (Seleção única: Regular Fit, Oversized ou Ambos)
      if (modeloSelecionado) {
        const prodMod = (prod.modelo || prod.colecao || '').toLowerCase();
        const selLower = modeloSelecionado.toLowerCase();

        if (selLower === 'ambos') {
          // Exibe produtos que atendem a ambos os modelos
          if (!prodMod.includes('ambos')) return false;
        } else if (selLower.includes('regular')) {
          if (!prodMod.includes('regular') && !prodMod.includes('ambos')) return false;
        } else if (selLower.includes('over')) {
          if (!prodMod.includes('over') && !prodMod.includes('ambos')) return false;
        } else {
          if (!prodMod.includes(selLower)) return false;
        }
      }

      // Filtro de tamanhos selecionados
      if (tamanhosSelecionados.length > 0) {
        const temTam = (prod.variacoes || []).some((v) => tamanhosSelecionados.includes(v.tamanho));
        if (!temTam) return false;
      }

      // Filtro de devoções selecionadas
      if (devocoesSelecionadas.length > 0) {
        const devNome = prod.devocao?.nome || '';
        if (!devocoesSelecionadas.includes(devNome)) return false;
      }

      // Filtro de coleções selecionadas
      if (colecoesSelecionadas.length > 0) {
        const colNome = (prod.colecao || '').trim();
        if (!colecoesSelecionadas.includes(colNome)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (ordenacao === 'Preço: menor ao maior') {
        return Number(a.preco_base) - Number(b.preco_base);
      }
      if (ordenacao === 'Preço: maior ao menor') {
        return Number(b.preco_base) - Number(a.preco_base);
      }
      if (ordenacao === 'A - Z') {
        return a.nome.localeCompare(b.nome);
      }
      if (ordenacao === 'Z - A') {
        return b.nome.localeCompare(a.nome);
      }
      return 0; // Mais vendidos ou Destaque mantém padrão da API
    });

  return (
    <div className="catalogo-page">
      <div className="catalogo-container">
        
        {/* ── 1. Topo: Breadcrumb + Ordenação ── */}
        <div className="catalogo-top-bar">
          <div className="catalogo-breadcrumb">
            <Link to="/">Início</Link>
            <span>&gt;</span>
            <span className="current">{contextInfo.breadcrumb}</span>
          </div>

          <div className="catalogo-sort-wrap" ref={sortRef}>
            <button
              type="button"
              className="catalogo-sort-trigger"
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            >
              <span>{ordenacao}</span>
              <IconSort />
            </button>

            {sortDropdownOpen && (
              <div className="catalogo-sort-menu">
                {OPCOES_ORDENACAO.map((opt) => (
                  <div
                    key={opt}
                    className={`catalogo-sort-option ${ordenacao === opt ? 'active' : ''}`}
                    onClick={() => {
                      setOrdenacao(opt);
                      setSortDropdownOpen(false);
                    }}
                  >
                    <span>{opt}</span>
                    {ordenacao === opt && <span>✓</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 2. Grid de Conteúdo (Sidebar + Cards) ── */}
        <div className="catalogo-layout">
          
          {/* Barra Lateral de Filtros (Figma) */}
          <aside className="catalogo-sidebar">
            <h3 className="catalogo-sidebar-title">Filtrar por</h3>

            {/* Filtro: Cor */}
            <div className="catalogo-filter-group">
              <span className="catalogo-filter-heading">Cor</span>
              <div className="catalogo-filter-list">
                {opcoesCoresDinamicas.map((cor) => (
                  <label key={cor.nome} className="catalogo-filter-item">
                    <div className="catalogo-filter-checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={coresSelecionadas.includes(cor.nome)}
                        onChange={() => toggleFiltro(cor.nome, coresSelecionadas, setCoresSelecionadas)}
                        className="catalogo-checkbox"
                      />
                      <span>{cor.nome}</span>
                    </div>
                    <span
                      className="catalogo-color-circle"
                      style={{ backgroundColor: cor.corHex }}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro: Modelo (Exatamente entre Cor e Tamanho, conforme Imagem 2 - Seleção Única) */}
            <div className="catalogo-filter-group">
              <span className="catalogo-filter-heading">Modelo</span>
              <div className="catalogo-filter-list">
                {OPCOES_MODELOS.map((mod) => (
                  <label key={mod.nome} className="catalogo-filter-item">
                    <div className="catalogo-filter-checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={modeloSelecionado === mod.nome}
                        onChange={() => toggleModelo(mod.nome)}
                        className="catalogo-checkbox"
                      />
                      <span>{mod.nome}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro: Tamanho */}
            <div className="catalogo-filter-group">
              <span className="catalogo-filter-heading">Tamanho</span>
              <div className="catalogo-filter-list">
                {opcoesTamanhosDinamicos.map((tam) => (
                  <label key={tam.nome} className="catalogo-filter-item">
                    <div className="catalogo-filter-checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={tamanhosSelecionados.includes(tam.nome)}
                        onChange={() => toggleFiltro(tam.nome, tamanhosSelecionados, setTamanhosSelecionados)}
                        className="catalogo-checkbox"
                      />
                      <span>{tam.nome}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro: Devoção */}
            {opcoesDevocoesDinamicas.length > 0 && (
              <div className="catalogo-filter-group">
                <span className="catalogo-filter-heading">Devoção</span>
                <div className="catalogo-filter-list">
                  {opcoesDevocoesDinamicas.map((dev) => (
                    <label key={dev.nome} className="catalogo-filter-item">
                      <div className="catalogo-filter-checkbox-wrap">
                        <input
                          type="checkbox"
                          checked={devocoesSelecionadas.includes(dev.nome)}
                          onChange={() => toggleFiltro(dev.nome, devocoesSelecionadas, setDevocoesSelecionadas)}
                          className="catalogo-checkbox"
                        />
                        <span>{dev.nome}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Filtro: Coleção (abaixo de Devoção) */}
            {opcoesColecoesDinamicas.length > 0 && (
              <div className="catalogo-filter-group">
                <span className="catalogo-filter-heading">Coleção</span>
                <div className="catalogo-filter-list">
                  {opcoesColecoesDinamicas.map((col) => (
                    <label key={col.nome} className="catalogo-filter-item">
                      <div className="catalogo-filter-checkbox-wrap">
                        <input
                          type="checkbox"
                          checked={colecoesSelecionadas.includes(col.nome)}
                          onChange={() => toggleFiltro(col.nome, colecoesSelecionadas, setColecoesSelecionadas)}
                          className="catalogo-checkbox"
                        />
                        <span>{col.nome}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Filtro: Preço */}
            <div className="catalogo-filter-group">
              <span className="catalogo-filter-heading">Preço</span>
              <div className="catalogo-price-inputs">
                <div className="catalogo-price-field">
                  <label>De</label>
                  <input
                    type="number"
                    value={precoMin}
                    placeholder="0"
                    onChange={(e) => setPrecoMin(e.target.value)}
                  />
                </div>
                <div className="catalogo-price-field">
                  <label>Até</label>
                  <input
                    type="number"
                    value={precoMax}
                    placeholder="200"
                    onChange={(e) => setPrecoMax(e.target.value)}
                  />
                </div>
                <button type="button" className="catalogo-price-submit-btn" title="Aplicar filtro de preço">
                  &gt;
                </button>
              </div>
            </div>
          </aside>

          {/* Grid de Produtos */}
          <main className="catalogo-main-content">
            {loading ? (
              <p style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>Carregando catálogo...</p>
            ) : produtosFiltrados.length === 0 ? (
              <div className="catalogo-empty-box">
                <p>Não temos resultados para sua pesquisa. Por favor, tente com outros filtros.</p>
              </div>
            ) : (
              <div className="catalogo-products-grid">
                {produtosFiltrados.map((prod) => (
                  <CatalogoItemCard key={prod.id} prod={prod} />
                ))}
              </div>
            )}
          </main>

        </div>

      </div>
    </div>
  );
}
