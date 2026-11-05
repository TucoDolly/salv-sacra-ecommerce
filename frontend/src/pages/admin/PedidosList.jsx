import { useEffect, useState } from 'react';
import {
  getPedidosAdmin,
  updateStatusPedidoAdmin,
  enviarMelhorEnvioAdmin,
  consultarRastreioAdmin,
  sincronizarTodosRastreiosAdmin,
} from '../../services/adminPedidoService';
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
  const [consultandoRastreio, setConsultandoRastreio] = useState(false);
  const [sincronizandoTodos, setSincronizandoTodos] = useState(false);
  const [enviandoMelhorEnvio, setEnviandoMelhorEnvio] = useState(false);
  const [cpfManual, setCpfManual] = useState('');
  const [rastreioFeedback, setRastreioFeedback] = useState(null);

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
    setCpfManual(pedido.user?.cpf || '');
    setRastreioFeedback(null);
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
      window.dispatchEvent(new Event('salv-pedidos-atualizados'));
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

  const handleConsultarRastreio = async () => {
    if (!pedidoSelecionado) return;
    setConsultandoRastreio(true);
    setRastreioFeedback(null);
    try {
      const { data } = await consultarRastreioAdmin(pedidoSelecionado.id);
      if (data.pedido) {
        setPedidos((prev) =>
          prev.map((p) => (p.id === pedidoSelecionado.id ? { ...p, ...data.pedido } : p))
        );
        setPedidoSelecionado((prev) => ({ ...prev, ...data.pedido }));
      }
      setRastreioFeedback({
        tipo: data.info?.atualizado ? 'sucesso' : 'info',
        msg: data.mensagem || 'Consulta realizada com sucesso.',
      });
    } catch {
      setRastreioFeedback({
        tipo: 'erro',
        msg: 'Não foi possível consultar o rastreio no momento.',
      });
    } finally {
      setConsultandoRastreio(false);
    }
  };

  const handleSincronizarTodos = async () => {
    setSincronizandoTodos(true);
    setError('');
    try {
      const { data } = await sincronizarTodosRastreiosAdmin();
      setSuccess(data.mensagem || 'Sincronização concluída com sucesso!');
      carregarPedidos();
      setTimeout(() => setSuccess(''), 5000);
    } catch {
      setError('Erro ao sincronizar os rastreios com a transportadora.');
    } finally {
      setSincronizandoTodos(false);
    }
  };

  const handleCopiarDadosEnvio = (pedido) => {
    if (!pedido) return;
    const cInfo = formatarCliente(pedido.user, pedido.email_contato);
    const qtdTotal = (pedido.itens || []).reduce((acc, it) => acc + (it.quantidade || 1), 0) || 1;
    const pesoKg = Math.max(0.3, qtdTotal * 0.25).toFixed(2);
    const alturaCm = Math.min(30, Math.max(4, qtdTotal * 3));

    const texto = `DESTINATÁRIO:
Nome: ${cInfo.nome}
CPF: ${pedido.user?.cpf || 'Não informado'}
Telefone: ${pedido.telefone || pedido.user?.telefone || 'Não informado'}
E-mail: ${cInfo.email}

ENDEREÇO DE ENTREGA:
Rua/Av: ${pedido.logradouro}, ${pedido.numero}${pedido.complemento ? ' - ' + pedido.complemento : ''}
Bairro: ${pedido.bairro}
Cidade/UF: ${pedido.cidade}/${pedido.estado}
CEP: ${pedido.cep}

PACOTE:
Modalidade: ${pedido.tipo_frete || 'Correios PAC'}
Dimensões: ${alturaCm}cm (Altura) x 22cm (Largura) x 28cm (Comprimento)
Peso estimado: ${pesoKg} kg (${qtdTotal} item(ns))
Valor Declarado: ${formatMoeda(pedido.valor_total)}`;

    navigator.clipboard?.writeText(texto);
    setSuccess(`Dados do Pedido #${pedido.id} copiados para o Melhor Envio!`);
    setTimeout(() => setSuccess(''), 4000);
  };

  const handleEnviarMelhorEnvio = async () => {
    if (!pedidoSelecionado) return;
    setEnviandoMelhorEnvio(true);
    setError('');
    try {
      const payload = {};
      if (cpfManual.trim()) {
        payload.cpf = cpfManual.replace(/\D/g, '');
      }
      const { data } = await enviarMelhorEnvioAdmin(pedidoSelecionado.id, payload);
      const pedidoAtualizado = data.pedido;
      setPedidos((prev) =>
        prev.map((p) => (p.id === pedidoSelecionado.id ? { ...p, ...pedidoAtualizado } : p))
      );
      setPedidoSelecionado((prev) => ({ ...prev, ...pedidoAtualizado }));
      setSuccess(data.mensagem || 'Pedido enviado para o Carrinho do Melhor Envio com sucesso!');
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      const msg = err.response?.data?.mensagem || 'Erro ao enviar pedido para o Melhor Envio.';
      setError(msg);
    } finally {
      setEnviandoMelhorEnvio(false);
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
      <div className="admin-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="admin-title">Pedidos, Pagamentos e Entregas</h1>
          <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
            Gerencie pedidos realizados, informe o código de rastreio dos Correios, imprima etiquetas e acompanhe entregas.
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-secondary"
          onClick={handleSincronizarTodos}
          disabled={sincronizandoTodos}
          title="Verifica se os pacotes em transporte foram entregues"
          style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          {sincronizandoTodos ? '🔄 Verificando...' : '🔄 Sincronizar Rastreios'}
        </button>
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
              {pedidos.map((p) => {
                // Notificação de novo pedido só sai quando for alterado para 'Em separação' (ou posteriores)
                const isNovo = p.status === 'Pendente' || p.status === 'Pago';
                return (
                  <tr key={p.id} style={{ background: isNovo ? '#f0fdf4' : 'transparent' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>#{p.id}</strong>
                        {isNovo && (
                          <span
                            style={{
                              background: '#15803d',
                              color: '#fff',
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              letterSpacing: '0.5px',
                              textTransform: 'uppercase',
                              lineHeight: 1,
                            }}
                            title="Pedido novo aguardando processamento"
                          >
                            NOVO
                          </span>
                        )}
                      </div>
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
                      {p.metodo_pagamento === 'cartao_credito'
                        ? 'Cartão de Crédito'
                        : p.metodo_pagamento === 'cartao_debito'
                        ? 'Cartão de Débito'
                        : p.metodo_pagamento}
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
              );
            })}
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

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {pedidoSelecionado.status === 'Pago' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                        onClick={() => handleAlterarStatus(pedidoSelecionado.id, 'Em separação')}
                      >
                        📦 Iniciar Separação
                      </button>
                    )}
                    {pedidoSelecionado.status === 'Em separação' && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                        onClick={() => handleAlterarStatus(pedidoSelecionado.id, 'Enviado')}
                      >
                        🚚 Marcar como Enviado
                      </button>
                    )}
                    {(pedidoSelecionado.status === 'Enviado' || pedidoSelecionado.status === 'Em transporte') && (
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        style={{ fontSize: '12px', padding: '6px 12px', background: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' }}
                        onClick={() => handleAlterarStatus(pedidoSelecionado.id, 'Entregue')}
                      >
                        ✅ Confirmar Entrega
                      </button>
                    )}

                    <button
                      type="button"
                      className="admin-btn"
                      style={{ background: '#111', color: '#fff', padding: '8px 14px', fontSize: '12px', borderRadius: '6px' }}
                      onClick={() => handleImprimirEtiqueta(pedidoSelecionado)}
                    >
                      🖨️ Imprimir Etiqueta / Romaneio
                    </button>
                  </div>
                </div>
              </div>

              {/* Integração Direta com Melhor Envio */}
              <div className="admin-drawer-section" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px' }}>📦 Integração Automática (Melhor Envio)</h4>
                  {pedidoSelecionado.melhor_envio_id ? (
                    <span style={{ fontSize: '11px', background: '#dcfce7', color: '#166534', fontWeight: 700, padding: '3px 8px', borderRadius: '4px' }}>
                      ✓ No Carrinho do Melhor Envio
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', fontWeight: 600, padding: '3px 8px', borderRadius: '4px' }}>
                      Aguardando envio ao carrinho
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '12px', color: '#555', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                  Envie os dados do pedido (destinatário, endereço, CPF e medidas) direto para o seu carrinho do Melhor Envio com 1 clique. Depois é só abrir o painel para pagar e imprimir a etiqueta.
                </p>

                {/* Campo de CPF manual caso o cliente não tenha no cadastro */}
                {(!pedidoSelecionado.user?.cpf || pedidoSelecionado.user.cpf.length < 11) && (
                  <div style={{ marginBottom: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 12px' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>
                      ⚠️ CPF do destinatário (obrigatório para etiqueta dos Correios):
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      maxLength="14"
                      value={cpfManual}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, '').slice(0, 11);
                        if (v.length > 9) v = `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
                        else if (v.length > 6) v = `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
                        else if (v.length > 3) v = `${v.slice(0, 3)}.${v.slice(3)}`;
                        setCpfManual(v);
                      }}
                      className="admin-search-input"
                      style={{ width: '100%', maxWidth: '240px', height: '32px', fontSize: '12px', background: '#fff' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    disabled={enviandoMelhorEnvio}
                    onClick={handleEnviarMelhorEnvio}
                    className="admin-btn"
                    style={{
                      background: '#1d4ed8',
                      color: '#fff',
                      fontSize: '12px',
                      padding: '8px 14px',
                      fontWeight: 600,
                      borderRadius: '6px',
                    }}
                  >
                    {enviandoMelhorEnvio ? '⚡ Enviando Dados...' : pedidoSelecionado.melhor_envio_id ? '⚡ Reenviar ao Carrinho' : '⚡ Enviar para o Carrinho do Melhor Envio'}
                  </button>

                  <a
                    href="https://app.melhorenvio.com.br/carrinho"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="admin-btn admin-btn-secondary"
                    style={{ fontSize: '12px', padding: '8px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    🛒 Abrir Carrinho do Melhor Envio ↗
                  </a>

                  <button
                    type="button"
                    className="admin-btn admin-btn-secondary"
                    style={{ fontSize: '11px', padding: '6px 10px', background: '#fff' }}
                    title="Copia os dados formatados caso prefira preencher avulso"
                    onClick={() => handleCopiarDadosEnvio(pedidoSelecionado)}
                  >
                    📋 Copiar Dados
                  </button>
                </div>
              </div>

              {/* Controle de Código de Rastreio */}
              <div className="admin-drawer-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ margin: 0 }}>Código de Rastreio (Correios PAC / SEDEX)</h4>
                </div>
                <form onSubmit={handleSalvarRastreio} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={rastreioInput}
                    onChange={(e) => setRastreioInput(e.target.value.toUpperCase())}
                    placeholder="Ex: NL123456789BR"
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

                {pedidoSelecionado.codigo_rastreio && (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      disabled={consultandoRastreio}
                      onClick={handleConsultarRastreio}
                      className="admin-btn admin-btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {consultandoRastreio ? '🔍 Consultando...' : '🔍 Consultar Rastreio Agora'}
                    </button>

                    <a
                      href={`https://rastreamento.correios.com.br/app/index.php?codigo=${encodeURIComponent(pedidoSelecionado.codigo_rastreio)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-btn"
                      style={{
                        background: '#fef08a',
                        color: '#854d0e',
                        border: '1px solid #fde047',
                        fontSize: '12px',
                        padding: '6px 12px',
                        textDecoration: 'none',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        borderRadius: '4px',
                      }}
                    >
                      📦 Rastrear nos Correios ↗
                    </a>
                  </div>
                )}

                {rastreioFeedback && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      background:
                        rastreioFeedback.tipo === 'sucesso'
                          ? '#dcfce7'
                          : rastreioFeedback.tipo === 'erro'
                          ? '#fee2e2'
                          : '#eff6ff',
                      color:
                        rastreioFeedback.tipo === 'sucesso'
                          ? '#166534'
                          : rastreioFeedback.tipo === 'erro'
                          ? '#991b1b'
                          : '#1e40af',
                    }}
                  >
                    {rastreioFeedback.msg}
                  </div>
                )}

                <small style={{ display: 'block', marginTop: '6px', color: '#777', fontSize: '11px' }}>
                  Este código aparece na conta do cliente e é enviado por e-mail automaticamente quando o pedido é despachado na agência.
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
                    <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>
                      {pedidoSelecionado.metodo_pagamento === 'cartao_credito'
                        ? 'Cartão de Crédito'
                        : pedidoSelecionado.metodo_pagamento === 'cartao_debito'
                        ? 'Cartão de Débito'
                        : pedidoSelecionado.metodo_pagamento}
                    </span>
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
