import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { deleteProduto, getProdutos } from '../../services/produtoService';
import '../../styles/admin.css';

// ── Ícones inline leves ────────────────────────────────────────────────────
const IconPlus    = () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconEdit    = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash   = () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const IconPackage = () => <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;

export default function ProdutosList() {
  const navigate = useNavigate();

  const [produtos, setProdutos]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  // ── Filtros e Ordenação ───────────────────────────────────────────────────
  const [searchParams] = useSearchParams();
  const buscaUrl = searchParams.get('busca') || '';
  const [ordenacao, setOrdenacao]       = useState('recentes'); // recentes | nome_asc | nome_desc | preco_asc | preco_desc | colecao_asc
  const [filtroColecao, setFiltroColecao] = useState('');
  const [busca, setBusca]               = useState(buscaUrl);

  useEffect(() => {
    if (buscaUrl !== undefined) {
      setBusca(buscaUrl);
    }
  }, [buscaUrl]);

  // ── Modal de confirmação ───────────────────────────────────────────────────
  const [modalTarget, setModalTarget] = useState(null); // { id, nome }
  const [deleting, setDeleting]       = useState(false);

  // ── Carrega produtos ───────────────────────────────────────────────────────
  const fetchProdutos = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getProdutos();
      setProdutos(Array.isArray(data) ? data : (data?.data ?? []));
    } catch {
      setError('Não foi possível carregar os produtos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProdutos(); }, []);

  // ── Excluir ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!modalTarget) return;
    setDeleting(true);
    try {
      await deleteProduto(modalTarget.id);
      setSuccess(`"${modalTarget.nome}" foi excluído com sucesso.`);
      setProdutos((prev) => prev.filter((p) => p.id !== modalTarget.id));
      setModalTarget(null);
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError('Erro ao excluir o produto. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  };

  // ── Formatação de moeda ────────────────────────────────────────────────────
  const formatBRL = (value) =>
    Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ── Coleções únicas para o filtro ──────────────────────────────────────────
  const listaProdutos = Array.isArray(produtos) ? produtos : [];
  const colecoes = Array.from(new Set(listaProdutos.map((p) => p.colecao).filter(Boolean)));

  // ── Filtragem e Ordenação ──────────────────────────────────────────────────
  const produtosExibidos = listaProdutos
    .filter((p) => {
      if (filtroColecao && p.colecao !== filtroColecao) return false;
      const termo = (typeof busca === 'string' ? busca : '').toLowerCase().trim();
      if (termo) {
        const nomeOk = (p.nome || '').toLowerCase().includes(termo);
        const colOk = (p.colecao || '').toLowerCase().includes(termo);
        const catOk = (p.categoria?.nome || '').toLowerCase().includes(termo);
        return nomeOk || colOk || catOk;
      }
      return true;
    })
    .sort((a, b) => {
      switch (ordenacao) {
        case 'nome_asc':
          return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
        case 'nome_desc':
          return (b.nome || '').localeCompare(a.nome || '', 'pt-BR');
        case 'preco_asc':
          return Number(a.preco_base || 0) - Number(b.preco_base || 0);
        case 'preco_desc':
          return Number(b.preco_base || 0) - Number(a.preco_base || 0);
        case 'colecao_asc':
          return (a.colecao || '').localeCompare(b.colecao || '', 'pt-BR');
        case 'recentes':
        default:
          return Number(b.id) - Number(a.id);
      }
    });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="admin-page">
      {/* ── Cabeçalho ── */}
      <div className="admin-header">
        <h1 className="admin-title">Produtos</h1>
        <Link to="/admin/produtos/novo" className="admin-btn admin-btn-primary">
          <IconPlus /> Novo Produto
        </Link>
      </div>

      {/* ── Feedback ── */}
      {error   && <p className="admin-error">{error}</p>}
      {success && <p className="admin-success">{success}</p>}

      {/* ── Barra de Filtros e Ordenação ── */}
      {!loading && produtos.length > 0 && (
        <div className="admin-filters-bar">
          <div className="admin-filters-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#555' }}>
                Ordenar por:
              </label>
              <select
                className="admin-filter-select"
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value)}
              >
                <option value="recentes">Mais recentes</option>
                <option value="nome_asc">Nome (A - Z)</option>
                <option value="nome_desc">Nome (Z - A)</option>
                <option value="preco_asc">Menor Preço</option>
                <option value="preco_desc">Maior Preço</option>
                <option value="colecao_asc">Coleção (A - Z)</option>
              </select>
            </div>

            {colecoes.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#555' }}>
                  Coleção:
                </label>
                <select
                  className="admin-filter-select"
                  value={filtroColecao}
                  onChange={(e) => setFiltroColecao(e.target.value)}
                >
                  <option value="">Todas as coleções</option>
                  {colecoes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <input
              type="search"
              placeholder="Buscar por nome, coleção ou categoria..."
              className="admin-search-input"
              style={{ minWidth: '320px' }}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading ? (
        <p className="admin-loading">Carregando produtos…</p>
      ) : produtos.length === 0 ? (
        /* ── Empty state ── */
        <div className="admin-empty">
          <div style={{ color: '#ddd', marginBottom: '16px' }}><IconPackage /></div>
          <p>Nenhum produto cadastrado ainda.</p>
          <Link to="/admin/produtos/novo" className="admin-btn admin-btn-primary">
            Cadastrar primeiro produto
          </Link>
        </div>
      ) : produtosExibidos.length === 0 ? (
        <div className="admin-empty" style={{ padding: '36px 20px' }}>
          <p>Nenhum produto encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        /* ── Tabela ── */
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '80px', textAlign: 'center' }}>Imagem</th>
                <th style={{ textAlign: 'left', minWidth: '180px', paddingLeft: '36px' }}>Nome</th>
                <th style={{ textAlign: 'left' }}>Categoria</th>
                <th style={{ textAlign: 'left' }}>Coleção</th>
                <th style={{ textAlign: 'right', paddingRight: '20px' }}>Preço Base</th>
                <th style={{ textAlign: 'center' }}>Variações</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center', width: '180px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtosExibidos.map((produto) => (
                <tr key={produto.id}>
                  {/* Thumbnail */}
                  <td style={{ textAlign: 'center' }}>
                    {produto.imagem_url ? (
                      <img
                        className="admin-thumb"
                        src={produto.imagem_url}
                        alt={produto.nome}
                        onError={(e) => { e.target.style.display = 'none'; }}
                        style={{ margin: '0 auto', display: 'block' }}
                      />
                    ) : (
                      <div className="admin-thumb-placeholder" style={{ margin: '0 auto' }}>🖼</div>
                    )}
                  </td>

                  <td style={{ fontWeight: 600, textAlign: 'left' }}>{produto.nome}</td>
                  <td style={{ textAlign: 'left' }}>{produto.categoria?.nome ?? '—'}</td>
                  <td style={{ textAlign: 'left' }}>{produto.colecao ?? '—'}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontWeight: 600, paddingRight: '20px' }}>
                    {formatBRL(produto.preco_base)}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 500 }}>
                    {produto.variacoes?.length ?? 0}
                  </td>

                  {/* Badge disponível */}
                  <td style={{ textAlign: 'center' }}>
                    <span className={`admin-badge ${produto.disponivel ? 'admin-badge-green' : 'admin-badge-red'}`}>
                      {produto.disponivel ? 'Disponível' : 'Indisponível'}
                    </span>
                  </td>

                  {/* Ações */}
                  <td style={{ textAlign: 'center' }}>
                    <div className="admin-table-actions" style={{ justifyContent: 'center' }}>
                      <button
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        onClick={() => navigate(`/admin/produtos/editar/${produto.id}`)}
                        title="Editar produto"
                      >
                        <IconEdit /> Editar
                      </button>
                      <button
                        className="admin-btn admin-btn-danger admin-btn-sm"
                        onClick={() => setModalTarget({ id: produto.id, nome: produto.nome })}
                        title="Excluir produto"
                      >
                        <IconTrash /> Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal de confirmação de exclusão ── */}
      {modalTarget && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="admin-modal">
            <h3 id="modal-title">Confirmar exclusão</h3>
            <p>
              Tem certeza que deseja excluir o produto{' '}
              <strong>"{modalTarget.nome}"</strong>?
              <br />Esta ação <strong>não pode ser desfeita</strong>.
            </p>
            <div className="admin-modal-actions">
              <button
                className="admin-btn admin-btn-secondary"
                onClick={() => setModalTarget(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="admin-btn admin-btn-primary"
                style={{ background: '#c0392b' }}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Excluindo…' : 'Confirmar exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
