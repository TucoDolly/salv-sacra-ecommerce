import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/catalogo.css';

// Ícone de ordenação
const IconSort = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="3" x2="12" y2="15" />
    <line x1="12" y1="21" x2="12.01" y2="21" />
  </svg>
);

export default function CatalogoPage({ modoFixo = null }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros ativos
  const [coresSelecionadas, setCoresSelecionadas] = useState([]);
  const [tamanhosSelecionados, setTamanhosSelecionados] = useState([]);
  const [marcasSelecionadas, setMarcasSelecionadas] = useState([]);
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
    if (categoriaParam.toLowerCase().includes('acessorios') || categoriaParam.toLowerCase().includes('bone')) {
      return {
        title: 'Acessórios',
        breadcrumb: 'ACESSÓRIOS > BONÉ',
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

  // Lista de opções de filtro do modelo Figma
  const OPCOES_CORES = [
    { nome: 'Preto', corHex: '#1e1e1e', qtd: 5 },
    { nome: 'Areia', corHex: '#d8c49e', qtd: 2 },
    { nome: 'Branco', corHex: '#ffffff', qtd: 2 },
    { nome: 'Marrom', corHex: '#6d4c41', qtd: 1 },
  ];

  const OPCOES_TAMANHOS = [
    { nome: 'G1', qtd: 4 },
    { nome: 'G2', qtd: 4 },
    { nome: 'PP', qtd: 7 },
    { nome: 'P', qtd: 7 },
    { nome: 'M', qtd: 7 },
    { nome: 'G', qtd: 7 },
    { nome: 'GG', qtd: 7 },
  ];

  const OPCOES_MARCAS = [
    { nome: 'Salv', qtd: 4 },
    { nome: 'Salv Sacra', qtd: 1 },
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

  // Filtragem e ordenação local
  const produtosFiltrados = produtos
    .filter((prod) => {
      // Se for acessórios e não temos itens ainda, exibe vazio
      if (categoriaParam.toLowerCase().includes('acessorios') || categoriaParam.toLowerCase().includes('bone')) {
        return false;
      }

      // Filtro de preço
      const preco = Number(prod.preco_base || 0);
      if (precoMin && preco < Number(precoMin)) return false;
      if (precoMax && preco > Number(precoMax)) return false;

      // Filtro de cores selecionadas
      if (coresSelecionadas.length > 0) {
        const temCor = (prod.variacoes || []).some((v) => coresSelecionadas.includes(v.cor));
        if (!temCor) return false;
      }

      // Filtro de tamanhos selecionados
      if (tamanhosSelecionados.length > 0) {
        const temTam = (prod.variacoes || []).some((v) => tamanhosSelecionados.includes(v.tamanho));
        if (!temTam) return false;
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
                {OPCOES_CORES.map((cor) => (
                  <label key={cor.nome} className="catalogo-filter-item">
                    <div className="catalogo-filter-checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={coresSelecionadas.includes(cor.nome)}
                        onChange={() => toggleFiltro(cor.nome, coresSelecionadas, setCoresSelecionadas)}
                        className="catalogo-checkbox"
                      />
                      <span>{cor.nome} ({cor.qtd})</span>
                    </div>
                    <span
                      className="catalogo-color-circle"
                      style={{ backgroundColor: cor.corHex }}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro: Tamanho */}
            <div className="catalogo-filter-group">
              <span className="catalogo-filter-heading">Tamanho</span>
              <div className="catalogo-filter-list">
                {OPCOES_TAMANHOS.map((tam) => (
                  <label key={tam.nome} className="catalogo-filter-item">
                    <div className="catalogo-filter-checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={tamanhosSelecionados.includes(tam.nome)}
                        onChange={() => toggleFiltro(tam.nome, tamanhosSelecionados, setTamanhosSelecionados)}
                        className="catalogo-checkbox"
                      />
                      <span>{tam.nome} ({tam.qtd})</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Filtro: Marca */}
            <div className="catalogo-filter-group">
              <span className="catalogo-filter-heading">Marca</span>
              <div className="catalogo-filter-list">
                {OPCOES_MARCAS.map((marca) => (
                  <label key={marca.nome} className="catalogo-filter-item">
                    <div className="catalogo-filter-checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={marcasSelecionadas.includes(marca.nome)}
                        onChange={() => toggleFiltro(marca.nome, marcasSelecionadas, setMarcasSelecionadas)}
                        className="catalogo-checkbox"
                      />
                      <span>{marca.nome} ({marca.qtd})</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

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
                  <Link
                    key={prod.id}
                    to={`/produto/${prod.id}`}
                    className="catalogo-product-card"
                  >
                    <div className="catalogo-product-img-wrap">
                      {prod.imagem_url ? (
                        <img src={prod.imagem_url} alt={prod.nome} loading="lazy" />
                      ) : (
                        <span style={{ fontSize: '32px' }}>🕊️</span>
                      )}
                      <div className="catalogo-card-dots">
                        <span className="catalogo-dot" />
                        <span className="catalogo-dot gold" />
                      </div>
                    </div>

                    <div className="catalogo-product-info">
                      <span className="catalogo-product-name">{prod.nome}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </main>

        </div>

      </div>
    </div>
  );
}
