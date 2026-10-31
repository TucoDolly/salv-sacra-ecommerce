import { useEffect, useState } from 'react';
import { getPedidosAdmin, updateStatusPedidoAdmin } from '../../services/adminPedidoService';
import '../../styles/admin.css';
import '../../styles/minha-conta.css';

const STATUS_OPCOES = [
  'Pendente',
  'Pago',
  'Em separação',
  'Enviado',
  'Em transporte',
  'Entregue',
  'Cancelado',
];

const STATUS_BADGE_CLASS = {
  Pendente: 'pendente',
  Pago: 'pago',
  'Em separação': 'em-separacao',
  'Em montagem': 'em-separacao',
  Enviado: 'enviado',
  'Em transporte': 'em-transporte',
  Entregue: 'entregue',
  Cancelado: 'cancelado',
};

const formatMoeda = (val) =>
  Number(val ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatData = (val) =>
  val ? new Date(val).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

function obterEtapaRastreio(status) {
  switch (status) {
    case 'Pendente': return 1;
    case 'Pago': return 2;
    case 'Em separação':
    case 'Em montagem': return 3;
    case 'Enviado': return 4;
    case 'Em transporte': return 5;
    case 'Entregue': return 6;
    case 'Cancelado': return 0;
    default: return 1;
  }
}

function formatarCliente(user, emailContato) {
  const nomeOriginal = user?.name || 'Cliente';
  const isDesativada = Boolean(
    user?.deleted_at ||
    nomeOriginal.toLowerCase().includes('conta desativada')
  );
  const nomeLimpo = nomeOriginal.replace(/\s*\(Conta Desativada\)/i, '').trim() || 'Cliente';
  const emailLimpo = emailContato || (user?.email ? user.email.replace(/^desativado_\d+_/, '') : '—');

  return {
    nome: nomeLimpo,
    isDesativada,
    email: emailLimpo,
  };
}

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
  const [rastreioInput, setRastreioInput] = useState('');
  const [salvandoRastreio, setSalvandoRastreio] = useState(false);
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

  const handleAbrirDetalhe = (pedido) => {
    setPedidoSelecionado(pedido);
    setRastreioInput(pedido.codigo_rastreio || '');
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    carregarPedidos();
  };

  const handleAlterarStatus = async (id, novoStatus) => {
    setAtualizandoStatusId(id);
    setError('');
    try {
      const { data } = await updateStatusPedidoAdmin(id, novoStatus);
      const pedidoAtualizado = data.pedido || { status: novoStatus };

      setPedidos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...pedidoAtualizado } : p))
      );
      if (pedidoSelecionado && pedidoSelecionado.id === id) {
        setPedidoSelecionado((prev) => ({ ...prev, ...pedidoAtualizado }));
        if (pedidoAtualizado.codigo_rastreio) {
          setRastreioInput(pedidoAtualizado.codigo_rastreio);
        }
      }
      setSuccess(`Status do Pedido #${id} alterado para "${novoStatus}".`);
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError('Erro ao atualizar o status do pedido.');
    } finally {
      setAtualizandoStatusId(null);
    }
  };

  const handleSalvarRastreio = async (e) => {
    e.preventDefault();
    if (!pedidoSelecionado) return;
    setSalvandoRastreio(true);
    setError('');
    try {
      const { data } = await updateStatusPedidoAdmin(
        pedidoSelecionado.id,
        pedidoSelecionado.status,
        rastreioInput.trim()
      );
      const pedidoAtualizado = data.pedido;
      setPedidos((prev) =>
        prev.map((p) => (p.id === pedidoSelecionado.id ? { ...p, ...pedidoAtualizado } : p))
      );
      setPedidoSelecionado((prev) => ({ ...prev, ...pedidoAtualizado }));
      setSuccess(`Código de rastreio do Pedido #${pedidoSelecionado.id} salvo com sucesso!`);
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError('Erro ao salvar o código de rastreio.');
    } finally {
      setSalvandoRastreio(false);
    }
  };

  const handleImprimirEtiqueta = (p) => {
    const janela = window.open('', '_blank', 'width=800,height=700');
    if (!janela) return;

    const itensHtml = (p.itens || [])
      .map(
        (item) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; width: 32px; text-align: center;">[ &nbsp; ]</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">
            <strong>${item.variacao?.produto?.nome ?? 'Produto'}</strong><br/>
            <small>Tamanho: <strong>${item.variacao?.tamanho ?? '-'}</strong>${item.variacao?.cor ? ` | Cor: ${item.variacao.cor}` : ''}</small>
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold;">${item.quantidade}</td>
        </tr>`
      )
      .join('');

    janela.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Etiqueta de Envio e Romaneio - Pedido #${p.id}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 20px; }
          .label-box { border: 2px solid #000; padding: 20px; max-width: 480px; margin: 0 auto 30px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
          .brand { font-size: 20px; font-weight: 900; letter-spacing: 2px; }
          .service-badge { background: #000; color: #fff; padding: 6px 12px; font-weight: bold; font-size: 13px; text-transform: uppercase; }
          .section-title { font-size: 11px; text-transform: uppercase; color: #555; font-weight: bold; margin-bottom: 4px; }
          .destinatario { border: 1px solid #000; padding: 12px; margin-bottom: 15px; background: #fafafa; }
          .cep-big { font-size: 22px; font-weight: 900; letter-spacing: 1px; margin-top: 8px; }
          .pedido-box { display: flex; justify-content: space-between; align-items: center; border: 1px dashed #000; padding: 10px 14px; margin: 15px 0; font-size: 13px; }
          .remetente { font-size: 12px; line-height: 1.4; border-top: 1px solid #ccc; padding-top: 10px; }
          .romaneio { max-width: 480px; margin: 0 auto; border: 1px solid #ccc; padding: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: center; margin-bottom: 20px;">
          <button onclick="window.print()" style="background: #111; color: #fff; border: none; padding: 10px 24px; font-size: 14px; font-weight: bold; border-radius: 4px; cursor: pointer;">
            🖨️ IMPRIMIR ETIQUETA E GUIA DE SEPARAÇÃO
          </button>
        </div>

        <div class="label-box">
          <div class="header">
            <div class="brand">SALV SACRA</div>
            <div class="service-badge">${p.tipo_frete || 'Envio Padrão'}</div>
          </div>

          <div class="destinatario">
            <div class="section-title">DESTINATÁRIO</div>
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">${formatarCliente(p.user, p.email_contato).nome}</div>
            <div style="font-size: 14px;">
              ${p.logradouro}, ${p.numero} ${p.complemento ? ' - ' + p.complemento : ''}<br/>
              Bairro: ${p.bairro}<br/>
              ${p.cidade} / ${p.estado}
            </div>
            <div class="cep-big">CEP: ${p.cep}</div>
            ${p.telefone ? `<div style="font-size: 12px; margin-top: 4px;">Tel: ${p.telefone}</div>` : ''}
          </div>

          <div class="pedido-box">
            <span><strong>PEDIDO #${p.id}</strong></span>
            <span>Espaço reservado para etiqueta/carimbo da agência</span>
          </div>

          <div class="remetente">
            <div class="section-title">REMETENTE</div>
            <strong>SALV SACRA ECOMMERCE</strong><br/>
            Rua Manoel Antunes Corrêa, 2171 — Oficinas<br/>
            Tubarão / SC — CEP: 88702-280
          </div>
        </div>

        <div class="romaneio">
          <h4 style="margin: 0 0 10px; text-transform: uppercase; font-size: 13px;">Guia de Separação do Estoque (Pedido #${p.id})</h4>
          <table>
            <thead>
              <tr style="background: #eee;">
                <th style="padding: 8px; text-align: center; width: 32px;">OK</th>
                <th style="padding: 8px; text-align: left;">Produto / Variação</th>
                <th style="padding: 8px; text-align: center;">Qtd</th>
              </tr>
            </thead>
            <tbody>
              ${itensHtml}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `);
    janela.document.close();
  };

  return (
    <div className="admin-page">
      {/* ── Cabeçalho ── */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Pedidos, Pagamentos e Entregas</h1>
          <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
            Gerencie pedidos realizados, informe o código de rastreio, imprima etiquetas de envio e acompanhe o status de entrega.
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
                <th>Envio / Rastreio</th>
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
                    {(() => {
                      const clienteInfo = formatarCliente(p.user, p.email_contato);
                      return (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600 }}>{clienteInfo.nome}</span>
                            {clienteInfo.isDesativada && (
                              <span
                                style={{
                                  fontSize: '10px',
                                  background: '#fee2e2',
                                  color: '#b91c1c',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  letterSpacing: '0.03em',
                                }}
                              >
                                Conta Desativada
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#777' }}>{clienteInfo.email}</div>
                        </>
                      );
                    })()}
                  </td>
                  <td>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#222' }}>
                      {p.tipo_frete || 'Padrão'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>
                      📦 {p.codigo_rastreio || `BR${String(p.id).padStart(6, '0')}SS`}
                    </div>
                  </td>
                  <td>
                    <strong>{formatMoeda(p.valor_total)}</strong>
                    <div style={{ fontSize: '11px', color: '#777', textTransform: 'uppercase' }}>
                      {p.metodo_pagamento}
                    </div>
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
                      className="admin-btn admin-btn-secondary admin-btn-sm"
                      onClick={() => handleAbrirDetalhe(p)}
                    >
                      Gerenciar Entrega
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Drawer lateral de detalhes do pedido e logística ── */}
      {pedidoSelecionado && (
        <div className="admin-drawer-overlay" onClick={() => setPedidoSelecionado(null)}>
          <div className="admin-drawer" style={{ maxWidth: '580px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#1e1e1e' }}>
                  Pedido #{pedidoSelecionado.id} — Logística e Detalhes
                </h3>
                <span style={{ fontSize: '12px', color: '#888' }}>
                  Realizado em {formatData(pedidoSelecionado.data_pedido)}
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
              {/* Linha do Tempo Visual de Entrega (igual à do Cliente) */}
              <div className="admin-drawer-section">
                <h4>Acompanhamento da Entrega (Linha do Tempo)</h4>
                {(() => {
                  const etapaAtual = obterEtapaRastreio(pedidoSelecionado.status);
                  const steps = [
                    { num: 1, label: 'Pendente' },
                    { num: 2, label: 'Pago' },
                    { num: 3, label: 'Em separação' },
                    { num: 4, label: 'Enviado' },
                    { num: 5, label: 'Em transporte' },
                    { num: 6, label: 'Entregue' },
                  ];
                  return (
                    <div className="conta-timeline" style={{ margin: '12px 0 18px', padding: '12px', background: '#f8f9fa', borderRadius: '8px' }}>
                      {steps.map((st) => {
                        const isCompleted = etapaAtual > st.num || (etapaAtual === 6 && st.num === 6);
                        const isActive = etapaAtual === st.num && etapaAtual !== 6;
                        return (
                          <div
                            key={st.num}
                            className={`conta-timeline-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                          >
                            <div className="conta-timeline-circle">
                              {isCompleted ? '✓' : st.num}
                            </div>
                            <span className="conta-timeline-label" style={{ fontSize: '11px' }}>{st.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

                  <button
                    type="button"
                    className="admin-btn"
                    style={{ background: '#111', color: '#fff', padding: '8px 14px', fontSize: '12px', borderRadius: '6px' }}
                    onClick={() => handleImprimirEtiqueta(pedidoSelecionado)}
                  >
                    🖨️ Imprimir Etiqueta / Separação
                  </button>
                </div>
              </div>

              {/* Controle de Código de Rastreio */}
              <div className="admin-drawer-section">
                <h4>Código de Rastreio (Correios / Jadlog)</h4>
                <form onSubmit={handleSalvarRastreio} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={rastreioInput}
                    onChange={(e) => setRastreioInput(e.target.value.toUpperCase())}
                    placeholder="Ex: AA123456789BR ou 1008991234"
                    className="admin-search-input"
                    style={{ flex: 1, fontFamily: 'monospace', fontWeight: 600 }}
                  />
                  <button
                    type="submit"
                    disabled={salvandoRastreio}
                    className="admin-btn admin-btn-secondary"
                    style={{ padding: '9px 16px', fontSize: '12px', whiteSpace: 'nowrap' }}
                  >
                    {salvandoRastreio ? 'Salvando...' : 'Salvar Rastreio'}
                  </button>
                </form>
                <small style={{ display: 'block', marginTop: '6px', color: '#777', fontSize: '11px' }}>
                  Este código aparece na conta do cliente e é enviado por e-mail quando o pedido é marcado como "Enviado".
                </small>
              </div>

              {/* Dados do Cliente */}
              <div className="admin-drawer-section">
                <h4>Dados do Cliente</h4>
                <div className="admin-pedido-info-card">
                  {(() => {
                    const cInfo = formatarCliente(pedidoSelecionado.user, pedidoSelecionado.email_contato);
                    return (
                      <>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong>Nome:</strong> <span>{cInfo.nome}</span>
                          {cInfo.isDesativada && (
                            <span
                              style={{
                                fontSize: '10px',
                                background: '#fee2e2',
                                color: '#b91c1c',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                              }}
                            >
                              Conta Desativada
                            </span>
                          )}
                        </p>
                        <p><strong>E-mail:</strong> {cInfo.email}</p>
                        <p><strong>Telefone:</strong> {pedidoSelecionado.telefone || pedidoSelecionado.user?.telefone || '—'}</p>
                        {pedidoSelecionado.user?.cpf && (
                          <p><strong>CPF:</strong> {pedidoSelecionado.user.cpf}</p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Entrega */}
              <div className="admin-drawer-section">
                <h4>Endereço e Modalidade de Entrega</h4>
                <div className="admin-pedido-info-card">
                  <p>
                    <strong>Destinatário:</strong> {pedidoSelecionado.logradouro}, {pedidoSelecionado.numero}
                    {pedidoSelecionado.complemento ? ` (${pedidoSelecionado.complemento})` : ''}
                  </p>
                  <p>{pedidoSelecionado.bairro} — {pedidoSelecionado.cidade}/{pedidoSelecionado.estado}</p>
                  <p><strong>CEP:</strong> {pedidoSelecionado.cep}</p>
                  <p style={{ marginTop: '8px', color: '#111', background: '#f0f4f8', padding: '8px 10px', borderRadius: '4px' }}>
                    🚚 <strong>Transportadora escolhida:</strong> {pedidoSelecionado.tipo_frete} ({formatMoeda(pedidoSelecionado.valor_frete)})
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
                <h4>Itens para Separação</h4>
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
