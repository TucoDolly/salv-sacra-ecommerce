import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWishlist } from '../../contexts/WishlistContext';
import api from '../../services/api';
import { getHexCor } from '../../constants/cores';
import IconPix from '../../components/IconPix';
import LoadingSpinner from '../../components/LoadingSpinner';
import ProdutoCard from '../../components/ProdutoCard';
import '../../styles/produto-detalhe.css';
import '../../styles/home.css';

function formatarTextoNegrito(texto) {
  if (!texto) return null;
  // Suporta tanto *palavra* (solicitado pelo usuário) quanto **palavra**
  const partes = String(texto).split(/(\*{1,2}[^*\n]+?\*{1,2})/g);
  return partes.map((parte, idx) => {
    if (
      (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) ||
      (parte.startsWith('*') && parte.endsWith('*') && parte.length > 2)
    ) {
      const conteudo = parte.replace(/^\*+|\*+$/g, '');
      return <strong key={idx}>{conteudo}</strong>;
    }
    return parte;
  });
}

function deduplicarCores(lista) {
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
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useWishlist();
  const { addItem, cep: globalCep, setCep: setGlobalCep, calcularFretePorCep } = useCart();
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
  const [notaForm, setNotaForm] = useState(0);
  const [hoverNota, setHoverNota] = useState(0);
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
  const [cep, setCep] = useState(globalCep || '');
  const [calculandoFrete, setCalculandoFrete] = useState(false);
  const [freteResultado, setFreteResultado] = useState(null);

  // Toast
  const [toastMessage, setToastMessage] = useState(null);
  const [modalLoginNecessario, setModalLoginNecessario] = useState(false);
  const [avaliacaoParaExcluir, setAvaliacaoParaExcluir] = useState(null);
  const [excluindoAvaliacao, setExcluindoAvaliacao] = useState(false);

  // Avisos de reposição de estoque
  const [avisosAtivos, setAvisosAtivos] = useState([]);
  const [enviandoAviso, setEnviandoAviso] = useState(false);

  // Configuração pública de parcelamento sem juros
  const [maxParcelasSemJuros, setMaxParcelasSemJuros] = useState(6);

  useEffect(() => {
    api.get('/configuracoes/publicas')
      .then((res) => {
        if (res.data?.cartao_parcelas_max) {
          const max = parseInt(res.data.cartao_parcelas_max, 10);
          if (max >= 1 && max <= 12) setMaxParcelasSemJuros(max);
        }
      })
      .catch(() => {});
  }, []);

  // Ref do carrossel similar
  const similarTrackRef = useRef(null);

  // Lista de tamanhos padrão: PP, P, M, G, GG, G1, G2
  const TAMANHOS_PADRAO = ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2'];

  const variacoes = produto?.variacoes || [];
  const coresConfig = Array.isArray(produto?.cores_config) ? produto.cores_config : [];

  // Obtém lista ordenada de cores: respeita cores_config se existir, senão usa variações (rigorosamente deduplicada)
  const coresExibicao = (() => {
    const coresVar = deduplicarCores(variacoes.map((v) => v.cor));
    if (coresConfig.length > 0) {
      const ordenadas = deduplicarCores(
        [...coresConfig]
          .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
          .map((c) => c.cor)
      ).filter((c) => coresVar.length === 0 || coresVar.map((x) => x.toLowerCase()).includes(c.toLowerCase()));
      coresVar.forEach((cor) => {
        if (!ordenadas.map((x) => x.toLowerCase()).includes(cor.toLowerCase())) {
          ordenadas.push(cor);
        }
      });
      return ordenadas.length > 0 ? ordenadas : (coresVar.length > 0 ? coresVar : ['Preta']);
    }
    return coresVar.length > 0 ? coresVar : ['Preta'];
  })();

  // Galeria de fotos menores do lado esquerdo da foto grande (com suporte a vínculo de cor)
  const galeriaFotos = (() => {
    if (!produto) return [];
    if (Array.isArray(produto.imagens) && produto.imagens.length > 0) {
      return produto.imagens
        .map((img) => {
          if (typeof img === 'object' && img !== null) {
            return { url: img.url || '', cor: img.cor || '' };
          }
          return { url: img || '', cor: '' };
        })
        .filter((item) => Boolean(item.url));
    }
    if (produto.imagem_url) {
      return [{ url: produto.imagem_url, cor: '' }];
    }
    return [];
  })();

  // Fotos da vitrine e das opções de cores
  const fotosCores = (() => {
    if (!produto) return [];
    if (Array.isArray(produto.imagens_vitrine) && produto.imagens_vitrine.filter(Boolean).length > 0) {
      return produto.imagens_vitrine.filter(Boolean);
    }
    return galeriaFotos.map((g) => g.url);
  })();

  const imagemExibida = fotoPrincipal || galeriaFotos[0]?.url || fotosCores[0] || produto?.imagem_url || '';

  const aplicarDadosFrete = useCallback((data, cepFormatado) => {
    if (!data) return;
    if (cepFormatado) {
      setCep(cepFormatado);
      setGlobalCep(cepFormatado);
    }
    const partesLocal = [];
    if (data.logradouro) partesLocal.push(data.logradouro);
    if (data.bairro) partesLocal.push(data.bairro);
    if (data.cidade) partesLocal.push(`${data.cidade}/${data.uf}`);
    else if (data.uf) partesLocal.push(data.uf);

    setFreteResultado({
      local: partesLocal.join(', ') || (data.cidade ? `${data.cidade}/${data.uf}` : ''),
      opcoes: (data.opcoes || []).map((o) => ({
        tipo: o.nome,
        prazo: o.prazo,
        valor: o.preco === 0 ? 'GRÁTIS' : o.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        gratis: o.preco === 0,
      })),
    });
  }, [setGlobalCep]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAvisosAtivos([]);
      return;
    }
    api.get('/avisos-estoque', { params: { produto_id: id } })
      .then((res) => setAvisosAtivos(res.data?.avisos || []))
      .catch(() => {});
  }, [isAuthenticated, id]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setErro(null);

    // Busca produto atual
    api.get(`/produtos/${id}`)
      .then((res) => {
        const prod = res.data;
        setProduto(prod);
        const vars = prod.variacoes || [];

        const configsOrdenadas = Array.isArray(prod.cores_config)
          ? [...prod.cores_config].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
          : [];

        // Cor primária: definida pela 1ª cor das configurações de cores/vitrine, ou pela 1ª variação cadastrada
        const corPrimaria = (configsOrdenadas.length > 0 && configsOrdenadas[0]?.cor?.trim())
          || (vars[0]?.cor?.trim())
          || 'Preto';

        const cfgPrimaria = configsOrdenadas.find((c) => (c.cor || '').trim().toLowerCase() === corPrimaria.toLowerCase());
        const galeriaInicial = Array.isArray(prod.imagens) && prod.imagens.filter(Boolean).length > 0
          ? prod.imagens.filter(Boolean)
          : [];
        const vitrineInicial = Array.isArray(prod.imagens_vitrine) && prod.imagens_vitrine.filter(Boolean).length > 0
          ? prod.imagens_vitrine.filter(Boolean)
          : galeriaInicial;

        // Foto primária correspondente à cor primária
        const fotoPrimaria = cfgPrimaria?.imagem_url
          || galeriaInicial[0]
          || vitrineInicial[0]
          || prod.imagem_url
          || '';

        setFotoPrincipal(fotoPrimaria);
        setCorSelecionada(corPrimaria);

        // Variação inicial: busca uma variação que corresponda à COR PRIMÁRIA (priorizando com estoque > 0)
        const varsDaCor = vars.filter((v) => (v.cor || '').trim().toLowerCase() === corPrimaria.toLowerCase());
        const varInicial = varsDaCor.find((v) => Number(v.estoque) > 0)
          || varsDaCor[0]
          || vars.find((v) => Number(v.estoque) > 0)
          || vars[0];

        if (varInicial) {
          const modInicial = varInicial.modelo || (prod.modelo === 'Oversized' ? 'Oversized' : 'Regular Fit');
          setModeloSelecionado(modInicial);
          setTamanhoSelecionado(varInicial.tamanho || 'M');
        } else {
          setModeloSelecionado(prod.modelo === 'Oversized' ? 'Oversized' : 'Regular Fit');
          setTamanhoSelecionado('M');
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

  // Sincroniza CEP com endereço do cliente / carrinho e calcula o frete automaticamente
  useEffect(() => {
    const cepAlvo = cep || globalCep;
    if (globalCep && !cep) {
      setCep(globalCep);
    }
    const limpo = String(cepAlvo || '').replace(/\D/g, '');
    if (limpo.length === 8 && produto && !freteResultado && !calculandoFrete) {
      const precoItem = Number(produto.preco_base || produto.preco || 79.9);
      setCalculandoFrete(true);
      calcularFretePorCep(limpo, precoItem * quantidade, quantidade)
        .then((data) => {
          if (data) {
            const formatado = `${limpo.slice(0, 5)}-${limpo.slice(5)}`;
            aplicarDadosFrete(data, formatado);
          }
        })
        .catch(() => {})
        .finally(() => setCalculandoFrete(false));
    }
  }, [cep, globalCep, produto, quantidade, freteResultado, calculandoFrete, calcularFretePorCep, aplicarDadosFrete]);

  const scrollSimilares = (dir) => {
    if (similarTrackRef.current) {
      const cardEl = similarTrackRef.current.querySelector('.produto-card');
      const step = cardEl ? (cardEl.offsetWidth + 20) * 4 : similarTrackRef.current.clientWidth;
      similarTrackRef.current.scrollBy({ left: dir * step, behavior: 'smooth' });
    }
  };

  // Opções de modelo disponíveis para a peça
  const modelosDisponiveis = (() => {
    if (!produto) return ['Regular Fit'];
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

  // Ao clicar em uma cor, muda corSelecionada e alterna a foto principal (procura na galeria vinculada ou vitrine)
  const handleSelecionarCor = (cor, idx) => {
    setCorSelecionada(cor);

    // 1. Procura foto da galeria lateral vinculada a esta cor
    const fotoGaleriaDaCor = galeriaFotos.find(
      (item) => item.cor && item.cor.trim().toLowerCase() === cor.trim().toLowerCase()
    );
    if (fotoGaleriaDaCor?.url) {
      setFotoPrincipal(fotoGaleriaDaCor.url);
      return;
    }

    // 2. Procura nas configurações de cores (Aba 1)
    const cfg = coresConfig.find((c) => c.cor?.toLowerCase() === cor?.toLowerCase());
    if (cfg?.imagem_url) {
      setFotoPrincipal(cfg.imagem_url);
    } else {
      const vitrineImgs = Array.isArray(produto?.imagens_vitrine) && produto.imagens_vitrine.filter(Boolean).length > 0
        ? produto.imagens_vitrine.filter(Boolean)
        : galeriaFotos.map((g) => g.url);
      const fotoCor = vitrineImgs[idx < vitrineImgs.length ? idx : 0] || vitrineImgs[0];
      if (fotoCor) {
        setFotoPrincipal(fotoCor);
      }
    }
  };

  // Garante que a quantidade nunca ultrapasse o estoque disponível para a variação selecionada
  useEffect(() => {
    const est = getEstoqueTamanho(tamanhoSelecionado);
    if (est > 0 && quantidade > est) {
      setQuantidade(est);
    }
  }, [tamanhoSelecionado, corSelecionada, modeloSelecionado]);

  // ── Aviso de reposição de estoque ──
  const tamanhoEsgotado = variacoes.length > 0 && getEstoqueTamanho(tamanhoSelecionado) <= 0;
  const avisoAtivo = isAuthenticated && avisosAtivos.some((av) => {
    const matchProd = Number(av.produto_id) === Number(id);
    const matchTam = (av.tamanho || '').toUpperCase() === (tamanhoSelecionado || '').toUpperCase();
    const matchCor = !av.cor || !corSelecionada || av.cor.toLowerCase() === corSelecionada.toLowerCase();
    const matchMod = !av.modelo || !modeloSelecionado || av.modelo.toLowerCase() === modeloSelecionado.toLowerCase();
    return matchProd && matchTam && matchCor && matchMod;
  });

  const handleAvisarReposicao = async () => {
    if (!isAuthenticated) {
      sessionStorage.setItem('salv_redirect_after_auth', `/produto/${id}`);
      setModalLoginNecessario(true);
      return;
    }

    setEnviandoAviso(true);
    try {
      const payload = {
        produto_id: Number(id),
        tamanho: tamanhoSelecionado,
        cor: corSelecionada || null,
        modelo: modeloSelecionado || null,
      };

      const { data } = await api.post('/avisos-estoque', payload);

      if (data.ativo) {
        setAvisosAtivos((prev) => [...prev, payload]);
      } else {
        setAvisosAtivos((prev) =>
          prev.filter((av) => {
            const matchProd = Number(av.produto_id) === Number(id);
            const matchTam = (av.tamanho || '').toUpperCase() === (tamanhoSelecionado || '').toUpperCase();
            const matchCor = !av.cor || !corSelecionada || av.cor.toLowerCase() === corSelecionada.toLowerCase();
            const matchMod = !av.modelo || !modeloSelecionado || av.modelo.toLowerCase() === modeloSelecionado.toLowerCase();
            return !(matchProd && matchTam && matchCor && matchMod);
          })
        );
      }

      setToastMessage(data.message);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      setToastMessage(err.response?.data?.message || 'Não foi possível registrar o aviso.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setEnviandoAviso(false);
    }
  };

  const handleComprar = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem('salv_redirect_after_auth', `/produto/${id}`);
      setModalLoginNecessario(true);
      return;
    }

    const estoqueDisponivel = getEstoqueTamanho(tamanhoSelecionado);
    if (estoqueDisponivel <= 0) {
      alert(`O tamanho ${tamanhoSelecionado} (${modeloSelecionado}) para a cor ${corSelecionada} não está disponível no estoque.`);
      return;
    }

    if (quantidade > estoqueDisponivel) {
      alert(`Você selecionou ${quantidade} unidades, mas restam apenas ${estoqueDisponivel} un no estoque. Ajustamos a quantidade para o limite disponível.`);
      setQuantidade(estoqueDisponivel);
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
      estoque: estoqueDisponivel,
    });
  };

  const handleSimularFrete = async (e) => {
    if (e) e.preventDefault();
    const limpo = (cep || '').replace(/\D/g, '');
    if (limpo.length !== 8) {
      alert('Digite um CEP válido com 8 dígitos.');
      return;
    }
    setCalculandoFrete(true);
    setFreteResultado(null);
    try {
      const data = await calcularFretePorCep(
        limpo,
        Number(produto.preco_base || 79.9) * quantidade,
        quantidade
      );

      if (!data) {
        alert('Não foi possível calcular o frete para este CEP.');
        return;
      }

      const formatado = `${limpo.slice(0, 5)}-${limpo.slice(5)}`;
      aplicarDadosFrete(data, formatado);
    } catch (err) {
      alert(err.response?.data?.message || 'Não foi possível calcular o frete para este CEP.');
    } finally {
      setCalculandoFrete(false);
    }
  };

  const handleEnviarAvaliacao = async (e) => {
    e.preventDefault();
    if (!notaForm || notaForm < 1) {
      alert('Por favor, clique nas estrelas para selecionar uma nota de 1 a 5.');
      return;
    }
    if (!comentarioForm.trim()) {
      alert('Por favor, escreva um comentário sobre o produto.');
      return;
    }
    setEnviandoAvaliacao(true);
    try {
      await api.post(`/produtos/${id}/avaliacoes`, {
        nota: notaForm,
        comentario: comentarioForm.trim(),
      });
      setComentarioForm('');
      setNotaForm(0);
      carregarAvaliacoes(id);
      setToastMessage('Sua avaliação foi salva com sucesso!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Não foi possível enviar sua avaliação.');
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  const handleExcluirAvaliacao = (avId) => {
    setAvaliacaoParaExcluir(avId);
  };

  const confirmarExcluirAvaliacao = async () => {
    if (!avaliacaoParaExcluir) return;
    setExcluindoAvaliacao(true);
    try {
      await api.delete(`/avaliacoes/${avaliacaoParaExcluir}`);
      setAvaliacaoParaExcluir(null);
      carregarAvaliacoes(id);
      setToastMessage('Avaliação excluída com sucesso.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      alert('Não foi possível remover a avaliação.');
    } finally {
      setExcluindoAvaliacao(false);
    }
  };

  const renderEstrelas = (nota) => {
    const arredondada = Math.round(Number(nota || 0));
    if (arredondada <= 0) {
      return [1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: '#d1d5db' }}>★</span>
      ));
    }
    return Array.from({ length: arredondada }, (_, i) => (
      <span key={i} style={{ color: '#c4953a' }}>★</span>
    ));
  };

  if (loading) {
    return (
      <div className="pdp-wrapper">
        <div className="pdp-container" style={{ padding: '80px 0' }}>
          <LoadingSpinner size="lg" />
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
  const textoParcelamento = (() => {
    const maxSemJuros = Math.min(maxParcelasSemJuros, Math.max(1, Math.floor(precoBase / 50)));
    const valorParcela = (precoBase / maxSemJuros).toFixed(2).replace('.', ',');
    if (maxSemJuros === 1) {
      return `1x de R$ ${Number(precoBase).toFixed(2).replace('.', ',')} sem juros`;
    }
    return `em até ${maxSemJuros}x de R$ ${valorParcela} sem juros`;
  })();

  return (
    <div className="pdp-wrapper">
      <div className="pdp-container">
        {/* ── GRID PRINCIPAL (FIGMA PARTE SUPERIOR) ── */}
        <div className="pdp-main-grid">
          
          {/* Coluna 1: Miniaturas + Foto Grande com Selo 11% OFF */}
          <div className="pdp-visual-col">
            <div className="pdp-thumbs-list">
              {galeriaFotos.map((item, idx) => {
                const url = typeof item === 'object' && item !== null ? item.url : item;
                const cor = typeof item === 'object' && item !== null ? item.cor : '';
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`pdp-thumb-item ${imagemExibida === url ? 'active' : ''}`}
                    onClick={() => {
                      setFotoPrincipal(url);
                      if (cor) {
                        setCorSelecionada(cor);
                      }
                    }}
                    title={cor ? `Ver foto da cor ${cor}` : `Ângulo ${idx + 1}`}
                  >
                    <img src={url} alt={`Ângulo ${idx + 1}`} />
                  </button>
                );
              })}
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
              <Link to="/produtos?categoria=camisetas">{produto.categoria?.nome || 'Camisetas'}</Link>
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
                {renderEstrelas(resumoAvaliacoes.total > 0 ? resumoAvaliacoes.media : 0)}
              </span>
              <span className="pdp-rating-count-text">
                {resumoAvaliacoes.total > 0
                  ? `(${resumoAvaliacoes.total} ${resumoAvaliacoes.total === 1 ? 'avaliação' : 'avaliações'})`
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
                <span>{textoParcelamento}</span>
              </div>
              <div className="pdp-condition-item" style={{ marginTop: '2px' }}>
                <span>ou</span>
                <IconPix size={15} />
                <span>Pix</span>
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
                  const cfg = coresConfig.find((c) => c.cor?.toLowerCase() === cor.toLowerCase());
                  const imgMin = cfg?.imagem_url || fotosCores[idx < fotosCores.length ? idx : 0] || fotosCores[0];

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
                      style={semEstoque ? { cursor: 'pointer' } : undefined}
                      onClick={() => setTamanhoSelecionado(tam)}
                      title={semEstoque ? `Tamanho ${tam} esgotado — clique para ser avisado quando voltar` : `Tamanho ${tam} (${estoqueTam} un)`}
                    >
                      {tam}
                    </button>
                  );
                })}
              </div>
              <div className="pdp-size-guide-row">
                <span>↔</span>
                <Link
                  to="/guia-de-medidas"
                  style={{
                    color: 'inherit',
                    textDecoration: 'underline',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Guia de medidas
                </Link>
              </div>

              {/* Aviso de estoque baixo (últimas 5 unidades) */}
              {(() => {
                const estoqueAtual = getEstoqueTamanho(tamanhoSelecionado);
                if (estoqueAtual > 0 && estoqueAtual <= 5) {
                  return (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '9px 14px',
                        borderRadius: '8px',
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        color: '#92400e',
                        fontSize: '13px',
                        fontWeight: 600,
                        marginTop: '12px',
                      }}
                    >
                      <span style={{ fontSize: '15px' }}>⚡</span>
                      <span>
                        {estoqueAtual === 1
                          ? 'Resta apenas 1 unidade disponível! Garanta a sua antes que esgote.'
                          : `Restam apenas as últimas ${estoqueAtual} unidades deste tamanho/cor!`}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
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
                  disabled={getEstoqueTamanho(tamanhoSelecionado) <= 0 || quantidade >= getEstoqueTamanho(tamanhoSelecionado)}
                  onClick={() => setQuantidade((q) => Math.min(getEstoqueTamanho(tamanhoSelecionado), q + 1))}
                  title={quantidade >= getEstoqueTamanho(tamanhoSelecionado) ? `Limite de estoque (${getEstoqueTamanho(tamanhoSelecionado)} un)` : 'Aumentar quantidade'}
                >
                  +
                </button>
              </div>

              {tamanhoEsgotado ? (
                <button
                  type="button"
                  className="pdp-cta-buy"
                  onClick={handleAvisarReposicao}
                  disabled={enviandoAviso}
                  style={avisoAtivo ? { background: '#fff', color: '#1e1e1e', border: '1.5px solid #1e1e1e' } : undefined}
                >
                  {enviandoAviso ? 'Aguarde...' : (avisoAtivo ? '🔔 AVISO ATIVADO (CANCELAR)' : '🔔 AVISE-ME QUANDO CHEGAR')}
                </button>
              ) : (
                <button
                  type="button"
                  className="pdp-cta-buy"
                  onClick={handleComprar}
                  disabled={getEstoqueTamanho(tamanhoSelecionado) <= 0 || quantidade > getEstoqueTamanho(tamanhoSelecionado)}
                  style={getEstoqueTamanho(tamanhoSelecionado) <= 0 || quantidade > getEstoqueTamanho(tamanhoSelecionado) ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                >
                  {quantidade > getEstoqueTamanho(tamanhoSelecionado) ? 'ESTOQUE INSUFICIENTE' : 'ADICIONAR AO CARRINHO'}
                </button>
              )}

              {isAuthenticated && (
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
              )}
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
        
        {/* Seção de Texto Descritivo (Fiel ao cadastro no Admin) */}
        <section id="detalhes-texto" className="pdp-text-details-section">
          {produto.descricao ? (
            <div
              className="pdp-descricao-texto"
              style={{
                fontSize: '14.5px',
                lineHeight: '1.8',
                color: '#333333',
                whiteSpace: 'pre-line',
                margin: '0 0 24px',
              }}
            >
              {formatarTextoNegrito(produto.descricao)}
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic', margin: '0 0 24px' }}>
              Sem descrição cadastrada para este produto.
            </p>
          )}

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
                (resumoAvaliacoes.pode_avaliar || user?.papel === 'admin') ? (
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
                  <div className="pdp-reviews-form-card" style={{ padding: '24px 28px', background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                    <h3 className="pdp-reviews-form-title" style={{ marginBottom: '6px', fontSize: '15px' }}>
                      Avaliação liberada após a entrega
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666', lineHeight: '1.5' }}>
                      {resumoAvaliacoes.motivo_bloqueio || 'Você poderá avaliar esta peça assim que o seu pedido for entregue. Agradecemos sua preferência!'}
                    </p>
                  </div>
                )
              ) : (
                <div className="pdp-reviews-form-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 className="pdp-reviews-form-title" style={{ marginBottom: '4px' }}>Já recebeu esta peça?</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                      Entre na sua conta para deixar sua avaliação após a entrega da sua encomenda.
                    </p>
                  </div>
                  <Link
                    to={`/login?redirect=${encodeURIComponent(`/produto/${id}`)}`}
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
                  Este produto ainda não possui avaliações.
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

                        <p className="pdp-review-item-comment">{av.comentario}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Seção Produtos Similares (Carrossel Figma / Editorial) */}
        {produtosSimilares.length > 0 && (
          <section className="pdp-similar-products-section">
            <h2 className="pdp-similar-title">Produtos similares</h2>

            <div className="carousel-wrapper">
              <button
                type="button"
                className="carousel-btn carousel-btn--prev"
                onClick={() => scrollSimilares(-1)}
                aria-label="Anterior"
              >
                <IconChevronLeft />
              </button>

              <div className="carousel-track" ref={similarTrackRef}>
                {produtosSimilares.map((sim) => (
                  <ProdutoCard key={sim.id} produto={sim} />
                ))}

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

              <button
                type="button"
                className="carousel-btn carousel-btn--next"
                onClick={() => scrollSimilares(1)}
                aria-label="Próximo"
              >
                <IconChevronRight />
              </button>
            </div>
          </section>
        )}

      </div>
      {toastMessage && (
        <div className="pdp-toast">
          <IconCheck />
          <span>{toastMessage}</span>
          <Link to="/" style={{ color: '#c4953a', fontWeight: 'bold', marginLeft: '8px' }}>
            Continuar comprando
          </Link>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Avaliação */}
      {avaliacaoParaExcluir && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => !excluindoAvaliacao && setAvaliacaoParaExcluir(null)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              maxWidth: '430px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px',
              }}
            >
              ⚠️
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111', margin: '0 0 8px' }}>
              Confirmar exclusão de avaliação
            </h3>
            <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5, margin: '0 0 24px' }}>
              Tem certeza de que deseja excluir esta avaliação? Esta ação não poderá ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setAvaliacaoParaExcluir(null)}
                disabled={excluindoAvaliacao}
                style={{
                  flex: 1,
                  padding: '11px 18px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExcluirAvaliacao}
                disabled={excluindoAvaliacao}
                style={{
                  flex: 1,
                  padding: '11px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {excluindoAvaliacao ? 'Excluindo...' : 'Sim, excluir avaliação'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Login Necessário para Adicionar ao Carrinho */}
      {modalLoginNecessario && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setModalLoginNecessario(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              maxWidth: '430px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
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
              🛍️
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111', margin: '0 0 8px' }}>
              Faça login para continuar
            </h3>
            <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.5, margin: '0 0 24px' }}>
              Para adicionar peças à sua sacola de compras e finalizar pedidos, é necessário entrar na sua conta.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setModalLoginNecessario(false)}
                style={{
                  flex: 1,
                  padding: '11px 18px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalLoginNecessario(false);
                  sessionStorage.setItem('salv_redirect_after_auth', `/produto/${id}`);
                  navigate(`/login?redirect=${encodeURIComponent(`/produto/${id}`)}`, {
                    state: { from: `/produto/${id}` },
                  });
                }}
                style={{
                  flex: 1,
                  padding: '11px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#1e1e1e',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Fazer login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
