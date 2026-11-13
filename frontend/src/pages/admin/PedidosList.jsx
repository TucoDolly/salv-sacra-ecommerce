import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getPedidosAdmin,
  updateStatusPedidoAdmin,
  enviarMelhorEnvioAdmin,
  consultarRastreioAdmin,
  sincronizarTodosRastreiosAdmin,
  excluirPedidoAdmin,
  limparFinalizadosAdmin,
} from '../../services/adminPedidoService';
import { imprimirReciboPedido } from '../../utils/imprimirRecibo';
import LoadingSpinner from '../../components/LoadingSpinner';
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

function podeExcluirPedido(p) {
  if (p.status === 'Cancelado') return true;
  // Se a devolução já tiver sido concluída, o botão de excluir é liberado para o administrador
  if (p.devolucao && p.devolucao.status === 'Concluida') {
    return true;
  }
  if (p.status === 'Entregue') {
    // Se tiver devolução em andamento, não permite excluir
    if (p.devolucao && ['Pendente', 'Aprovada', 'Em transporte'].includes(p.devolucao.status)) {
      return false;
    }
    const dataRef = new Date(p.updated_at || p.data_pedido).getTime();
    const seteDiasMs = 7 * 24 * 60 * 60 * 1000;
    return (Date.now() - dataRef) >= seteDiasMs;
  }
  return false;
}

function getInfoDevolucao(dev) {
  if (!dev) return null;
  const status = dev.status;
  if (status === 'Pendente') {
    return {
      texto: 'Devolução Solicitada',
      bg: '#fef3c7',
      color: '#92400e',
      border: '#fde68a',
    };
  }
  if (status === 'Aprovada' || status === 'Em transporte') {
    return {
      texto: 'Em Devolução',
      bg: '#e0f2fe',
      color: '#0369a1',
      border: '#7dd3fc',
    };
  }
  if (status === 'Concluida') {
    return {
      texto: 'Devolução Concluída',
      bg: '#dcfce7',
      color: '#15803d',
      border: '#86efac',
    };
  }
  if (status === 'Recusada') {
    return {
      texto: 'Devolução Recusada',
      bg: '#fee2e2',
      color: '#b91c1c',
      border: '#fca5a5',
    };
  }
  return {
    texto: `Devolução (${status})`,
    bg: '#f1f5f9',
    color: '#475569',
    border: '#cbd5e1',
  };
}

function diasRestantesDevolucao(p) {
  const dataRef = new Date(p.updated_at || p.data_pedido).getTime();
  const diasPassados = Math.floor((Date.now() - dataRef) / (24 * 60 * 60 * 1000));
  return Math.max(1, 7 - diasPassados);
}

export default function PedidosList() {
  const [searchParams] = useSearchParams();
  const buscaUrl = searchParams.get('busca') || searchParams.get('pedido') || '';
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filtros
  const [statusFiltro, setStatusFiltro] = useState('');
  const [busca, setBusca] = useState(buscaUrl);

  useEffect(() => {
    if (buscaUrl !== undefined) {
      setBusca(buscaUrl);
    }
  }, [buscaUrl]);

  // Paginação
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Limpeza em lote
  const [modalLimpeza, setModalLimpeza] = useState(false);
  const [limpandoLote, setLimpandoLote] = useState(false);

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

  // Exclusão de pedidos finalizados / cancelados
  const [pedidoParaExcluir, setPedidoParaExcluir] = useState(null);
  const [excluindoPedido, setExcluindoPedido] = useState(false);
  const [avisoBloqueio, setAvisoBloqueio] = useState(null);

  const handleExcluirBloqueado = (p) => {
    if (p.devolucao && ['Pendente', 'Aprovada', 'Em transporte'].includes(p.devolucao.status)) {
      setAvisoBloqueio({
        pedidoId: p.id,
        titulo: 'Exclusão Bloqueada — Devolução Ativa',
        mensagem: `O Pedido #${p.id} possui uma solicitação de devolução/troca em andamento (Status: ${p.devolucao.status}). Para segurança contábil e do cliente, o pedido só poderá ser removido após o término do processo e do prazo legal.`,
      });
      return;
    }
    if (p.status === 'Entregue') {
      const faltam = diasRestantesDevolucao(p);
      setAvisoBloqueio({
        pedidoId: p.id,
        titulo: 'Exclusão Bloqueada — Prazo de Devolução (CDC)',
        mensagem: `Este pedido só pode ser excluído após os 7 dias do direito de devolução do cliente (Art. 49 do CDC). Faltam ainda ${faltam} dia(s) para liberação da exclusão do histórico.`,
      });
      return;
    }
    setAvisoBloqueio({
      pedidoId: p.id,
      titulo: 'Exclusão Não Permitida',
      mensagem: `O Pedido #${p.id} está com status "${p.status}". Apenas pedidos finalizados ("Entregue" após 7 dias ou "Cancelado") podem ser excluídos.`,
    });
  };

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
    setPaginaAtual(1);
    carregarPedidos();

    // Verificação periódica automática de status e entregas no Melhor Envio (a cada 90s)
    const interval = setInterval(() => {
      carregarPedidos();
    }, 90000);
    return () => clearInterval(interval);
  }, [statusFiltro]);

  const handleBuscar = (e) => {
    e.preventDefault();
    setPaginaAtual(1);
    carregarPedidos();
  };

  const handleLimparFinalizados = async () => {
    setLimpandoLote(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await limparFinalizadosAdmin();
      setSuccess(data.message);
      setModalLimpeza(false);
      carregarPedidos();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao limpar pedidos finalizados.');
    } finally {
      setLimpandoLote(false);
    }
  };

  const handleAbrirDetalhe = (pedido) => {
    setPedidoSelecionado(pedido);
    setRastreioInput(pedido.codigo_rastreio || '');
    setCpfManual(pedido.user?.cpf || '');
    setRastreioFeedback(null);
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

  const handleConfirmarExclusao = async () => {
    if (!pedidoParaExcluir) return;
    setExcluindoPedido(true);
    setError('');
    try {
      await excluirPedidoAdmin(pedidoParaExcluir.id);
      setSuccess(`Pedido #${pedidoParaExcluir.id} excluído com sucesso do histórico.`);
      setPedidos((prev) => prev.filter((p) => p.id !== pedidoParaExcluir.id));
      if (pedidoSelecionado && pedidoSelecionado.id === pedidoParaExcluir.id) {
        setPedidoSelecionado(null);
      }
      setPedidoParaExcluir(null);
      window.dispatchEvent(new Event('salv-pedidos-atualizados'));
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao excluir o pedido.');
    } finally {
      setExcluindoPedido(false);
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

  // Cálculo de Paginação
  const totalPedidos = pedidos.length;
  const totalPaginas = itensPorPagina === 'todos' ? 1 : Math.ceil(totalPedidos / Number(itensPorPagina)) || 1;
  const paginaCorrigida = Math.min(Math.max(1, paginaAtual), totalPaginas);

  const inicioIdx = itensPorPagina === 'todos' ? 0 : (paginaCorrigida - 1) * Number(itensPorPagina);
  const fimIdx = itensPorPagina === 'todos' ? totalPedidos : Math.min(inicioIdx + Number(itensPorPagina), totalPedidos);
  const pedidosPaginados = pedidos.slice(inicioIdx, fimIdx);

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
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => setModalLimpeza(true)}
            title="Exclui em lote todos os pedidos cancelados e os pedidos entregues há mais de 7 dias"
            style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            🧹 Limpar Pedidos Finalizados
          </button>
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
        <div style={{ padding: '40px' }}>
          <LoadingSpinner size="md" />
        </div>
      ) : pedidos.length === 0 ? (
        <div className="admin-empty">
          <p>Nenhum pedido encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table" style={{ minWidth: '1050px' }}>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Envio / Rastreio</th>
                <th>Total</th>
                <th>Status Atual</th>
                <th style={{ minWidth: '250px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidosPaginados.map((p) => {
                // Notificação de novo pedido permanece ativa enquanto não avançar para 'Em separação' (ou posteriores)
                const isNovo = p.status === 'Pendente' || p.status === 'Pago';
                const isCancelado = p.status === 'Cancelado';
                return (
                  <tr
                    key={p.id}
                    style={{
                      background: isCancelado ? '#fef2f2' : (isNovo ? '#f0fdf4' : 'transparent'),
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <strong style={{ fontSize: '13.5px' }}>#{p.id}</strong>
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
                              title="Pedido novo pago aguardando processamento"
                            >
                              NOVO
                            </span>
                          )}
                          {isCancelado && (
                            <span
                              style={{
                                background: '#dc2626',
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase',
                                lineHeight: 1,
                              }}
                              title="Pedido cancelado"
                            >
                              CANCELADO
                            </span>
                          )}
                        </div>

                        {/* Botão de Devolução: Varia entre Devolução Solicitada (amarelo), Em Devolução (azul) e Devolução Concluída (verde) */}
                        {(() => {
                          const infoDev = getInfoDevolucao(p.devolucao);
                          if (!infoDev) return null;
                          return (
                            <Link
                              to={`/admin/devolucoes?pedido_id=${p.id}&devolucao_id=${p.devolucao.id}`}
                              style={{
                                background: infoDev.bg,
                                color: infoDev.color,
                                border: `1px solid ${infoDev.border}`,
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                              }}
                              title={`Status da Devolução: ${p.devolucao.status}. Clique para abrir na aba Devoluções e Trocas com destaque.`}
                            >
                              {infoDev.texto}
                            </Link>
                          );
                        })()}
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
                    <div style={{ fontSize: '11px', color: p.codigo_rastreio ? '#475569' : '#94a3b8', fontFamily: p.codigo_rastreio ? 'monospace' : 'inherit' }}>
                      {p.codigo_rastreio ? `📦 ${p.codigo_rastreio}` : '—'}
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
                  <td style={{ minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary admin-btn-sm"
                        onClick={() => handleAbrirDetalhe(p)}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Gerenciar Entrega
                      </button>
                      {podeExcluirPedido(p) ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger admin-btn-sm"
                          onClick={() => setPedidoParaExcluir(p)}
                          title="Excluir pedido do histórico"
                          style={{ padding: '6px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
                        >
                          Excluir
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm"
                          onClick={() => handleExcluirBloqueado(p)}
                          style={{
                            background: '#f1f5f9',
                            color: '#94a3b8',
                            border: '1px solid #e2e8f0',
                            cursor: 'not-allowed',
                            padding: '6px 10px',
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                          }}
                          title="Clique para ver o motivo do bloqueio de exclusão"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>

          {/* ── Controles de Paginação ── */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              borderTop: '1px solid #eee',
              background: '#fafafa',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#555', flexWrap: 'wrap' }}>
              <span>Exibir por página:</span>
              <select
                className="admin-filter-select"
                style={{ padding: '4px 8px', fontSize: '13px' }}
                value={itensPorPagina}
                onChange={(e) => {
                  setItensPorPagina(e.target.value === 'todos' ? 'todos' : Number(e.target.value));
                  setPaginaAtual(1);
                }}
              >
                <option value={10}>10 pedidos</option>
                <option value={20}>20 pedidos</option>
                <option value={50}>50 pedidos</option>
                <option value="todos">Mostrar todos ({totalPedidos})</option>
              </select>
              <span>
                Mostrando <strong>{totalPedidos === 0 ? 0 : inicioIdx + 1}</strong> a <strong>{fimIdx}</strong> de <strong>{totalPedidos}</strong> pedidos
              </span>
            </div>

            {itensPorPagina !== 'todos' && totalPaginas > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  disabled={paginaCorrigida <= 1}
                  style={{ padding: '6px 12px' }}
                >
                  ◀ Anterior
                </button>
                <span style={{ fontSize: '13px', color: '#444', fontWeight: 600, padding: '0 8px' }}>
                  Página {paginaCorrigida} de {totalPaginas}
                </span>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaCorrigida >= totalPaginas}
                  style={{ padding: '6px 12px' }}
                >
                  Próxima ▶
                </button>
              </div>
            )}
          </div>
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
                    <button
                      type="button"
                      className="admin-btn admin-btn-secondary"
                      style={{ padding: '8px 14px', fontSize: '12px', borderRadius: '6px', background: '#fff' }}
                      onClick={() => imprimirReciboPedido(pedidoSelecionado)}
                      title="Imprimir comprovante completo de venda em PDF"
                    >
                      📄 Imprimir Recibo
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

              {/* Botão de Excluir dentro do Drawer (se entregue após 7 dias ou cancelado) */}
              {podeExcluirPedido(pedidoSelecionado) ? (
                <div className="admin-drawer-section" style={{ borderTop: '1px solid #eee', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    onClick={() => setPedidoParaExcluir(pedidoSelecionado)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                  >
                    🗑 Excluir Pedido Permanentemente
                  </button>
                </div>
              ) : pedidoSelecionado.status === 'Entregue' ? (
                <div className="admin-drawer-section" style={{ borderTop: '1px solid #eee', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#854d0e', background: '#fef9c3', padding: '6px 12px', borderRadius: '4px', border: '1px solid #fde047' }}>
                    🔒 Prazo legal de 7 dias para devolução/troca em vigor (restam {diasRestantesDevolucao(pedidoSelecionado)} dia(s)).
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Limpeza em Lote de Pedidos Finalizados ── */}
      {modalLimpeza && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal" style={{ maxWidth: '480px' }}>
            <h3 id="modal-title" style={{ color: '#b91c1c' }}>🧹 Limpar Pedidos Finalizados</h3>
            <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#444' }}>
              Esta ação excluirá permanentemente em lote:
            </p>
            <ul style={{ fontSize: '13px', color: '#555', lineHeight: 1.6, margin: '8px 0 16px 20px' }}>
              <li><strong>Todos os pedidos cancelados</strong> (qualquer data).</li>
              <li><strong>Pedidos entregues há mais de 7 dias</strong> (cujo prazo legal de devolução/troca de 7 dias já expirou e não possuem devolução em andamento).</li>
            </ul>
            <p style={{ fontSize: '13px', color: '#b91c1c', fontWeight: 600 }}>
              ⚠️ Esta operação não pode ser desfeita. Deseja prosseguir com a limpeza?
            </p>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setModalLimpeza(false)}
                disabled={limpandoLote}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                style={{ background: '#c0392b' }}
                onClick={handleLimparFinalizados}
                disabled={limpandoLote}
              >
                {limpandoLote ? 'Limpando...' : 'Confirmar Limpeza em Lote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de confirmação de exclusão de pedido (Admin) ── */}
      {pedidoParaExcluir && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal" style={{ maxWidth: '440px' }}>
            <h3 id="modal-title" style={{ color: '#b91c1c' }}>Confirmar exclusão de pedido</h3>
            <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#444' }}>
              Tem certeza que deseja excluir o <strong>Pedido #{pedidoParaExcluir.id}</strong> (Status: <strong>{pedidoParaExcluir.status}</strong>)?
              <br />
              Esta ação <strong>não pode ser desfeita</strong> e apagará todos os dados vinculados a este pedido no sistema.
            </p>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setPedidoParaExcluir(null)}
                disabled={excluindoPedido}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                style={{ background: '#c0392b' }}
                onClick={handleConfirmarExclusao}
                disabled={excluindoPedido}
              >
                {excluindoPedido ? 'Excluindo…' : 'Sim, excluir pedido'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Modal informativo de bloqueio de exclusão (CDC / Devolução ativa) ── */}
      {avisoBloqueio && (
        <div
          className="admin-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setAvisoBloqueio(null)}
          style={{ zIndex: 99999 }}
        >
          <div
            className="admin-modal"
            style={{ maxWidth: '460px', textAlign: 'left' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>🛡️</span>
              <h3 style={{ margin: 0, fontSize: '17px', color: '#0f172a' }}>{avisoBloqueio.titulo}</h3>
            </div>
            <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.55, margin: '0 0 20px' }}>
              {avisoBloqueio.mensagem}
            </p>
            <div className="admin-modal-actions" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => setAvisoBloqueio(null)}
                style={{ padding: '8px 20px' }}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
