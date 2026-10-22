import { useEffect, useState } from 'react';
import { getPedidosAdmin, updateStatusPedidoAdmin } from '../../services/adminPedidoService';
import '../../styles/admin.css';

const STATUS_OPCOES = [
  'Pendente',
  'Pago',
  'Em montagem',
  'Enviado',
  'Entregue',
  'Cancelado',
];

const STATUS_BADGE_CLASS = {
  Pendente: 'pendente',
  Pago: 'pago',
  'Em montagem': 'em-montagem',
  Enviado: 'enviado',
  Entregue: 'entregue',
  Cancelado: 'cancelado',
};

const formatMoeda = (val) =>
  Number(val ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatData = (val) =>
  val ? new Date(val).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

export default function PedidosList() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtros
  const [statusFiltro, setStatusFiltro] = useState('');
  const [busca, setBusca] = useState('');

  // Detalhe lateral (drawer)
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [atualizandoStatusId, setAtualizandoStatusId] = useState(null);

  const carregarPedidos = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFiltro) params.status = statusFiltro;
      if (busca.trim()) params.busca = busca.trim();

      const { data } = await getPedidosAdmin(params);
      setPedidos(data.data || data);
    } catch {
      setError('Não foi possível carregar os pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, [statusFiltro]);

  const handleBuscar = (e) => {
    e.preventDefault();
    carregarPedidos();
  };

  const handleAlterarStatus = async (id, novoStatus) => {
    setAtualizandoStatusId(id);
    setError('');
    try {
      const { data } = await updateStatusPedidoAdmin(id, novoStatus);
      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: novoStatus } : p))
      );
      if (pedidoSelecionado && pedidoSelecionado.id === id) {
        setPedidoSelecionado((prev) => ({ ...prev, status: novoStatus }));
      }
      setSuccess(`Status do Pedido #${id} alterado para "${novoStatus}".`);
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError('Erro ao atualizar o status do pedido.');
    } finally {
      setAtualizandoStatusId(null);
    }
  };

  return (
    <div className="admin-page">
      {/* ── Cabeçalho ── */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Pedidos e Pagamentos</h1>
          <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
            Gerencie pedidos realizados, consulte detalhes de entrega e atualize o status do envio.
          </p>
        </div>
      </div>

      {/* ── Feedback ── */}
      {error && <p className="admin-error">{error}</p>}
      {success && <p className="admin-success">{success}</p>}

      {/* ── Barra de Filtros ── */}
      <div className="admin-filters-bar">
        <div className="admin-filters-left">
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#555' }}>
            Status:
          </label>
          <select
            className="admin-filter-select"
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
          >
            <option value="">Todos os status</option>
            {STATUS_OPCOES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleBuscar} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="search"
            placeholder="Buscar por ID, cliente ou e-mail..."
            className="admin-search-input"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <button type="submit" className="admin-btn admin-btn-secondary" style={{ padding: '8px 16px' }}>
            Buscar
          </button>
        </form>
      </div>

      {/* ── Lista de Pedidos ── */}
      {loading ? (
        <p className="admin-loading">Carregando pedidos...</p>
      ) : pedidos.length === 0 ? (
        <div className="admin-empty">
          <p>Nenhum pedido encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Pagamento</th>
                <th>Total</th>
                <th>Status Atual</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>#{p.id}</strong>
                  </td>
                  <td>{formatData(p.data_pedido)}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.user?.name || 'Cliente'}</div>
                    <div style={{ fontSize: '12px', color: '#777' }}>{p.email_contato || p.user?.email}</div>
                  </td>
                  <td>
                    <span style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 600 }}>
                      {p.metodo_pagamento}
                    </span>
                  </td>
                  <td>
                    <strong>{formatMoeda(p.valor_total)}</strong>
                  </td>
                  <td>
                    <select
                      className="admin-status-select"
                      value={p.status}
                      disabled={atualizandoStatusId === p.id}
                      onChange={(e) => handleAlterarStatus(p.id, e.target.value)}
                    >
                      {STATUS_OPCOES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => setPedidoSelecionado(p)}
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Drawer lateral de detalhes do pedido ── */}
      {pedidoSelecionado && (
        <div className="admin-drawer-overlay" onClick={() => setPedidoSelecionado(null)}>
          <div className="admin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#1e1e1e' }}>
                  Pedido #{pedidoSelecionado.id}
                </h3>
                <span style={{ fontSize: '12px', color: '#888' }}>
                  {formatData(pedidoSelecionado.data_pedido)}
                </span>
              </div>
              <button
                type="button"
                className="admin-close-btn"
                onClick={() => setPedidoSelecionado(null)}
              >
                &times;
              </button>
            </div>

            <div className="admin-drawer-body">
              {/* Status e Ação */}
              <div className="admin-drawer-section">
                <h4>Status do Pedido</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`admin-status-badge ${STATUS_BADGE_CLASS[pedidoSelecionado.status] ?? 'pendente'}`}>
                    {pedidoSelecionado.status}
                  </span>
                  <select
                    className="admin-status-select"
                    value={pedidoSelecionado.status}
                    onChange={(e) => handleAlterarStatus(pedidoSelecionado.id, e.target.value)}
                  >
                    {STATUS_OPCOES.map((st) => (
                      <option key={st} value={st}>
                        Mudar para: {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dados do Cliente */}
              <div className="admin-drawer-section">
                <h4>Dados do Cliente</h4>
                <div className="admin-pedido-info-card">
                  <p><strong>Nome:</strong> {pedidoSelecionado.user?.name || 'Não informado'}</p>
                  <p><strong>E-mail:</strong> {pedidoSelecionado.email_contato || pedidoSelecionado.user?.email}</p>
                  <p><strong>Telefone:</strong> {pedidoSelecionado.telefone || pedidoSelecionado.user?.telefone || '—'}</p>
                </div>
              </div>

              {/* Entrega */}
              <div className="admin-drawer-section">
                <h4>Endereço de Entrega</h4>
                <div className="admin-pedido-info-card">
                  <p>
                    {pedidoSelecionado.logradouro}, {pedidoSelecionado.numero}
                    {pedidoSelecionado.complemento ? ` (${pedidoSelecionado.complemento})` : ''}
                  </p>
                  <p>{pedidoSelecionado.bairro} — {pedidoSelecionado.cidade}/{pedidoSelecionado.estado}</p>
                  <p>CEP: {pedidoSelecionado.cep}</p>
                  <p style={{ marginTop: '8px', color: '#555' }}>
                    <strong>Modalidade:</strong> {pedidoSelecionado.tipo_frete} ({formatMoeda(pedidoSelecionado.valor_frete)})
                  </p>
                  {pedidoSelecionado.observacoes && (
                    <p style={{ marginTop: '6px', color: '#b45309' }}>
                      <strong>Obs:</strong> {pedidoSelecionado.observacoes}
                    </p>
                  )}
                </div>
              </div>

              {/* Itens do Pedido */}
              <div className="admin-drawer-section">
                <h4>Itens Comprados</h4>
                <table className="admin-table" style={{ fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qtd</th>
                      <th>Preço</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidoSelecionado.itens?.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.variacao?.produto?.nome ?? 'Produto'}</strong>
                          {item.variacao && (
                            <div style={{ fontSize: '11px', color: '#777' }}>
                              Tam: {item.variacao.tamanho} {item.variacao.cor ? `· Cor: ${item.variacao.cor}` : ''}
                            </div>
                          )}
                        </td>
                        <td>{item.quantidade}</td>
                        <td>{formatMoeda(item.preco_unitario)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Resumo Financeiro */}
              <div className="admin-drawer-section">
                <h4>Resumo Financeiro</h4>
                <div className="admin-pedido-info-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Frete:</span>
                    <span>{formatMoeda(pedidoSelecionado.valor_frete)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Forma de Pagamento:</span>
                    <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{pedidoSelecionado.metodo_pagamento}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, borderTop: '1px solid #ddd', paddingTop: '8px' }}>
                    <span>Valor Total:</span>
                    <span>{formatMoeda(pedidoSelecionado.valor_total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
