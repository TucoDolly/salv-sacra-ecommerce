import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWishlist } from '../../contexts/WishlistContext';
import api from '../../services/api';
import { getHexCor } from '../../constants/cores';
import '../../styles/produto-detalhe.css';

// Ícones SVG inline baseados no Figma
const IconCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4953a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const IconCard = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

const IconBarcode = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c4953a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="5" x2="3" y2="19" />
    <line x1="7" y1="5" x2="7" y2="19" />
    <line x1="10" y1="5" x2="10" y2="19" />
    <line x1="15" y1="5" x2="15" y2="19" />
    <line x1="18" y1="5" x2="18" y2="19" />
    <line x1="21" y1="5" x2="21" y2="19" />
  </svg>
);

const IconTruck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconRotate = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const IconEye = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export default function ProdutoDetalhe() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useWishlist();
  const [produto, setProduto] = useState(null);
  const [produtosSimilares, setProdutosSimilares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  // Avaliações e Comentários
  const [resumoAvaliacoes, setResumoAvaliacoes] = useState({
    media: 0,
    total: 0,
    distribuicao: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    avaliacoes: [],
  });
  const [notaForm, setNotaForm] = useState(5);
  const [hoverNota, setHoverNota] = useState(0);
  const [tituloForm, setTituloForm] = useState('');
  const [comentarioForm, setComentarioForm] = useState('');
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);

  const carregarAvaliacoes = (prodId = id) => {
    api.get(`/produtos/${prodId}/avaliacoes`)
      .then((res) => {
        if (res.data) {
          setResumoAvaliacoes(res.data);
        }
      })
      .catch(() => {});
  };

  // Estados de seleção
  const [modeloSelecionado, setModeloSelecionado] = useState('Regular Fit');
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState('M');
  const [corSelecionada, setCorSelecionada] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [fotoPrincipal, setFotoPrincipal] = useState('');

  // Frete
  const [cep, setCep] = useState('');
  const [calculandoFrete, setCalculandoFrete] = useState(false);
  const [freteResultado, setFreteResultado] = useState(null);

  // Toast
  const [toastMessage, setToastMessage] = useState(null);

  // Ref do carrossel similar
  const similarTrackRef = useRef(null);

  // Lista de tamanhos padrão: PP, P, M, G, GG, G1, G2
  const TAMANHOS_PADRAO = ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2'];

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setErro(null);

    // Busca produto atual
    api.get(`/produtos/${id}`)
      .then((res) => {
        const prod = res.data;
        setProduto(prod);
        const variacoes = prod.variacoes || [];

        const galeriaInicial = Array.isArray(prod.imagens) && prod.imagens.filter(Boolean).length > 0
          ? prod.imagens.filter(Boolean)
          : [];
        const vitrineInicial = Array.isArray(prod.imagens_vitrine) && prod.imagens_vitrine.filter(Boolean).length > 0
          ? prod.imagens_vitrine.filter(Boolean)
          : galeriaInicial;

        setFotoPrincipal(galeriaInicial[0] || vitrineInicial[0] || prod.imagem_url || '');

        if (variacoes.length > 0) {
          const varComEstoque = variacoes.find((v) => Number(v.estoque) > 0) || variacoes[0];
          const modInicial = varComEstoque.modelo || (prod.modelo === 'Oversized' ? 'Oversized' : 'Regular Fit');
          setModeloSelecionado(modInicial);
          setTamanhoSelecionado(varComEstoque.tamanho || 'M');
          setCorSelecionada(varComEstoque.cor || 'Preto');
        } else {
          setModeloSelecionado(prod.modelo === 'Oversized' ? 'Oversized' : 'Regular Fit');
          setTamanhoSelecionado('M');
          setCorSelecionada('Preto');
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar produto:', err);
        setErro('Não foi possível carregar as informações deste produto.');
      })
      .finally(() => setLoading(false));

    // Busca produtos similares (outros produtos do catálogo)
    api.get('/produtos')
      .then((res) => {
        const outros = (res.data || []).filter((p) => String(p.id) !== String(id));
        setProdutosSimilares(outros);
      })
      .catch((err) => console.error('Erro ao buscar similares:', err));

    // Carrega avaliações do produto
    carregarAvaliacoes(id);
  }, [id]);

  const scrollSimilares = (dir) => {
    if (similarTrackRef.current) {
      similarTrackRef.current.scrollBy({ left: dir * 260 * 2, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="pdp-wrapper">
        <div className="pdp-container">
          <p style={{ textAlign: 'center', padding: '60px 0', color: '#666' }}>Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (erro || !produto) {
    return (
      <div className="pdp-wrapper">
        <div className="pdp-container" style={{ textAlign: 'center', padding: '80px 20px' }}>
          <h2>Produto não encontrado</h2>
          <p style={{ color: '#666', marginTop: '8px' }}>{erro || 'O item solicitado não está disponível.'}</p>
          <Link to="/" style={{ display: 'inline-block', marginTop: '20px', color: '#c4953a', fontWeight: 'bold' }}>
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>
    );
  }

  // Preços e cálculos
  const precoBase = Number(produto.preco_base || 79.9);
  const parcela12x = (precoBase / 12 * 1.23).toFixed(2); // Simulação de parcelamento no cartão

  // Aba 1: Galeria de fotos menores do lado esquerdo da foto grande
  const galeriaFotos = (() => {
    if (Array.isArray(produto.imagens) && produto.imagens.filter(Boolean).length > 0) {
      return produto.imagens.filter(Boolean);
    }
    if (produto.imagem_url) {
      return [produto.imagem_url];
    }
    return [];
  })();

  // Aba 2: Fotos da vitrine e das opções de cores
  const fotosCores = (() => {
    if (Array.isArray(produto.imagens_vitrine) && produto.imagens_vitrine.filter(Boolean).length > 0) {
      return produto.imagens_vitrine.filter(Boolean);
    }
    return galeriaFotos;
  })();

  const imagemExibida = fotoPrincipal || galeriaFotos[0] || fotosCores[0] || produto.imagem_url || '';

  const variacoes = produto.variacoes || [];
  const cores = Array.from(new Set(variacoes.map((v) => v.cor))).filter(Boolean);
  const coresExibicao = cores.length > 0 ? cores : ['Preto', 'Marrom'];

  // Opções de modelo disponíveis para a peça
  const modelosDisponiveis = (() => {
    if (produto.modelo === 'Ambos') {
      return ['Regular Fit', 'Oversized'];
    }
    const modelosVar = Array.from(new Set(variacoes.map((v) => v.modelo).filter(Boolean)));
    if (modelosVar.length > 1) {
      return modelosVar;
    }
    if (produto.modelo === 'Oversized' || modelosVar[0] === 'Oversized') {
      return ['Oversized'];
    }
    return ['Regular Fit'];
  })();

  // Verifica se uma variação bate com o modelo selecionado
  const matchModelo = (v, modAlvo = modeloSelecionado) => {
    const vMod = (v.modelo || 'Regular Fit').toLowerCase();
    return vMod === (modAlvo || 'Regular Fit').toLowerCase();
  };

  // Verifica o estoque de um tamanho específico considerando o modelo e a cor selecionada
  const getEstoqueTamanho = (tam, modAlvo = modeloSelecionado) => {
    if (variacoes.length === 0) return 99; // Se não tem variações cadastradas, permite
    const matches = variacoes.filter(
      (v) =>
        v.tamanho?.toUpperCase() === tam.toUpperCase() &&
        (!corSelecionada || v.cor?.toLowerCase() === corSelecionada?.toLowerCase()) &&
        matchModelo(v, modAlvo)
    );
    return matches.reduce((soma, v) => soma + Number(v.estoque || 0), 0);
  };

  const handleSelecionarModelo = (mod) => {
    setModeloSelecionado(mod);
    if (getEstoqueTamanho(tamanhoSelecionado, mod) <= 0) {
      const tamComEstoque = TAMANHOS_PADRAO.find((t) => getEstoqueTamanho(t, mod) > 0);
      if (tamComEstoque) {
        setTamanhoSelecionado(tamComEstoque);
      }
    }
  };

  // Ao clicar em uma cor, muda corSelecionada e alterna a foto principal usando a Aba 2 (fotosCores)
  const handleSelecionarCor = (cor, idx) => {
    setCorSelecionada(cor);
    if (fotosCores.length > 0) {
      const fotoCor = fotosCores[idx < fotosCores.length ? idx : 0] || fotosCores[0];
      if (fotoCor) {
        setFotoPrincipal(fotoCor);
      }
    }
  };

  const { addItem, setCep: setGlobalCep } = useCart();

  const handleComprar = () => {
    const estoqueDisponivel = getEstoqueTamanho(tamanhoSelecionado);
    if (estoqueDisponivel <= 0) {
      alert(`O tamanho ${tamanhoSelecionado} (${modeloSelecionado}) para a cor ${corSelecionada} não está disponível no estoque.`);
      return;
    }

    const variacaoEncontrada = variacoes.find(
      (v) =>
        v.tamanho?.toUpperCase() === tamanhoSelecionado.toUpperCase() &&
        (!corSelecionada || v.cor?.toLowerCase() === corSelecionada?.toLowerCase()) &&
        matchModelo(v, modeloSelecionado)
    );

    const idxCor = Math.max(0, coresExibicao.findIndex((c) => c === corSelecionada));
    const imgCorCarrinho = fotosCores[idxCor < fotosCores.length ? idxCor : 0] || imagemExibida || produto.imagem_url;

    addItem({
      produtoId: produto.id,
      variacaoId: variacaoEncontrada?.id || null,
      nome: produto.nome,
      preco: produto.preco_base,
      imagem: imgCorCarrinho,
      modelo: modeloSelecionado,
      tamanho: tamanhoSelecionado,
      cor: corSelecionada,
      quantidade: quantidade,
    });
  };

  const handleSimularFrete = async (e) => {
    e.preventDefault();
    const limpo = (cep || '').replace(/\D/g, '');
    if (limpo.length !== 8) {
      alert('Digite um CEP válido com 8 dígitos.');
      return;
    }
    setCalculandoFrete(true);
    setFreteResultado(null);
    try {
      const { data } = await api.post('/frete/calcular', {
        cep: limpo,
        subtotal: Number(produto.preco_base || 79.9) * quantidade,
        quantidade: quantidade,
      });

      const formatado = `${limpo.slice(0, 5)}-${limpo.slice(5)}`;
      setCep(formatado);
      setGlobalCep(formatado); // Sincroniza com o carrinho e checkout

      setFreteResultado({
        local: data.cidade ? `${data.cidade}/${data.uf}` : '',
        opcoes: (data.opcoes || []).map((o) => ({
          tipo: o.nome,
          prazo: o.prazo,
          valor: o.preco === 0 ? 'GRÁTIS' : o.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          gratis: o.preco === 0,
        })),
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Não foi possível calcular o frete para este CEP.');
    } finally {
      setCalculandoFrete(false);
    }
  };

  const handleEnviarAvaliacao = async (e) => {
    e.preventDefault();
    if (!comentarioForm.trim()) {
      alert('Por favor, escreva um comentário sobre o produto.');
      return;
    }
    setEnviandoAvaliacao(true);
    try {
      await api.post(`/produtos/${id}/avaliacoes`, {
        nota: notaForm,
        titulo: tituloForm.trim() || null,
        comentario: comentarioForm.trim(),
      });
      setTituloForm('');
      setComentarioForm('');
      setNotaForm(5);
      carregarAvaliacoes(id);
      setToastMessage('Sua avaliação foi salva com sucesso!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Não foi possível enviar sua avaliação.');
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  const handleExcluirAvaliacao = async (avId) => {
    if (!window.confirm('Deseja realmente excluir esta avaliação?')) return;
    try {
      await api.delete(`/avaliacoes/${avId}`);
      carregarAvaliacoes(id);
    } catch {
      alert('Não foi possível remover a avaliação.');
    }
  };

  const renderEstrelas = (nota) => {
    const arredondada = Math.round(Number(nota || 0));
    return [1, 2, 3, 4, 5].map((i) => (
      <span key={i} style={{ color: i <= arredondada ? '#c4953a' : '#d1d5db' }}>★</span>
    ));
  };

  return (
    <div className="pdp-wrapper">
      <div className="pdp-container">
        {/* ── GRID PRINCIPAL (FIGMA PARTE SUPERIOR) ── */}
        <div className="pdp-main-grid">
          
          {/* Coluna 1: Miniaturas + Foto Grande com Selo 11% OFF */}
          <div className="pdp-visual-col">
            <div className="pdp-thumbs-list">
              {galeriaFotos.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`pdp-thumb-item ${imagemExibida === img ? 'active' : ''}`}
                  onClick={() => setFotoPrincipal(img)}
                >
                  <img src={img} alt={`Ângulo ${idx + 1}`} />
                </button>
              ))}
            </div>

            <div className="pdp-main-image-container">
              {imagemExibida ? (
                <img
                  src={imagemExibida}
                  alt={produto.nome}
                  className="pdp-main-img"
                />
              ) : (
                <div className="pdp-placeholder-box">
                  <span style={{ fontSize: '48px' }}>🕊️</span>
                  <p>Imagem em breve</p>
                </div>
              )}
            </div>
          </div>

          {/* Coluna 2: Dados de Compra */}
          <div className="pdp-details-col">
            {/* Breadcrumb em uppercase */}
            <div className="pdp-breadcrumbs">
              <Link to="/">Início</Link>
              <span className="sep">&gt;</span>
              <span>{produto.categoria?.nome || 'Camisetas'}</span>
              <span className="sep">&gt;</span>
              <span>{produto.colecao || 'Regular Fit'}</span>
              <span className="sep">&gt;</span>
              <span style={{ color: '#1e1e1e' }}>{produto.nome}</span>
            </div>

            {/* Título */}
            <h1 className="pdp-product-title">{produto.nome}</h1>

            {/* Resumo rápido de avaliações sob o título */}
            <button
              type="button"
              className="pdp-rating-badge-top"
              onClick={() => document.getElementById('secao-avaliacoes')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <span className="pdp-stars-inline">
                {renderEstrelas(resumoAvaliacoes.total > 0 ? resumoAvaliacoes.media : 5)}
              </span>
              <span className="pdp-rating-count-text">
                {resumoAvaliacoes.total > 0
                  ? `${Number(resumoAvaliacoes.media).toFixed(1).replace('.', ',')} (${resumoAvaliacoes.total} ${resumoAvaliacoes.total === 1 ? 'avaliação' : 'avaliações'})`
                  : 'Seja o primeiro a avaliar'}
              </span>
            </button>

            {/* Preços */}
            <div className="pdp-price-row">
              <span className="pdp-current-price">
                {Number(precoBase).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            {/* Condições de Pagamento */}
            <div className="pdp-conditions-list">
              <div className="pdp-condition-item">
                <IconCard />
                <span>12 x de R$ {parcela12x}</span>
              </div>
            </div>

            <button
              type="button"
              className="pdp-more-details-link"
              onClick={() => {
                document.getElementById('detalhes-texto')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Ver mais detalhes
            </button>

            {/* Seletor de Modelo (Regular Fit / Oversized) */}
            <div className="pdp-selector-section">
              <div className="pdp-selector-label">
                Modelo: <strong>{modeloSelecionado}</strong>
              </div>
              <div className="pdp-sizes-list">
                {modelosDisponiveis.map((mod) => (
                  <button
                    key={mod}
                    type="button"
                    className={`pdp-size-chip ${modeloSelecionado === mod ? 'active' : ''}`}
                    style={{ padding: '0 14px' }}
                    onClick={() => handleSelecionarModelo(mod)}
                  >
                    {mod}
                  </button>
                ))}
              </div>
            </div>

            {/* Seletor de Cores com Miniaturas e Bolinhas de Identificação */}
            <div className="pdp-selector-section">
              <div className="pdp-selector-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Cor: <strong>{corSelecionada || 'Preto'}</strong></span>
                <span
                  style={{
                    display: 'inline-block',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    backgroundColor: getHexCor(corSelecionada),
                    border: '1px solid #ccc',
                    verticalAlign: 'middle',
                  }}
                />
              </div>
              <div className="pdp-color-thumbnails">
                {coresExibicao.map((cor, idx) => {
                  // A 1ª cor mostra a foto 1 da aba Vitrine/Cores (idx 0), a 2ª cor mostra a foto 2 (idx 1), etc.
                  const imgMin = fotosCores[idx < fotosCores.length ? idx : 0] || fotosCores[0];

                  return (
                    <button
                      key={cor}
                      type="button"
                      className={`pdp-color-thumb-btn ${corSelecionada === cor ? 'active' : ''}`}
                      onClick={() => handleSelecionarCor(cor, idx)}
                      title={cor}
                    >
                      {imgMin ? (
                        <img src={imgMin} alt={cor} />
                      ) : (
                        <span style={{ fontSize: '10px' }}>{cor}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seletor de Tamanhos */}
            <div className="pdp-selector-section">
              <div className="pdp-selector-label">
                Tamanho: <strong>{tamanhoSelecionado}</strong>
              </div>
              <div className="pdp-sizes-list">
                {TAMANHOS_PADRAO.map((tam) => {
                  const estoqueTam = getEstoqueTamanho(tam);
                  const semEstoque = estoqueTam <= 0;

                  return (
                    <button
                      key={tam}
                      type="button"
                      className={`pdp-size-chip ${tamanhoSelecionado === tam ? 'active' : ''} ${semEstoque ? 'sem-estoque' : ''}`}
                      disabled={semEstoque}
                      onClick={() => {
                        if (!semEstoque) {
                          setTamanhoSelecionado(tam);
                        }
                      }}
                      title={semEstoque ? `Tamanho ${tam} sem estoque` : `Tamanho ${tam} (${estoqueTam} un)`}
                    >
                      {tam}
                    </button>
                  );
                })}
              </div>
              <div className="pdp-size-guide-row">
                <span>↔</span>
                <button
                  type="button"
                  onClick={() => alert('Guia de Medidas Salv Sacra:\nPP: 68x48cm\nP: 70x50cm\nM: 72x52cm\nG: 75x55cm\nGG: 78x58cm\nG1: 80x60cm\nG2: 82x62cm')}
                >
                  Guia de medidas
                </button>
              </div>
            </div>

            {/* Seletor de Quantidade + Botão COMPRAR */}
            <div className="pdp-purchase-row">
              <div className="pdp-quantity-selector">
                <button
                  type="button"
                  className="pdp-qty-action-btn"
                  disabled={quantidade <= 1}
                  onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <span className="pdp-qty-current">{quantidade}</span>
                <button
                  type="button"
                  className="pdp-qty-action-btn"
                  onClick={() => setQuantidade((q) => q + 1)}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="pdp-cta-buy"
                onClick={handleComprar}
              >
                ADICIONAR AO CARRINHO
              </button>

              <button
                type="button"
                onClick={async () => {
                  const favoritou = await toggleFavorite(produto);
                  setToastMessage(favoritou ? 'Peça salva na sua lista de desejos ❤️' : 'Peça removida da lista de desejos.');
                  setTimeout(() => setToastMessage(null), 3000);
                }}
                title={isFavorite(produto.id) ? 'Remover dos favoritos' : 'Salvar na lista de desejos'}
                aria-label={isFavorite(produto.id) ? 'Remover dos favoritos' : 'Salvar na lista de desejos'}
                style={{
                  width: '44px',
                  height: '44px',
                  flexShrink: 0,
                  borderRadius: '6px',
                  border: `1.5px solid ${isFavorite(produto.id) ? '#dc2626' : '#c8c8c8'}`,
                  background: isFavorite(produto.id) ? '#fef2f2' : '#fff',
                  color: isFavorite(produto.id) ? '#dc2626' : '#333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill={isFavorite(produto.id) ? '#dc2626' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>

            {/* Meios de Envio (Frete) */}
            <div className="pdp-shipping-card">
              <div className="pdp-shipping-heading">
                <IconTruck />
                <span>Meios de envio</span>
              </div>
              <form onSubmit={handleSimularFrete} className="pdp-shipping-inline-form">
                <input
                  type="text"
                  placeholder="00000-000"
                  maxLength="9"
                  value={cep}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '').slice(0, 8);
                    if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5)}`;
                    setCep(v);
                  }}
                  className="pdp-cep-input"
                />
                <button type="submit" className="pdp-cep-calc-btn" disabled={calculandoFrete}>
                  {calculandoFrete ? 'CALCULANDO...' : 'CALCULAR'}
                </button>
              </form>
              <button
                type="button"
                className="pdp-nao-sei-cep"
                onClick={() => window.open('https://buscacepinter.correios.com.br/', '_blank')}
              >
                Não sei meu CEP
              </button>

              {freteResultado && (
                <div style={{ marginTop: '12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {freteResultado.local && (
                    <div style={{ fontSize: '11px', color: '#555', marginBottom: '2px' }}>
                      📍 Destino: <strong>{freteResultado.local}</strong>
                    </div>
                  )}
                  {freteResultado.opcoes?.map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#fff', border: '1px solid #e9ecef', borderRadius: '4px' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#111' }}>{f.tipo}</div>
                        <div style={{ fontSize: '11px', color: '#666' }}>{f.prazo}</div>
                      </div>
                      <span style={{ fontWeight: 700, color: f.gratis ? '#1e8449' : '#111', fontSize: '13px' }}>{f.valor}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selos de Confiança */}
            <div className="pdp-trust-features">
              <div className="pdp-trust-item">
                <div className="pdp-trust-icon"><IconShield /></div>
                <div>
                  <h4>Compra protegida</h4>
                  <p>Seus dados cuidados durante toda a compra.</p>
                </div>
              </div>
              <div className="pdp-trust-item">
                <div className="pdp-trust-icon"><IconRotate /></div>
                <div>
                  <h4>Trocas e devoluções</h4>
                  <p>Se não gostar, você pode trocar ou devolver.</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── PARTE INFERIOR (FIGMA SEGUNDA IMAGEM) ── */}
        
        {/* Seção de Texto Descritivo e Devoção */}
        <section id="detalhes-texto" className="pdp-text-details-section">
          <p className="lead-devocao">
            <strong>{produto.devocao ? produto.devocao.nome.toUpperCase() : 'NOSSA SENHORA DESATADORA DOS NÓS'}</strong>{' '}
            {produto.devocao?.descricao ||
              'é uma das invocações da Virgem Maria, simbolizando sua intercessão para resolver dificuldades e "nós" da vida dos fiéis que parecem impossíveis de serem desatados sozinhos.'}
          </p>

          <p>
            {produto.descricao ||
              'Confeccionada em malha premium fio 30 penteado, oferece um toque macio e alta durabilidade, garantindo conforto durante todo o dia.'}
          </p>

          <p>
            Sua estampa tradicional em <em>silk screen</em> proporciona cores vibrantes e resistência, permitindo que você lave na máquina e passe a ferro sem preocupações. Disponível nos tamanhos PP, P, M, G, GG, G1 e G2, atende a todos os perfis.
          </p>

          <p>
            Mais do que uma peça de roupa, esta camiseta é uma forma de <strong>evangelizar diariamente</strong>, carregando a fé em cada detalhe. Ideal para quem busca qualidade, durabilidade e uma mensagem inspiradora em seu vestuário.
          </p>

          <p>
            Garanta já a sua e viva a fé com conforto e estilo!
          </p>

          {/* Compartilhamento Social */}
          <div className="pdp-social-share-row">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="pdp-share-icon-btn" aria-label="Facebook">f</a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="pdp-share-icon-btn" aria-label="X">𝕏</a>
            <a href="https://pinterest.com" target="_blank" rel="noreferrer" className="pdp-share-icon-btn" aria-label="Pinterest">P</a>
          </div>
        </section>

        {/* ── SEÇÃO DE AVALIAÇÕES DOS CLIENTES ── */}
        <section id="secao-avaliacoes" className="pdp-reviews-section">
          <h2 className="pdp-reviews-title">Avaliações de Clientes</h2>

          <div className="pdp-reviews-grid">
            {/* Coluna Esquerda: Média + Barras de Distribuição */}
            <div className="pdp-reviews-summary-card">
              <div className="pdp-reviews-big-score">
                <span className="pdp-reviews-big-number">
                  {resumoAvaliacoes.total > 0 ? Number(resumoAvaliacoes.media).toFixed(1).replace('.', ',') : '0,0'}
                </span>
                <span className="pdp-reviews-big-max">/ 5,0</span>
              </div>
              <div className="pdp-stars-inline" style={{ fontSize: '18px', marginBottom: '6px' }}>
                {renderEstrelas(resumoAvaliacoes.media)}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Baseado em <strong>{resumoAvaliacoes.total}</strong> {resumoAvaliacoes.total === 1 ? 'avaliação' : 'avaliações'}
              </div>

              <div className="pdp-reviews-bars">
                {[5, 4, 3, 2, 1].map((estrela) => {
                  const qtd = resumoAvaliacoes.distribuicao?.[estrela] || 0;
                  const pct = resumoAvaliacoes.total > 0 ? Math.round((qtd / resumoAvaliacoes.total) * 100) : 0;
                  return (
                    <div key={estrela} className="pdp-review-bar-row">
                      <span className="pdp-review-bar-label">{estrela} ★</span>
                      <div className="pdp-review-bar-track">
                        <div className="pdp-review-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="pdp-review-bar-count">{qtd}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Coluna Direita: Formulário + Lista de Depoimentos */}
            <div>
              {isAuthenticated ? (
                <form className="pdp-reviews-form-card" onSubmit={handleEnviarAvaliacao}>
                  <h3 className="pdp-reviews-form-title">Deixe sua avaliação sobre esta peça</h3>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '6px', fontWeight: 600 }}>
                    Sua nota:
                  </div>
                  <div className="pdp-star-picker" onMouseLeave={() => setHoverNota(0)}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const ativa = star <= (hoverNota || notaForm);
                      return (
                        <button
                          key={star}
                          type="button"
                          className={`pdp-star-picker-btn ${ativa ? 'active' : ''}`}
                          onMouseEnter={() => setHoverNota(star)}
                          onClick={() => setNotaForm(star)}
                          aria-label={`${star} estrelas`}
                        >
                          ★
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    className="pdp-review-input"
                    placeholder="Título da avaliação (opcional, ex: Tecido excelente!)"
                    maxLength={120}
                    value={tituloForm}
                    onChange={(e) => setTituloForm(e.target.value)}
                  />

                  <textarea
                    rows={3}
                    className="pdp-review-textarea"
                    placeholder="Conte o que achou do caimento, tecido e acabamento da camiseta..."
                    required
                    value={comentarioForm}
                    onChange={(e) => setComentarioForm(e.target.value)}
                  />

                  <button type="submit" className="pdp-review-submit-btn" disabled={enviandoAvaliacao}>
                    {enviandoAvaliacao ? 'Publicando...' : 'Publicar Avaliação'}
                  </button>
                </form>
              ) : (
                <div className="pdp-reviews-form-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 className="pdp-reviews-form-title" style={{ marginBottom: '4px' }}>Já adquiriu esta peça?</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                      Entre na sua conta para deixar sua nota e compartilhar sua opinião com outros clientes.
                    </p>
                  </div>
                  <Link
                    to="/login"
                    state={{ from: `/produto/${id}` }}
                    className="pdp-review-submit-btn"
                    style={{ textDecoration: 'none' }}
                  >
                    Fazer Login para Avaliar
                  </Link>
                </div>
              )}

              {/* Lista de Comentários */}
              {resumoAvaliacoes.avaliacoes.length === 0 ? (
                <div className="pdp-review-item-card" style={{ textAlign: 'center', color: '#777', padding: '28px 20px' }}>
                  Este produto ainda não possui avaliações. Seja o primeiro a avaliar!
                </div>
              ) : (
                <div className="pdp-reviews-list">
                  {resumoAvaliacoes.avaliacoes.map((av) => {
                    const podeExcluir = isAuthenticated && (user?.papel === 'admin' || Number(user?.id) === Number(av.user_id));
                    return (
                      <div key={av.id} className="pdp-review-item-card">
                        <div className="pdp-review-item-header">
                          <div>
                            <div className="pdp-review-author">
                              <span>{av.autor_nome}</span>
                              {av.compra_verificada && (
                                <span className="pdp-verified-badge">✓ Compra verificada</span>
                              )}
                            </div>
                            <div className="pdp-stars-inline" style={{ fontSize: '14px', marginTop: '4px' }}>
                              {renderEstrelas(av.nota)}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className="pdp-review-date">
                              {av.created_at ? new Date(av.created_at).toLocaleDateString('pt-BR') : ''}
                            </span>
                            {podeExcluir && (
                              <button
                                type="button"
                                onClick={() => handleExcluirAvaliacao(av.id)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </div>

                        {av.titulo && <div className="pdp-review-item-title">{av.titulo}</div>}
                        <p className="pdp-review-item-comment">{av.comentario}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Seção Produtos Similares (Carrossel Figma) */}
        {produtosSimilares.length > 0 && (
          <section className="pdp-similar-products-section">
            <h2 className="pdp-similar-title">Produtos similares</h2>

            <div className="pdp-similar-carousel-wrap">
              <button
                type="button"
                className="pdp-similar-arrow prev"
                onClick={() => scrollSimilares(-1)}
                aria-label="Anterior"
              >
                <IconChevronLeft />
              </button>

              <div className="pdp-similar-track" ref={similarTrackRef}>
                {produtosSimilares.map((sim) => (
                  <Link
                    key={sim.id}
                    to={`/produto/${sim.id}`}
                    className="pdp-similar-card"
                  >
                    <div className="pdp-similar-card-img-wrap">
                      {sim.imagem_url ? (
                        <img src={sim.imagem_url} alt={sim.nome} loading="lazy" />
                      ) : (
                        <span style={{ fontSize: '32px' }}>🕊️</span>
                      )}
                      {/* Dots indicativos de cores */}
                      <div className="pdp-similar-card-dots">
                        <span className="pdp-similar-dot" />
                        <span className="pdp-similar-dot gold" />
                      </div>
                    </div>

                    <div className="pdp-similar-card-info">
                      <span className="pdp-similar-card-name">{sim.nome}</span>
                      <span className="pdp-similar-espiar-btn">
                        <IconEye /> ESPIAR
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              <button
                type="button"
                className="pdp-similar-arrow next"
                onClick={() => scrollSimilares(1)}
                aria-label="Próximo"
              >
                <IconChevronRight />
              </button>
            </div>
          </section>
        )}

      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="pdp-toast">
          <IconCheck />
          <span>{toastMessage}</span>
          <Link to="/" style={{ color: '#c4953a', fontWeight: 'bold', marginLeft: '8px' }}>
            Continuar comprando
          </Link>
        </div>
      )}
    </div>
  );
}
