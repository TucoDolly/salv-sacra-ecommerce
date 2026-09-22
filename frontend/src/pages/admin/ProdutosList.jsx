import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

  // ── Modal de confirmação ───────────────────────────────────────────────────
  const [modalTarget, setModalTarget] = useState(null); // { id, nome }
  const [deleting, setDeleting]       = useState(false);

  // ── Carrega produtos ───────────────────────────────────────────────────────
  const fetchProdutos = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getProdutos();
      setProdutos(data);
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
      ) : (
        /* ── Tabela ── */
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Imagem</th>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Coleção</th>
                <th>Preço Base</th>
                <th>Variações</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto) => (
                <tr key={produto.id}>
                  {/* Thumbnail */}
                  <td>
                    {produto.imagem_url ? (
                      <img
                        className="admin-thumb"
                        src={produto.imagem_url}
                        alt={produto.nome}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="admin-thumb-placeholder">🖼</div>
                    )}
                  </td>

                  <td style={{ fontWeight: 600 }}>{produto.nome}</td>
                  <td>{produto.categoria?.nome ?? '—'}</td>
                  <td>{produto.colecao ?? '—'}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatBRL(produto.preco_base)}
                  </td>
                  <td>{produto.variacoes?.length ?? 0}</td>

                  {/* Badge disponível */}
                  <td>
                    <span className={`admin-badge ${produto.disponivel ? 'admin-badge-green' : 'admin-badge-red'}`}>
                      {produto.disponivel ? 'Disponível' : 'Indisponível'}
                    </span>
                  </td>

                  {/* Ações */}
                  <td>
                    <div className="admin-table-actions">
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
