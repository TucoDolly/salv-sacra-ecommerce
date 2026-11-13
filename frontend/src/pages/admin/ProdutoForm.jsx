import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createProduto,
  getCategorias,
  getDevocaos,
  getProduto,
  updateProduto,
} from '../../services/produtoService';
import { uploadArquivoImagem } from '../../services/uploadService';
import { CORES_PADRAO, getHexCor } from '../../constants/cores';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../services/api';
import '../../styles/admin.css';

// ── Ícones ─────────────────────────────────────────────────────────────────
const IconArrowLeft = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);

const IconTrash = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

const IconPlus = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

// ── Estado inicial do formulário ───────────────────────────────────────────
const EMPTY_FORM = {
  nome: '',
  descricao: '',
  preco_base: '',
  imagem_url: '',
  disponivel: true,
  colecao: '',
  modelo: '',
  categoria_id: '',
  devocao_id: '',
};

const EMPTY_VARIACAO = { modelo: 'Regular Fit', tamanho: '', cor: '', estoque: '' };
const OPCOES_TAMANHO = ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2'];
const OPCOES_MODELO_VARIACAO = ['Regular Fit', 'Oversized'];

export default function ProdutoForm() {
  const { id }   = useParams();           // presente somente na rota de edição
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  // ── Estado ─────────────────────────────────────────────────────────────────
  const [form, setForm]                       = useState(EMPTY_FORM);
  const [abaFotos, setAbaFotos]               = useState('vitrine'); // 'vitrine' (Aba 1) | 'galeria' (Aba 2)
  const [imagens, setImagens]                 = useState([{ url: '', cor: '' }]);
  const [coresConfig, setCoresConfig]         = useState([{ cor: 'Preta', imagem_url: '' }]);
  const [variacoes, setVariacoes]             = useState([]);
  const imagensVitrine = coresConfig.map((c) => c.imagem_url || '');
  const coresDisponiveis = (() => {
    const vistas = new Set();
    const unicas = [];
    for (const c of coresConfig) {
      const nome = c.cor?.trim();
      if (!nome) continue;
      const chave = nome.toLowerCase();
      if (!vistas.has(chave)) {
        vistas.add(chave);
        unicas.push(nome);
      }
    }
    return unicas;
  })();
  const [uploading, setUploading]             = useState(null); // { tipo: 'galeria'|'vitrine', idx: number }
  const [errors, setErrors]       = useState({});
  const [apiError, setApiError]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(isEditing);

  // ── Listas para selects ────────────────────────────────────────────────────
  const [categorias, setCategorias] = useState([]);
  const [devocaos, setDevocaos]     = useState([]);
  const [colecoes, setColecoes]     = useState([]);
  const [modelos, setModelos]       = useState([]);

  // ── Carrega dados existentes (modo edição) ─────────────────────────────────
  const loadProduto = useCallback(async () => {
    setFetching(true);
    try {
      const { data } = await getProduto(id);
      setForm({
        nome:         data.nome         ?? '',
        descricao:    data.descricao    ?? '',
        preco_base:   data.preco_base   ?? '',
        imagem_url:   data.imagem_url   ?? '',
        disponivel:   data.disponivel   ?? true,
        colecao:      data.colecao      ?? '',
        modelo:       data.modelo       ?? '',
        categoria_id: data.categoria_id ?? '',
        devocao_id:   data.devocao_id   ?? '',
      });

      // Carrega lista de imagens da galeria lateral (Aba 2)
      let listaImgs = [];
      if (Array.isArray(data.imagens) && data.imagens.length > 0) {
        listaImgs = data.imagens.map((item) => {
          if (typeof item === 'object' && item !== null) {
            return { url: item.url || '', cor: item.cor || '' };
          }
          return { url: item || '', cor: '' };
        });
      } else if (data.imagem_url) {
        listaImgs = [{ url: data.imagem_url, cor: '' }];
      } else {
        listaImgs = [{ url: '', cor: '' }];
      }
      setImagens(listaImgs);

      // Carrega fotos e cores da vitrine (Aba 2)
      let initialCoresConfig = [];
      if (Array.isArray(data.cores_config) && data.cores_config.length > 0) {
        initialCoresConfig = data.cores_config.map((c) => ({
          cor: c.cor || '',
          imagem_url: c.imagem_url || '',
        }));
      } else if (Array.isArray(data.imagens_vitrine) && data.imagens_vitrine.length > 0) {
        const coresVars = Array.from(new Set((data.variacoes ?? []).map((v) => v.cor).filter(Boolean)));
        initialCoresConfig = data.imagens_vitrine.map((url, idx) => ({
          cor: coresVars[idx] || (idx === 0 ? 'Preta' : idx === 1 ? 'Bege' : ''),
          imagem_url: url || '',
        }));
      } else {
        initialCoresConfig = [{ cor: 'Preta', imagem_url: '' }];
      }
      setCoresConfig(initialCoresConfig);

      setVariacoes(
        (data.variacoes ?? []).map(({ modelo, tamanho, cor, estoque }) => ({
          modelo: modelo || 'Regular Fit',
          tamanho,
          cor,
          estoque,
        }))
      );
    } catch {
      setApiError('Não foi possível carregar os dados do produto.');
    } finally {
      setFetching(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEditing) loadProduto();
  }, [isEditing, loadProduto]);

  // Busca categorias, devoções, coleções e modelos em paralelo ao montar o formulário
  useEffect(() => {
    Promise.all([
      getCategorias(),
      getDevocaos(),
      api.get('/colecoes').catch(() => ({ data: [] })),
      api.get('/modelos').catch(() => ({ data: [] })),
    ])
      .then(([catRes, devRes, colRes, modRes]) => {
        const toArray = (res) =>
          Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setCategorias(toArray(catRes));
        setDevocaos(toArray(devRes));
        setColecoes(toArray(colRes));
        setModelos(toArray(modRes));
      })
      .catch((err) => {
        console.error('Falha ao carregar taxonomias:', err);
      });
  }, []);

  // ── Handlers de campo principal ─────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Se o modelo na Classificação mudar para Regular Fit ou Oversized, sincroniza o modelo das variações
    if (name === 'modelo' && (value === 'Regular Fit' || value === 'Oversized')) {
      setVariacoes((prev) => prev.map((v) => ({ ...v, modelo: value })));
    }
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // ── Handlers de imagens da galeria (Aba 2: miniaturas laterais com opção de cor) ─
  const handleImagemChange = (index, value) => {
    setImagens((prev) =>
      prev.map((img, i) =>
        i === index
          ? typeof img === 'object' && img !== null
            ? { ...img, url: value }
            : { url: value, cor: '' }
          : img
      )
    );
    if (errors[`imagem_${index}`]) {
      setErrors((prev) => ({ ...prev, [`imagem_${index}`]: '' }));
    }
  };

  const handleImagemCorChange = (index, novaCor) => {
    setImagens((prev) =>
      prev.map((img, i) =>
        i === index
          ? typeof img === 'object' && img !== null
            ? { ...img, cor: novaCor }
            : { url: img || '', cor: novaCor }
          : img
      )
    );
  };

  const addImagem = () => {
    setImagens((prev) => [...prev, { url: '', cor: '' }]);
  };

  const removeImagem = (index) => {
    setImagens((prev) => {
      const novaLista = prev.filter((_, i) => i !== index);
      return novaLista.length > 0 ? novaLista : [{ url: '', cor: '' }];
    });
  };

  // ── Handlers de fotos da vitrine & opções de cores (Aba 2) ──────────────────
  const addFotoCor = () => {
    const jaUsadas = new Set(coresConfig.map((c) => c.cor?.trim().toLowerCase()));
    const proximaCor = CORES_PADRAO.find((c) => !jaUsadas.has(c.nome.toLowerCase()))?.nome || CORES_PADRAO[0].nome;
    setCoresConfig((prev) => [...prev, { cor: proximaCor, imagem_url: '' }]);
  };

  const removeFotoCor = (index) => {
    setCoresConfig((prev) => {
      const nova = prev.filter((_, i) => i !== index);
      return nova.length > 0 ? nova : [{ cor: 'Preta', imagem_url: '' }];
    });
  };

  const moverFotoCor = (index, direcao) => {
    setCoresConfig((prev) => {
      const novo = [...prev];
      const targetIdx = index + direcao;
      if (targetIdx < 0 || targetIdx >= novo.length) return prev;
      const temp = novo[index];
      novo[index] = novo[targetIdx];
      novo[targetIdx] = temp;
      return novo;
    });
  };

  const handleCorChange = (index, novaCor) => {
    setCoresConfig((prev) =>
      prev.map((c, i) => (i === index ? { ...c, cor: novaCor } : c))
    );
  };

  const handleImagemVitrineChange = (index, novaUrl) => {
    setCoresConfig((prev) =>
      prev.map((c, i) => (i === index ? { ...c, imagem_url: novaUrl } : c))
    );
    if (errors[`imagem_vitrine_${index}`]) {
      setErrors((prev) => ({ ...prev, [`imagem_vitrine_${index}`]: '' }));
    }
  };

  const handleFileUpload = async (file, index, tipo) => {
    if (!file) return;
    setUploading({ tipo, index });
    try {
      const url = await uploadArquivoImagem(file);
      if (tipo === 'galeria') {
        handleImagemChange(index, url);
      } else {
        handleImagemVitrineChange(index, url);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao enviar a imagem. Tente novamente.');
    } finally {
      setUploading(null);
    }
  };

  // ── Handlers e filtros de variações ──────────────────────────────────────────
  const [abaModeloAtiva, setAbaModeloAtiva] = useState('Regular Fit'); // 'Regular Fit' | 'Oversized'
  const [filtroTamanho, setFiltroTamanho]   = useState('');
  const [filtroCor, setFiltroCor]           = useState('');
  const [ordenacao, setOrdenacao]           = useState('tamanho_padrao'); // 'tamanho_padrao' | 'estoque_desc' | 'estoque_asc' | 'cor_asc'

  const addVariacao = () => {
    let modeloPadrao = 'Regular Fit';
    if (form.modelo === 'Ambos') {
      modeloPadrao = abaModeloAtiva;
    } else if (form.modelo === 'Oversized') {
      modeloPadrao = 'Oversized';
    }
    const corPadrao = coresDisponiveis[0] || 'Preta';
    setVariacoes((prev) => [
      ...prev,
      {
        modelo: modeloPadrao,
        tamanho: 'M',
        cor: corPadrao,
        estoque: 0,
      },
    ]);
  };

  const removeVariacao = (index) =>
    setVariacoes((prev) => prev.filter((_, i) => i !== index));

  const handleVariacaoChange = (index, e) => {
    const { name, value } = e.target;
    setVariacoes((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [name]: value } : v))
    );
  };

  // Cores cadastradas nas variações atuais
  const coresCadastradas = useMemo(() => {
    const conjunto = new Set();
    variacoes.forEach((v) => {
      if (v.cor && v.cor.trim()) conjunto.add(v.cor.trim());
    });
    return Array.from(conjunto);
  }, [variacoes]);

  // Lista de variações filtrada e ordenada (mantendo o originalIndex de cada uma)
  const variacoesFiltradasEOrdenadas = useMemo(() => {
    const comIndice = variacoes.map((v, originalIndex) => ({
      ...v,
      originalIndex,
      modelo: v.modelo || 'Regular Fit',
    }));

    return comIndice
      .filter((v) => {
        // Se o produto tiver ambos os modelos, filtra pelo modelo da aba ativa
        if (form.modelo === 'Ambos' && v.modelo !== abaModeloAtiva) {
          return false;
        }
        if (filtroTamanho && v.tamanho !== filtroTamanho) {
          return false;
        }
        if (filtroCor && (v.cor || '').toLowerCase() !== filtroCor.toLowerCase()) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (ordenacao === 'tamanho_padrao') {
          const idxA = OPCOES_TAMANHO.indexOf(a.tamanho);
          const idxB = OPCOES_TAMANHO.indexOf(b.tamanho);
          const posA = idxA === -1 ? 999 : idxA;
          const posB = idxB === -1 ? 999 : idxB;
          if (posA !== posB) return posA - posB;
          return (a.cor || '').localeCompare(b.cor || '');
        }
        if (ordenacao === 'estoque_desc') {
          const estA = Number(a.estoque) || 0;
          const estB = Number(b.estoque) || 0;
          if (estB !== estA) return estB - estA;
          const idxA = OPCOES_TAMANHO.indexOf(a.tamanho);
          const idxB = OPCOES_TAMANHO.indexOf(b.tamanho);
          return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
        }
        if (ordenacao === 'estoque_asc') {
          const estA = Number(a.estoque) || 0;
          const estB = Number(b.estoque) || 0;
          if (estA !== estB) return estA - estB;
          const idxA = OPCOES_TAMANHO.indexOf(a.tamanho);
          const idxB = OPCOES_TAMANHO.indexOf(b.tamanho);
          return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
        }
        if (ordenacao === 'cor_asc') {
          const comp = (a.cor || '').localeCompare(b.cor || '');
          if (comp !== 0) return comp;
          const idxA = OPCOES_TAMANHO.indexOf(a.tamanho);
          const idxB = OPCOES_TAMANHO.indexOf(b.tamanho);
          return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
        }
        return 0;
      });
  }, [variacoes, form.modelo, abaModeloAtiva, filtroTamanho, filtroCor, ordenacao]);

  // Contagens por modelo para as abas
  const contagemRegular = variacoes.filter((v) => (v.modelo || 'Regular Fit') === 'Regular Fit').length;
  const contagemOversized = variacoes.filter((v) => v.modelo === 'Oversized').length;

  // ── Validação client-side ────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.nome || !form.nome.trim()) errs.nome = 'O nome é obrigatório.';
    if (!form.preco_base && form.preco_base !== 0)
                                         errs.preco_base = 'O preço é obrigatório.';
    if (Number(form.preco_base) < 0)    errs.preco_base = 'O preço não pode ser negativo.';

    // Valida cada URL/caminho de imagem preenchida (suporta string ou objeto { url, cor })
    imagens.forEach((item, i) => {
      const urlStr = typeof item === 'object' && item !== null ? item.url : item;
      if (urlStr && typeof urlStr === 'string' && urlStr.trim() && !/^(https?:\/\/|\/storage\/|\/assets\/)/i.test(urlStr.trim())) {
        errs[`imagem_${i}`] = 'Informe um arquivo ou URL válida.';
      }
    });

    coresConfig.forEach((item, i) => {
      const urlStr = item?.imagem_url;
      if (urlStr && typeof urlStr === 'string' && urlStr.trim() && !/^(https?:\/\/|\/storage\/|\/assets\/)/i.test(urlStr.trim())) {
        errs[`imagem_vitrine_${i}`] = 'Informe um arquivo ou URL válida.';
      }
    });

    variacoes.forEach((v, i) => {
      if (!v.modelo?.trim())  errs[`variacao_${i}_modelo`]  = 'Modelo obrigatório.';
      if (!v.tamanho?.trim()) errs[`variacao_${i}_tamanho`] = 'Tamanho obrigatório.';
      if (!v.cor?.trim())     errs[`variacao_${i}_cor`]     = 'Cor obrigatória.';
      if (v.estoque === '' || isNaN(Number(v.estoque)))
                             errs[`variacao_${i}_estoque`] = 'Estoque inválido.';
    });

    return errs;
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const listaErros = Object.values(errs);
      const msgErro = listaErros[0];
      setApiError(`Não foi possível salvar: ${msgErro}`);
      alert(`Por favor, verifique os campos com pendência:\n- ${listaErros.slice(0, 3).join('\n- ')}`);
      return;
    }

    const imagensValidas = imagens
      .map((item) => {
        const url = (typeof item === 'object' && item !== null ? item.url : item || '').trim();
        const cor = (typeof item === 'object' && item !== null ? item.cor : '' || '').trim();
        return url ? { url, cor } : null;
      })
      .filter(Boolean);
    const coresConfigValidas = coresConfig
      .filter((c) => c.cor && c.cor.trim())
      .map((c, idx) => ({
        cor: c.cor.trim(),
        ordem: idx + 1,
        imagem_url: c.imagem_url ? c.imagem_url.trim() : null,
      }));
    const vitrineValidas = coresConfigValidas.map((c) => c.imagem_url).filter(Boolean);

    const primeiraFoto = vitrineValidas[0] || (imagensValidas[0]?.url || '') || '';

    const payload = {
      ...form,
      imagem_url:      primeiraFoto,
      imagens:         imagensValidas,
      imagens_vitrine: vitrineValidas,
      cores_config:    coresConfigValidas,
      preco_base:      form.preco_base   !== '' ? Number(form.preco_base)   : '',
      categoria_id:    form.categoria_id !== '' ? Number(form.categoria_id) : null,
      devocao_id:      form.devocao_id   !== '' ? Number(form.devocao_id)   : null,
      variacoes: variacoes.map((v) => ({
        modelo:
          form.modelo === 'Ambos'
            ? v.modelo || 'Regular Fit'
            : form.modelo || v.modelo || 'Regular Fit',
        tamanho: v.tamanho,
        cor:     v.cor,
        estoque: Number(v.estoque),
      })),
    };

    setLoading(true);
    try {
      if (isEditing) {
        await updateProduto(id, payload);
      } else {
        await createProduto(payload);
      }
      navigate('/admin/produtos');
    } catch (err) {
      console.error('Erro ao salvar produto:', err);
      // Erros de validação 422 do Laravel
      const laravelErrors = err.response?.data?.errors;
      if (laravelErrors) {
        const mapped = {};
        Object.entries(laravelErrors).forEach(([field, msgs]) => {
          mapped[field] = msgs[0];
        });
        setErrors(mapped);
      }
      const msg = err.response?.data?.message || 'Erro ao salvar o produto. Verifique os dados e tente novamente.';
      setApiError(msg);
      alert(`Erro ao salvar produto:\n${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Loading inicial (modo edição) ─────────────────────────────────────────
  if (fetching) {
    return (
      <div style={{ padding: '80px 20px' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="admin-form-page">
      {/* ── Voltar ── */}
      <Link to="/admin/produtos" className="admin-form-back">
        <IconArrowLeft /> Voltar para Produtos
      </Link>

      <h1 className="admin-form-title">
        {isEditing ? 'Editar Produto' : 'Novo Produto'}
      </h1>

      {apiError && <p className="admin-error">{apiError}</p>}

      <form onSubmit={handleSubmit} noValidate>

        {/* ════════════════════════════════════════════════════
            CARD 1 — Informações Principais
            ════════════════════════════════════════════════════ */}
        <div className="admin-card">
          <p className="admin-card-title">Informações Principais</p>

          {/* Nome */}
          <div className="admin-field" style={{ marginBottom: '16px' }}>
            <label htmlFor="nome">Nome *</label>
            <input
              id="nome"
              name="nome"
              type="text"
              value={form.nome}
              onChange={handleChange}
              placeholder="Ex: Terço de São Francisco"
            />
            {errors.nome && <span className="admin-field-error">{errors.nome}</span>}
          </div>

          {/* Descrição */}
          <div className="admin-field" style={{ marginBottom: '16px' }}>
            <label htmlFor="descricao">Descrição</label>
            <textarea
              id="descricao"
              name="descricao"
              value={form.descricao}
              onChange={handleChange}
              placeholder="Descrição detalhada do produto…"
            />
          </div>

          {/* Preço | Coleção */}
          <div className="admin-grid admin-grid-2" style={{ marginBottom: '16px' }}>
            <div className="admin-field">
              <label htmlFor="preco_base">Preço Base (R$) *</label>
              <input
                id="preco_base"
                name="preco_base"
                type="number"
                step="0.01"
                min="0"
                value={form.preco_base}
                onChange={handleChange}
                placeholder="0,00"
              />
              {errors.preco_base && <span className="admin-field-error">{errors.preco_base}</span>}
            </div>

            <div className="admin-field">
              <label htmlFor="colecao">Coleção</label>
              <select
                id="colecao"
                name="colecao"
                value={form.colecao}
                onChange={handleChange}
              >
                <option value="">— Selecione uma coleção —</option>
                {colecoes.map((c) => (
                  <option key={c.id || c.nome} value={c.nome}>
                    {c.nome}
                  </option>
                ))}
                {form.colecao && !colecoes.some((c) => c.nome?.toLowerCase() === form.colecao.toLowerCase()) && (
                  <option value={form.colecao}>{form.colecao}</option>
                )}
              </select>
            </div>
          </div>

          {/* ════ Fotos do Produto (2 Abas Separadas) ════ */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              Fotos do Produto
            </label>

            {/* Seletor de Abas de Fotos */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setAbaFotos('vitrine')}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  background: abaFotos === 'vitrine' ? '#1e1e1e' : '#f1f5f9',
                  color: abaFotos === 'vitrine' ? '#fff' : '#475569',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '6px 6px 0 0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                1. Vitrine (Hover) & Opções de Cores ({coresConfig.filter((c) => c.imagem_url).length})
              </button>
              <button
                type="button"
                onClick={() => setAbaFotos('galeria')}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  background: abaFotos === 'galeria' ? '#1e1e1e' : '#f1f5f9',
                  color: abaFotos === 'galeria' ? '#fff' : '#475569',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '6px 6px 0 0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                2. Galeria Lateral do Produto ({imagens.filter((i) => (typeof i === 'object' ? i?.url : i)).length})
              </button>
            </div>

            {/* ABA 1: Vitrine (Hover) & Opções de Cores */}
            {abaFotos === 'vitrine' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <p style={{ fontSize: '12px', color: '#555', margin: 0, flex: 1, minWidth: '260px' }}>
                    A <strong>1ª foto</strong> é a capa e a <strong>2ª foto</strong> aparece ao passar o mouse na vitrine. Cada item define uma <strong>cor e sua foto</strong> oficial. As variações abaixo só poderão escolher estas cores.
                  </p>
                  <button
                    type="button"
                    onClick={addFotoCor}
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                    style={{ flexShrink: 0, padding: '8px 14px' }}
                  >
                    <IconPlus /> Adicionar Foto e Cor
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  {coresConfig.map((item, idx) => {
                    const isUploadingThis = uploading?.tipo === 'vitrine' && uploading?.index === idx;
                    const rotuloOrdem =
                      idx === 0
                        ? '1ª (Capa / Primária)'
                        : idx === 1
                        ? '2ª (Hover / Secundária)'
                        : `${idx + 1}ª Cor`;

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          background: '#fdfbf7',
                          padding: '14px 16px',
                          borderRadius: '8px',
                          border: '1px solid #e5dec9',
                          flexWrap: 'wrap',
                        }}
                      >
                        {/* Reordenar + Rótulo da Posição */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '190px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moverFotoCor(idx, -1)}
                              title="Mover para cima"
                              style={{
                                background: idx === 0 ? '#f1f5f9' : '#e2e8f0',
                                color: idx === 0 ? '#94a3b8' : '#1e293b',
                                border: 'none',
                                borderRadius: '4px',
                                width: '22px',
                                height: '20px',
                                cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                fontSize: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                              }}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={idx === coresConfig.length - 1}
                              onClick={() => moverFotoCor(idx, 1)}
                              title="Mover para baixo"
                              style={{
                                background: idx === coresConfig.length - 1 ? '#f1f5f9' : '#e2e8f0',
                                color: idx === coresConfig.length - 1 ? '#94a3b8' : '#1e293b',
                                border: 'none',
                                borderRadius: '4px',
                                width: '22px',
                                height: '20px',
                                cursor: idx === coresConfig.length - 1 ? 'not-allowed' : 'pointer',
                                fontSize: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: 0,
                              }}
                            >
                              ▼
                            </button>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: idx === 0 ? '#c4953a' : idx === 1 ? '#0284c7' : '#475569' }}>
                              {rotuloOrdem}
                            </span>
                          </div>
                        </div>

                        {/* Seletor da Cor via Bolinhas com Tooltip (hover com nome da cor) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px', flex: '1 1 240px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                              Cor: <span style={{ color: '#0f172a' }}>{item.cor || 'Selecione'}</span>
                            </span>
                            <span
                              style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                backgroundColor: getHexCor(item.cor),
                                border: '1px solid #cbd5e1',
                                display: 'inline-block',
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {CORES_PADRAO.map((c) => {
                              const isSelected = (item.cor || '').trim().toLowerCase() === c.nome.toLowerCase();
                              return (
                                <button
                                  key={c.nome}
                                  type="button"
                                  onClick={() => handleCorChange(idx, c.nome)}
                                  title={c.nome}
                                  aria-label={c.nome}
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: c.hex,
                                    border: isSelected ? '2px solid #111' : `1.5px solid ${c.borda || '#cbd5e1'}`,
                                    boxShadow: isSelected
                                      ? '0 0 0 2px #fff, 0 0 0 4px #c4953a'
                                      : '0 1px 2px rgba(0,0,0,0.06)',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'inline-block',
                                    transition: 'all 0.15s ease',
                                    transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* Preview da Imagem */}
                        <div style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '6px',
                          border: '1.5px solid #cbd5e1',
                          background: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}>
                          {item.imagem_url ? (
                            <img
                              src={item.imagem_url}
                              alt={`Foto ${item.cor}`}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <span style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center', padding: '2px' }}>Sem foto</span>
                          )}
                        </div>

                        {/* Ações de Seleção de Arquivo e URL */}
                        <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 14px',
                                borderRadius: '6px',
                                background: isUploadingThis ? '#64748b' : '#c4953a',
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: isUploadingThis ? 'wait' : 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              📁 {isUploadingThis ? 'Enviando foto...' : (item.imagem_url ? 'Trocar Arquivo' : 'Escolher Arquivo')}
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isUploadingThis}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleFileUpload(e.target.files[0], idx, 'vitrine');
                                  }
                                }}
                                style={{ display: 'none' }}
                              />
                            </label>

                            {item.imagem_url && (
                              <span style={{ fontSize: '11px', color: '#64748b', wordBreak: 'break-all' }}>
                                Arquivo atual: <strong>{item.imagem_url.split('/').pop()}</strong>
                              </span>
                            )}
                          </div>

                          <input
                            type="text"
                            value={item.imagem_url}
                            onChange={(e) => handleImagemVitrineChange(idx, e.target.value)}
                            placeholder="Ou cole a URL direta da imagem aqui..."
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '4px',
                              border: errors[`imagem_vitrine_${idx}`] ? '1px solid #ef4444' : '1px solid #cbd5e1',
                              fontSize: '11px',
                              color: '#555',
                              background: '#fff',
                            }}
                          />

                          {errors[`imagem_vitrine_${idx}`] && (
                            <span className="admin-field-error" style={{ fontSize: '11px' }}>
                              {errors[`imagem_vitrine_${idx}`]}
                            </span>
                          )}
                        </div>

                        {coresConfig.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFotoCor(idx)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Remover esta cor/foto"
                          >
                            <IconTrash />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ABA 2: Galeria Lateral do Produto (com opção de vinculação de cor) */}
            {abaFotos === 'galeria' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                  <p style={{ fontSize: '12px', color: '#555', margin: 0, flex: 1 }}>
                    Estas fotos aparecem nas <strong>miniaturas menores ao lado esquerdo</strong> da foto grande na tela de detalhes do produto. Você pode selecionar qual cor cada foto representa para sincronizar com as cores do cliente.
                  </p>
                  <button
                    type="button"
                    onClick={addImagem}
                    className="admin-btn admin-btn-secondary admin-btn-sm"
                    style={{ flexShrink: 0, padding: '8px 14px' }}
                  >
                    <IconPlus /> Adicionar Foto
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  {imagens.map((item, idx) => {
                    const imgUrl = typeof item === 'object' && item !== null ? item.url : item || '';
                    const imgCor = typeof item === 'object' && item !== null ? item.cor : '';
                    const isUploadingThis = uploading?.tipo === 'galeria' && uploading?.index === idx;

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          background: '#f8fafc',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', minWidth: '85px' }}>
                          Miniatura {idx + 1}:
                        </span>

                        {/* Preview da Imagem */}
                        <div style={{
                          width: '54px',
                          height: '54px',
                          borderRadius: '6px',
                          border: '1.5px solid #cbd5e1',
                          background: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}>
                          {imgUrl ? (
                            <img
                              src={imgUrl}
                              alt={`Preview Galeria ${idx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Sem foto</span>
                          )}
                        </div>

                        {/* Seletor de cor vinculada a esta foto da galeria */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                            Cor desta foto:
                          </label>
                          <select
                            value={imgCor}
                            onChange={(e) => handleImagemCorChange(idx, e.target.value)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              border: '1.5px solid #cbd5e1',
                              fontSize: '12px',
                              background: '#fff',
                              color: '#1e293b',
                              fontWeight: 600,
                              outline: 'none',
                            }}
                          >
                            <option value="">— Foto Geral (Todas as cores) —</option>
                            {coresDisponiveis.map((cor) => (
                              <option key={cor} value={cor}>
                                {cor}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Ações de Seleção de Arquivo e URL */}
                        <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '7px 14px',
                                borderRadius: '6px',
                                background: isUploadingThis ? '#64748b' : '#1e1e1e',
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: isUploadingThis ? 'wait' : 'pointer',
                                transition: 'all 0.2s',
                              }}
                            >
                              📁 {isUploadingThis ? 'Enviando foto...' : (imgUrl ? 'Trocar Arquivo' : 'Escolher Arquivo de Imagem')}
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isUploadingThis}
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleFileUpload(e.target.files[0], idx, 'galeria');
                                  }
                                }}
                                style={{ display: 'none' }}
                              />
                            </label>

                            {imgUrl && (
                              <span style={{ fontSize: '11px', color: '#64748b', wordBreak: 'break-all' }}>
                                Arquivo atual: <strong>{imgUrl.split('/').pop()}</strong>
                              </span>
                            )}
                          </div>

                          <input
                            type="text"
                            value={imgUrl}
                            onChange={(e) => handleImagemChange(idx, e.target.value)}
                            placeholder="Ou cole a URL direta da imagem aqui..."
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '4px',
                              border: errors[`imagem_${idx}`] ? '1px solid #ef4444' : '1px solid #cbd5e1',
                              fontSize: '11px',
                              color: '#555',
                              background: '#fff',
                            }}
                          />

                          {errors[`imagem_${idx}`] && (
                            <span className="admin-field-error" style={{ fontSize: '11px' }}>
                              {errors[`imagem_${idx}`]}
                            </span>
                          )}
                        </div>

                        {imagens.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeImagem(idx)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Remover esta foto"
                          >
                            <IconTrash />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Disponível */}
          <div className="admin-field admin-field-row">
            <input
              id="disponivel"
              name="disponivel"
              type="checkbox"
              checked={form.disponivel}
              onChange={handleChange}
            />
            <label htmlFor="disponivel" style={{ textTransform: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
              Produto disponível para venda
            </label>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════
            CARD 2 — Classificação
            ════════════════════════════════════════════════════ */}
        <div className="admin-card">
          <p className="admin-card-title">Classificação</p>

          <div className={`admin-grid ${
            (() => {
              const catSelecionada = categorias.find((c) => String(c.id) === String(form.categoria_id));
              const isCamiseta = catSelecionada && catSelecionada.nome.toLowerCase().includes('camiseta');
              return isCamiseta ? 'admin-grid-3' : 'admin-grid-2';
            })()
          }`}>
            {/* Select de Categoria */}
            <div className="admin-field">
              <label htmlFor="categoria_id">Categoria</label>
              <select
                id="categoria_id"
                name="categoria_id"
                value={form.categoria_id}
                onChange={handleChange}
              >
                <option value="">— Selecione uma categoria —</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
              {errors.categoria_id && <span className="admin-field-error">{errors.categoria_id}</span>}
            </div>

            {/* Select de Devoção */}
            <div className="admin-field">
              <label htmlFor="devocao_id">Devoção</label>
              <select
                id="devocao_id"
                name="devocao_id"
                value={form.devocao_id}
                onChange={handleChange}
              >
                <option value="">— Sem devoção específica (Geral / Trindade / etc.) —</option>
                {devocaos.map((dev) => (
                  <option key={dev.id} value={dev.id}>{dev.nome}</option>
                ))}
              </select>
              {errors.devocao_id && <span className="admin-field-error">{errors.devocao_id}</span>}
            </div>

            {/* Select de Modelo (apenas se a categoria for Camisetas) */}
            {(() => {
              const catSelecionada = categorias.find((c) => String(c.id) === String(form.categoria_id));
              const isCamiseta = catSelecionada && catSelecionada.nome.toLowerCase().includes('camiseta');
              if (!isCamiseta) return null;

              const opcoesModelos = modelos && modelos.length > 0
                ? modelos.map((m) => m.nome)
                : ['Regular Fit', 'Oversized'];

              return (
                <div className="admin-field">
                  <label htmlFor="modelo">Modelo</label>
                  <select
                    id="modelo"
                    name="modelo"
                    value={form.modelo}
                    onChange={handleChange}
                  >
                    <option value="">— Selecione o modelo —</option>
                    {opcoesModelos.map((modNome) => (
                      <option key={modNome} value={modNome}>
                        {modNome}
                      </option>
                    ))}
                    <option value="Ambos">Ambos</option>
                  </select>
                  {errors.modelo && <span className="admin-field-error">{errors.modelo}</span>}
                </div>
              );
            })()}
          </div>
        </div>



        {/* ════════════════════════════════════════════════════
            CARD 3 — Variações
            ════════════════════════════════════════════════════ */}
        <div className="admin-card">
          <div className="admin-variacoes-header" style={{ marginBottom: '16px' }}>
            <div>
              <p className="admin-card-title" style={{ margin: 0, borderBottom: 'none', padding: 0 }}>
                Variações <span style={{ color: '#aaa', fontWeight: 400 }}>({variacoes.length})</span>
              </p>
              <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>
                Gerencie tamanhos, cores e estoque por modelo de forma organizada.
              </p>
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-secondary admin-btn-sm"
              onClick={addVariacao}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <IconPlus /> Adicionar Variação {form.modelo === 'Ambos' ? `em ${abaModeloAtiva}` : ''}
            </button>
          </div>

          {/* Abas de Modelos (quando a opção selecionada for "Ambos") */}
          {form.modelo === 'Ambos' && (
            <div style={{
              display: 'flex',
              gap: '8px',
              paddingBottom: '14px',
              marginBottom: '16px',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <button
                type="button"
                onClick={() => setAbaModeloAtiva('Regular Fit')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: abaModeloAtiva === 'Regular Fit' ? '1.5px solid #1e1e1e' : '1px solid #cbd5e1',
                  background: abaModeloAtiva === 'Regular Fit' ? '#1e1e1e' : '#fff',
                  color: abaModeloAtiva === 'Regular Fit' ? '#fff' : '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                <span>Regular Fit</span>
                <span style={{
                  padding: '1px 7px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  background: abaModeloAtiva === 'Regular Fit' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                  color: abaModeloAtiva === 'Regular Fit' ? '#fff' : '#334155',
                }}>
                  {contagemRegular}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAbaModeloAtiva('Oversized')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  border: abaModeloAtiva === 'Oversized' ? '1.5px solid #1e1e1e' : '1px solid #cbd5e1',
                  background: abaModeloAtiva === 'Oversized' ? '#1e1e1e' : '#fff',
                  color: abaModeloAtiva === 'Oversized' ? '#fff' : '#475569',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                <span>Oversized</span>
                <span style={{
                  padding: '1px 7px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  background: abaModeloAtiva === 'Oversized' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                  color: abaModeloAtiva === 'Oversized' ? '#fff' : '#334155',
                }}>
                  {contagemOversized}
                </span>
              </button>
            </div>
          )}

          {/* Barra de Filtros e Ordenação das Variações */}
          {variacoes.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              padding: '12px 14px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {/* Filtro por Tamanho */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Tamanho:
                  </span>
                  <select
                    value={filtroTamanho}
                    onChange={(e) => setFiltroTamanho(e.target.value)}
                    style={{
                      padding: '5px 8px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      fontSize: '12px',
                      color: '#1e293b',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Todos</option>
                    {OPCOES_TAMANHO.map((tam) => (
                      <option key={tam} value={tam}>{tam}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro por Cor */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Cor:
                  </span>
                  <select
                    value={filtroCor}
                    onChange={(e) => setFiltroCor(e.target.value)}
                    style={{
                      padding: '5px 8px',
                      borderRadius: '5px',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      fontSize: '12px',
                      color: '#1e293b',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Todas</option>
                    {(coresDisponiveis.length > 0 ? coresDisponiveis : coresCadastradas).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {(filtroTamanho || filtroCor) && (
                  <button
                    type="button"
                    onClick={() => { setFiltroTamanho(''); setFiltroCor(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '4px 6px',
                    }}
                  >
                    ✕ Limpar filtros
                  </button>
                )}
              </div>

              {/* Ordenar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Ordenar por:
                </span>
                <select
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '5px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    fontSize: '12px',
                    color: '#1e293b',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <option value="tamanho_padrao">Tamanho (PP → G2)</option>
                  <option value="estoque_desc">Mais estoque</option>
                  <option value="estoque_asc">Menos estoque</option>
                  <option value="cor_asc">Cor (A-Z)</option>
                </select>
              </div>
            </div>
          )}

          {variacoes.length === 0 ? (
            <div style={{ marginTop: '16px' }}>
              <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '16px' }}>
                Nenhuma variação adicionada. Clique abaixo para adicionar a primeira variação.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={addVariacao}
                >
                  <IconPlus /> Adicionar Variação
                </button>
              </div>
            </div>
          ) : variacoesFiltradasEOrdenadas.length === 0 ? (
            <div style={{
              padding: '30px 16px',
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px dashed #cbd5e1',
              color: '#64748b',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              <p style={{ margin: '0 0 10px' }}>
                Nenhuma variação encontrada para os filtros selecionados{form.modelo === 'Ambos' ? ` na aba ${abaModeloAtiva}` : ''}.
              </p>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={addVariacao}
              >
                <IconPlus /> Adicionar Variação {form.modelo === 'Ambos' ? `em ${abaModeloAtiva}` : ''}
              </button>
            </div>
          ) : (
            <>
              {variacoesFiltradasEOrdenadas.map((variacao) => {
                const index = variacao.originalIndex;

                return (
                  <div
                    key={index}
                    className="admin-variacao-row sem-modelo"
                  >
                    {/* Tamanho: Escolher entre PP, P, M, G, GG, G1, G2 */}
                    <div className="admin-field" style={{ margin: 0 }}>
                      <label>Tamanho</label>
                      <select
                        name="tamanho"
                        value={variacao.tamanho}
                        onChange={(e) => handleVariacaoChange(index, e)}
                      >
                        <option value="">Selecione...</option>
                        {OPCOES_TAMANHO.map((tam) => (
                          <option key={tam} value={tam}>{tam}</option>
                        ))}
                      </select>
                      {errors[`variacao_${index}_tamanho`] && (
                        <span className="admin-field-error">{errors[`variacao_${index}_tamanho`]}</span>
                      )}
                    </div>

                    {/* Cor: Selecionável somente a partir das cores configuradas em Vitrine & Cores */}
                    <div className="admin-field" style={{ margin: 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Cor</span>
                        {variacao.cor && (
                          <span style={{ fontSize: '11px', color: '#666', fontWeight: 600 }}>
                            {variacao.cor}
                          </span>
                        )}
                      </label>
                      {coresDisponiveis.length === 0 ? (
                        <div style={{ padding: '6px 8px', fontSize: '11px', color: '#dc2626' }}>
                          Adicione cores na aba &quot;2. Vitrine &amp; Cores&quot; acima.
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexWrap: 'wrap',
                          padding: '6px 8px',
                          background: '#fff',
                          border: errors[`variacao_${index}_cor`] ? '1px solid #c0392b' : '1px solid #d0d0d0',
                          borderRadius: '6px',
                          minHeight: '38px',
                        }}>
                          {coresDisponiveis.map((corNome) => {
                            const selecionada = (variacao.cor || '').toLowerCase() === corNome.toLowerCase();
                            const hex = getHexCor(corNome);
                            return (
                              <button
                                key={corNome}
                                type="button"
                                onClick={() => {
                                  const eFake = { target: { name: 'cor', value: corNome } };
                                  handleVariacaoChange(index, eFake);
                                }}
                                title={corNome}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  border: selecionada ? '2px solid #1e1e1e' : '1px solid #cbd5e1',
                                  background: selecionada ? '#f1f5f9' : '#ffffff',
                                  cursor: 'pointer',
                                  fontWeight: selecionada ? 700 : 500,
                                  fontSize: '11px',
                                  color: '#1e293b',
                                  boxShadow: selecionada ? '0 0 0 2px #d4ac0d' : 'none',
                                }}
                              >
                                <span
                                  style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    backgroundColor: hex,
                                    border: '1px solid rgba(0,0,0,0.2)',
                                    display: 'inline-block',
                                  }}
                                />
                                {corNome}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {errors[`variacao_${index}_cor`] && (
                        <span className="admin-field-error">{errors[`variacao_${index}_cor`]}</span>
                      )}
                    </div>

                    {/* Estoque */}
                    <div className="admin-field" style={{ margin: 0 }}>
                      <label>Estoque</label>
                      <input
                        name="estoque"
                        type="number"
                        min="0"
                        value={variacao.estoque}
                        onChange={(e) => handleVariacaoChange(index, e)}
                        placeholder="0"
                      />
                      {errors[`variacao_${index}_estoque`] && (
                        <span className="admin-field-error">{errors[`variacao_${index}_estoque`]}</span>
                      )}
                    </div>

                    {/* Remover */}
                    <button
                      type="button"
                      className="admin-variacao-remove"
                      onClick={() => removeVariacao(index)}
                      title="Remover variação"
                    >
                      <IconTrash />
                    </button>
                  </div>
                );
              })}

              {/* Botão de + no final */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={addVariacao}
                >
                  <IconPlus /> Adicionar Variação {form.modelo === 'Ambos' ? `em ${abaModeloAtiva}` : ''}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Footer de ações ── */}
        <div className="admin-form-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          {apiError && (
            <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>
              ⚠️ {apiError}
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link to="/admin/produtos" className="admin-btn admin-btn-secondary">
              Cancelar
            </Link>
            <button
              type="submit"
              className="admin-btn admin-btn-primary"
              disabled={loading}
            >
              {loading
                ? isEditing ? 'Salvando…' : 'Criando…'
                : isEditing ? 'Salvar Alterações' : 'Criar Produto'
              }
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
