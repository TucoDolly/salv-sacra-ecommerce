import { useCallback, useEffect, useState } from 'react';
import {
  listarTaxonomia,
  criarTaxonomia,
  atualizarTaxonomia,
  excluirTaxonomia,
} from '../../services/adminTaxonomiaService';
import '../../styles/admin.css';

const ABAS = [
  { kind: 'categorias', titulo: 'Categorias', singular: 'categoria', placeholder: 'Ex: Camisetas' },
  { kind: 'devocaos', titulo: 'Devoções', singular: 'devoção', placeholder: 'Ex: Nossa Senhora' },
];

export default function CategoriasDevocoesPage() {
  const [aba, setAba] = useState('categorias');
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoNome, setNovoNome] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [editandoNome, setEditandoNome] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ tipo: '', texto: '' });

  const cfg = ABAS.find((a) => a.kind === aba);

  const mostrar = (tipo, texto) => {
    setFeedback({ tipo, texto });
    setTimeout(() => setFeedback({ tipo: '', texto: '' }), 4000);
  };

  const erroApi = (err, padrao) =>
    err.response?.data?.errors?.nome?.[0] || err.response?.data?.message || padrao;

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await listarTaxonomia(aba);
      setItens(data);
    } catch {
      mostrar('erro', 'Não foi possível carregar a lista.');
    } finally {
      setLoading(false);
    }
  }, [aba]);

  useEffect(() => {
    setItens([]);
    setEditandoId(null);
    setNovoNome('');
    carregar();
  }, [carregar]);

  const handleCriar = async (e) => {
    e.preventDefault();
    if (!novoNome.trim()) return;
    setBusy(true);
    try {
      await criarTaxonomia(aba, novoNome.trim());
      setNovoNome('');
      mostrar('sucesso', `${cfg.titulo.slice(0, -1)} criada com sucesso.`);
      await carregar();
    } catch (err) {
      mostrar('erro', erroApi(err, 'Erro ao criar.'));
    } finally {
      setBusy(false);
    }
  };

  const iniciarEdicao = (item) => {
    setEditandoId(item.id);
    setEditandoNome(item.nome);
  };

  const salvarEdicao = async (id) => {
    if (!editandoNome.trim()) return;
    setBusy(true);
    try {
      await atualizarTaxonomia(aba, id, editandoNome.trim());
      setEditandoId(null);
      mostrar('sucesso', 'Alteração salva.');
      await carregar();
    } catch (err) {
      mostrar('erro', erroApi(err, 'Erro ao salvar.'));
    } finally {
      setBusy(false);
    }
  };

  const handleExcluir = async (item) => {
    if (!window.confirm(`Excluir "${item.nome}"?`)) return;
    setBusy(true);
    try {
      await excluirTaxonomia(aba, item.id);
      mostrar('sucesso', 'Item excluído.');
      await carregar();
    } catch (err) {
      mostrar('erro', erroApi(err, 'Erro ao excluir.'));
    } finally {
      setBusy(false);
    }
  };

  const th = { padding: '14px 20px', textAlign: 'left' };
  const td = { padding: '14px 20px', borderBottom: '1px solid #f1f5f9' };

  return (
    <div className="admin-page" style={{ maxWidth: '900px' }}>
      <div className="admin-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="admin-title">Categorias e Devoções</h1>
          <p style={{ color: '#777', fontSize: '14px', marginTop: '4px' }}>
            Organize o catálogo. Estes itens alimentam o cadastro de produtos e os filtros da vitrine.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e5e7eb', marginBottom: '24px' }}>
        {ABAS.map((a) => (
          <button
            key={a.kind}
            type="button"
            onClick={() => setAba(a.kind)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: 700,
              color: aba === a.kind ? '#111' : '#64748b',
              borderBottom: aba === a.kind ? '2px solid #111' : '2px solid transparent',
              marginBottom: '-2px',
              cursor: 'pointer',
            }}
          >
            {a.titulo}
          </button>
        ))}
      </div>

      {feedback.texto && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontWeight: 600,
          fontSize: '14px',
          background: feedback.tipo === 'sucesso' ? '#dcfce7' : '#fee2e2',
          color: feedback.tipo === 'sucesso' ? '#15803d' : '#b91c1c',
          border: `1px solid ${feedback.tipo === 'sucesso' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {feedback.texto}
        </div>
      )}

      <form
        onSubmit={handleCriar}
        style={{
          display: 'flex',
          gap: '12px',
          background: '#fff',
          border: '1px solid #eaeaea',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
        }}
      >
        <input
          type="text"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder={cfg.placeholder}
          maxLength={100}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
        />
        <button type="submit" disabled={busy || !novoNome.trim()} className="admin-btn admin-btn-primary">
          + Adicionar {cfg.singular}
        </button>
      </form>

      <div style={{ background: '#fff', border: '1px solid #eaeaea', borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: '40px', textAlign: 'center', color: '#888' }}>Carregando...</p>
        ) : itens.length === 0 ? (
          <p style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
            Nenhuma {cfg.singular} cadastrada ainda.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', color: '#64748b', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                <th style={th}>Nome</th>
                <th style={{ ...th, textAlign: 'center', width: '130px' }}>Produtos</th>
                <th style={{ ...th, textAlign: 'center', width: '220px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => {
                const emEdicao = editandoId === item.id;
                return (
                  <tr key={item.id}>
                    <td style={{ ...td, fontWeight: 600, color: '#111' }}>
                      {emEdicao ? (
                        <input
                          type="text"
                          autoFocus
                          value={editandoNome}
                          maxLength={100}
                          onChange={(e) => setEditandoNome(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') salvarEdicao(item.id);
                            if (e.key === 'Escape') setEditandoId(null);
                          }}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #d97706', fontSize: '14px', outline: 'none' }}
                        />
                      ) : (
                        item.nome
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'center', color: '#64748b' }}>
                      {item.produtos_count ?? 0}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        {emEdicao ? (
                          <>
                            <button type="button" disabled={busy} onClick={() => salvarEdicao(item.id)} className="admin-btn admin-btn-primary admin-btn-sm">
                              Salvar
                            </button>
                            <button type="button" onClick={() => setEditandoId(null)} className="admin-btn admin-btn-secondary admin-btn-sm">
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button type="button" disabled={busy} onClick={() => iniciarEdicao(item)} className="admin-btn admin-btn-secondary admin-btn-sm">
                              Editar
                            </button>
                            <button
                              type="button"
                              disabled={busy || item.produtos_count > 0}
                              onClick={() => handleExcluir(item)}
                              className="admin-btn admin-btn-danger admin-btn-sm"
                              title={item.produtos_count > 0 ? 'Há produtos vinculados' : 'Excluir'}
                            >
                              Excluir
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
