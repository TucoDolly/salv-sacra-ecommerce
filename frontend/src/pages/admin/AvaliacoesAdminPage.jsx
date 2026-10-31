import { useEffect, useState } from 'react';
import api from '../../services/api';
import '../../styles/admin.css';

export default function AvaliacoesAdminPage() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroNota, setFiltroNota] = useState('todas');

  const carregar = () => {
    setLoading(true);
    api.get('/admin/avaliacoes')
      .then((res) => setAvaliacoes(res.data || []))
      .catch(() => setAvaliacoes([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleExcluir = async (id) => {
    if (!window.confirm('Deseja realmente excluir esta avaliação permanentemente?')) return;
    try {
      await api.delete(`/admin/avaliacoes/${id}`);
      setAvaliacoes((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert('Não foi possível excluir a avaliação.');
    }
  };

  const avaliacoesFiltradas = avaliacoes.filter((av) => {
    const matchNota = filtroNota === 'todas' || Number(av.nota) === Number(filtroNota);
    const termo = busca.toLowerCase();
    const matchBusca =
      !termo ||
      (av.produto_nome || '').toLowerCase().includes(termo) ||
      (av.autor_nome || '').toLowerCase().includes(termo) ||
      (av.comentario || '').toLowerCase().includes(termo) ||
      (av.titulo || '').toLowerCase().includes(termo);
    return matchNota && matchBusca;
  });

  const mediaGeral =
    avaliacoes.length > 0
      ? (avaliacoes.reduce((acc, a) => acc + Number(a.nota), 0) / avaliacoes.length).toFixed(1).replace('.', ',')
      : '0,0';

  const renderEstrelas = (nota) =>
    [1, 2, 3, 4, 5].map((i) => (
      <span key={i} style={{ color: i <= Number(nota) ? '#c4953a' : '#d1d5db', fontSize: '14px' }}>
        ★
      </span>
    ));

  return (
    <div className="admin-page">
      <div className="admin-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="admin-title">Avaliações de Clientes</h1>
          <p style={{ color: '#777', fontSize: '14px', marginTop: '4px' }}>
            Acompanhe e modere as notas e depoimentos enviados pelos clientes nos produtos da loja.
          </p>
        </div>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Total de Avaliações</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#111', marginTop: '4px' }}>{avaliacoes.length}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Média Geral da Loja</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#c4953a', marginTop: '4px' }}>★ {mediaGeral}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Compras Verificadas</div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>
            {avaliacoes.filter((a) => a.compra_verificada).length}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por produto, cliente ou comentário..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ flex: 1, minWidth: '240px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
        />
        <select
          value={filtroNota}
          onChange={(e) => setFiltroNota(e.target.value)}
          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', background: '#fff' }}
        >
          <option value="todas">Todas as notas</option>
          <option value="5">5 estrelas (★★★★★)</option>
          <option value="4">4 estrelas (★★★★)</option>
          <option value="3">3 estrelas (★★★)</option>
          <option value="2">2 estrelas (★★)</option>
          <option value="1">1 estrela (★)</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="admin-table-container">
        {loading ? (
          <p style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Carregando avaliações...</p>
        ) : avaliacoesFiltradas.length === 0 ? (
          <p style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Nenhuma avaliação encontrada.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>PRODUTO</th>
                <th>CLIENTE</th>
                <th>NOTA</th>
                <th>DEPOIMENTO</th>
                <th>DATA</th>
                <th style={{ textAlign: 'center' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {avaliacoesFiltradas.map((av) => (
                <tr key={av.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {av.produto_imagem && (
                        <img
                          src={av.produto_imagem}
                          alt={av.produto_nome}
                          style={{ width: '38px', height: '44px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee' }}
                        />
                      )}
                      <strong style={{ fontSize: '13px', color: '#111' }}>{av.produto_nome}</strong>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#222' }}>{av.autor_nome}</div>
                    {av.compra_verificada && (
                      <span style={{ display: 'inline-block', marginTop: '3px', fontSize: '10px', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '2px 7px', borderRadius: '99px' }}>
                        ✓ Compra verificada
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>{renderEstrelas(av.nota)}</div>
                  </td>
                  <td style={{ maxWidth: '360px' }}>
                    {av.titulo && <div style={{ fontWeight: 700, fontSize: '13px', color: '#111', marginBottom: '2px' }}>{av.titulo}</div>}
                    <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.4 }}>{av.comentario}</div>
                  </td>
                  <td style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {av.created_at ? new Date(av.created_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="btn-delete"
                      onClick={() => handleExcluir(av.id)}
                    >
                      EXCLUIR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

