import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createProduto,
  getCategorias,
  getDevocaos,
  getProduto,
  updateProduto,
} from '../../services/produtoService';
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

const EMPTY_VARIACAO = { tamanho: '', cor: '', estoque: '' };

export default function ProdutoForm() {
  const { id }   = useParams();           // presente somente na rota de edição
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  // ── Estado ─────────────────────────────────────────────────────────────────
  const [form, setForm]           = useState(EMPTY_FORM);
  const [imagens, setImagens]     = useState(['']);
  const [variacoes, setVariacoes] = useState([]);
  const [errors, setErrors]       = useState({});
  const [apiError, setApiError]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [fetching, setFetching]   = useState(isEditing);

  // ── Listas para selects ────────────────────────────────────────────────────
  const [categorias, setCategorias] = useState([]);
  const [devocaos, setDevocaos]     = useState([]);

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

      // Carrega lista de imagens
      let listaImgs = [];
      if (Array.isArray(data.imagens) && data.imagens.length > 0) {
        listaImgs = data.imagens;
      } else if (data.imagem_url) {
        listaImgs = [data.imagem_url];
      } else {
        listaImgs = [''];
      }
      setImagens(listaImgs);

      setVariacoes(
        (data.variacoes ?? []).map(({ tamanho, cor, estoque }) => ({
          tamanho, cor, estoque,
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

  // Busca categorias e devoções em paralelo ao montar o formulário
  useEffect(() => {
    Promise.all([getCategorias(), getDevocaos()])
      .then(([catRes, devRes]) => {
        // Laravel pode retornar o array em res.data (Collection)
        // ou em res.data.data (paginado). Normaliza os dois formatos.
        const toArray = (res) =>
          Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setCategorias(toArray(catRes));
        setDevocaos(toArray(devRes));
      })
      .catch((err) => {
        console.error('Falha ao carregar categorias/devoções:', err);
      });
  }, []);

  // ── Handlers de campo principal ─────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  // ── Handlers de imagens da galeria ──────────────────────────────────────────
  const handleImagemChange = (index, value) => {
    setImagens((prev) => prev.map((img, i) => (i === index ? value : img)));
    if (errors[`imagem_${index}`]) {
      setErrors((prev) => ({ ...prev, [`imagem_${index}`]: '' }));
    }
  };

  const addImagem = () => {
    setImagens((prev) => [...prev, '']);
  };

  const removeImagem = (index) => {
    setImagens((prev) => {
      const novaLista = prev.filter((_, i) => i !== index);
      return novaLista.length > 0 ? novaLista : [''];
    });
  };

  // ── Handlers de variações ────────────────────────────────────────────────────
  const addVariacao = () =>
    setVariacoes((prev) => [...prev, { ...EMPTY_VARIACAO }]);

  const removeVariacao = (index) =>
    setVariacoes((prev) => prev.filter((_, i) => i !== index));

  const handleVariacaoChange = (index, e) => {
    const { name, value } = e.target;
    setVariacoes((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [name]: value } : v))
    );
  };

  // ── Validação client-side ────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.nome.trim())              errs.nome       = 'O nome é obrigatório.';
    if (!form.preco_base && form.preco_base !== 0)
                                         errs.preco_base = 'O preço é obrigatório.';
    if (Number(form.preco_base) < 0)    errs.preco_base = 'O preço não pode ser negativo.';

    // Valida cada URL de imagem preenchida
    imagens.forEach((imgUrl, i) => {
      if (imgUrl && !/^https?:\/\/.+/.test(imgUrl.trim())) {
        errs[`imagem_${i}`] = 'Informe uma URL válida (http/https).';
      }
    });

    variacoes.forEach((v, i) => {
      if (!v.tamanho.trim()) errs[`variacao_${i}_tamanho`] = 'Tamanho obrigatório.';
      if (!v.cor.trim())     errs[`variacao_${i}_cor`]     = 'Cor obrigatória.';
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
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    const imagensValidas = imagens.map((u) => u.trim()).filter(Boolean);

    const payload = {
      ...form,
      imagem_url:   imagensValidas[0] || '',
      imagens:      imagensValidas,
      preco_base:   form.preco_base   !== '' ? Number(form.preco_base)   : '',
      categoria_id: form.categoria_id !== '' ? Number(form.categoria_id) : null,
      devocao_id:   form.devocao_id   !== '' ? Number(form.devocao_id)   : null,
      variacoes: variacoes.map((v) => ({
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
      // Erros de validação 422 do Laravel
      const laravelErrors = err.response?.data?.errors;
      if (laravelErrors) {
        const mapped = {};
        Object.entries(laravelErrors).forEach(([field, msgs]) => {
          mapped[field] = msgs[0];
        });
        setErrors(mapped);
      }
      setApiError(
        err.response?.data?.message ||
        'Erro ao salvar o produto. Verifique os dados e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Loading inicial (modo edição) ─────────────────────────────────────────
  if (fetching) {
    return <p className="admin-loading">Carregando produto…</p>;
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
                <option value="Santos">Santos</option>
                <option value="Datas Comemorativas">Datas Comemorativas</option>
                <option value="Geral">Geral</option>
                <option value="Inverno">Inverno</option>
                <option value="Verão">Verão</option>
              </select>
            </div>
          </div>

          {/* ════ Fotos do Produto (Galeria Dinâmica) ════ */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Fotos do Produto (Galeria)
              </label>
              <button
                type="button"
                onClick={addImagem}
                className="admin-btn admin-btn-secondary admin-btn-sm"
                style={{ padding: '4px 10px', fontSize: '12px' }}
              >
                + Adicionar Outra Foto
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '14px' }}>
              A 1ª foto será a principal exibida na vitrine e catálogo. Fotos adicionais aparecerão como miniaturas laterais na página do produto.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {imagens.map((imgUrl, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: '#f8fafc',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', minWidth: '70px' }}>
                    {idx === 0 ? 'Principal:' : `Foto ${idx + 1}:`}
                  </span>

                  {/* Input URL */}
                  <div style={{ flex: 1 }}>
                    <input
                      type="url"
                      value={imgUrl}
                      onChange={(e) => handleImagemChange(idx, e.target.value)}
                      placeholder={idx === 0 ? "https://... (Foto de capa da vitrine)" : "https://... (Foto em outro ângulo/detalhe)"}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: errors[`imagem_${idx}`] ? '1px solid #ef4444' : '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                        background: '#fff',
                      }}
                    />
                    {errors[`imagem_${idx}`] && (
                      <span className="admin-field-error" style={{ display: 'block', marginTop: '4px', fontSize: '11px' }}>
                        {errors[`imagem_${idx}`]}
                      </span>
                    )}
                  </div>

                  {/* Miniatura Preview */}
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '6px',
                    border: '1.5px solid #cbd5e1',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}>
                    {imgUrl && /^https?:\/\/.+/.test(imgUrl) ? (
                      <img
                        src={imgUrl}
                        alt={`Preview ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>Foto</span>
                    )}
                  </div>

                  {/* Botão Remover (se tiver mais de 1 ou se quiser limpar) */}
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
              ))}
            </div>
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
                <option value="">— Selecione uma devoção —</option>
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
                    <option value="Regular Fit">Regular Fit</option>
                    <option value="Oversized">Oversized</option>
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
          <div className="admin-variacoes-header">
            <p className="admin-card-title" style={{ margin: 0, borderBottom: 'none', padding: 0 }}>
              Variações <span style={{ color: '#aaa', fontWeight: 400 }}>({variacoes.length})</span>
            </p>
            <button
              type="button"
              className="admin-btn admin-btn-secondary admin-btn-sm"
              onClick={addVariacao}
            >
              <IconPlus /> Adicionar Variação
            </button>
          </div>

          {variacoes.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#aaa', marginTop: '16px' }}>
              Nenhuma variação adicionada. Clique em "Adicionar Variação" para começar.
            </p>
          ) : (
            variacoes.map((variacao, index) => (
              <div key={index} className="admin-variacao-row">
                {/* Tamanho */}
                <div className="admin-field" style={{ margin: 0 }}>
                  <label>Tamanho</label>
                  <input
                    name="tamanho"
                    type="text"
                    value={variacao.tamanho}
                    onChange={(e) => handleVariacaoChange(index, e)}
                    placeholder="P, M, G…"
                  />
                  {errors[`variacao_${index}_tamanho`] && (
                    <span className="admin-field-error">{errors[`variacao_${index}_tamanho`]}</span>
                  )}
                </div>

                {/* Cor */}
                <div className="admin-field" style={{ margin: 0 }}>
                  <label>Cor</label>
                  <input
                    name="cor"
                    type="text"
                    value={variacao.cor}
                    onChange={(e) => handleVariacaoChange(index, e)}
                    placeholder="Marrom, Bege…"
                  />
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
            ))
          )}
        </div>

        {/* ── Footer de ações ── */}
        <div className="admin-form-footer">
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
      </form>
    </div>
  );
}
