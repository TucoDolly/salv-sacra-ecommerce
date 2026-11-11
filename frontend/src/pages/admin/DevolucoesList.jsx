import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/admin.css';

const TEXTO_PADRAO_INSTRUCOES = `Reembalar o produto (preferencialmente na embalagem original ou pacote com dimensões similares). Retirar etiqueta antiga e imprimir a declaração de conteúdo anexa e fixar na parte externa da embalagem ou entregar ao atendente da agência dos Correios. Informar o código de postagem reversa no atendimento (envio gratuito). Atenção: validade de 7 dias corridos a partir da data de emissão. Dúvidas: WhatsApp (48) 99620-5153.`;

export default function DevolucoesList() {
  const [searchParams] = useSearchParams();
  const pedidoIdParam = searchParams.get('pedido_id');
  const devolucaoIdParam = searchParams.get('devolucao_id');

  const [devolucoes, setDevolucoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [devolucaoSelecionada, setDevolucaoSelecionada] = useState(null);
  const [destaqueId, setDestaqueId] = useState(null);

  // Form de aprovação
  const [codigoPostagem, setCodigoPostagem] = useState('');
  const [prazoPostagem, setPrazoPostagem] = useState('7 dias corridos');
  const [instrucoesAdmin, setInstrucoesAdmin] = useState(TEXTO_PADRAO_INSTRUCOES);
  const [arquivoDeclaracao, setArquivoDeclaracao] = useState(null);
  const [salvandoAprovacao, setSalvandoAprovacao] = useState(false);

  // Form de recusa
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [recusando, setRecusando] = useState(false);
  const [modoRecusa, setModoRecusa] = useState(false);

  // Conclusão
  const [concluindo, setConcluindo] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [modalConcluirConfirm, setModalConcluirConfirm] = useState(false);
  const [modalAlerta, setModalAlerta] = useState({ aberto: false, titulo: '', msg: '' });

  const carregarDevolucoes = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtroStatus) params.status = filtroStatus;
      if (busca) params.busca = busca;

      const { data } = await api.get('/admin/devolucoes', { params });
      setDevolucoes(Array.isArray(data) ? data : (data.data || []));
    } catch {
      // silencia
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDevolucoes();
  }, [filtroStatus]);

  // Efeito rápido de foco e sombra temporária quando acessado a partir de um pedido específico
  useEffect(() => {
    if ((pedidoIdParam || devolucaoIdParam) && devolucoes.length > 0) {
      const devAlvo = devolucoes.find(
        (d) =>
          (devolucaoIdParam && String(d.id) === String(devolucaoIdParam)) ||
          (pedidoIdParam && String(d.pedido_id) === String(pedidoIdParam))
      );

      if (devAlvo) {
        setDestaqueId(devAlvo.id);

        // Rola até o pedido exato na tabela com suavidade
        setTimeout(() => {
          const el = document.getElementById(`devolucao-row-${devAlvo.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);

        // Desativa a sombra temporária após 3 segundos
        const timer = setTimeout(() => {
          setDestaqueId(null);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [pedidoIdParam, devolucaoIdParam, devolucoes]);

  const handleBuscar = (e) => {
    e.preventDefault();
    carregarDevolucoes();
  };

  const abrirModal = (dev) => {
    setDevolucaoSelecionada(dev);
    setCodigoPostagem(dev.codigo_postagem_reversa || '');
    setPrazoPostagem(dev.prazo_postagem || '7 dias corridos');
    setInstrucoesAdmin(dev.instrucoes_admin || TEXTO_PADRAO_INSTRUCOES);
    setArquivoDeclaracao(null);
    setMotivoRecusa('');
    setModoRecusa(false);
    setMensagemSucesso('');
  };

  const handleAprovar = async (e) => {
    e.preventDefault();
    if (!codigoPostagem.trim()) {
      setModalAlerta({ aberto: true, titulo: 'Atenção', msg: 'Informe o Código de Postagem Reversa dos Correios.' });
      return;
    }

    setSalvandoAprovacao(true);
    try {
      const formData = new FormData();
      formData.append('codigo_postagem_reversa', codigoPostagem.trim());
      formData.append('prazo_postagem', prazoPostagem.trim());
      formData.append('instrucoes_admin', instrucoesAdmin.trim());
      if (arquivoDeclaracao) {
        formData.append('declaracao_conteudo', arquivoDeclaracao);
      }

      const { data } = await api.post(`/admin/devolucoes/${devolucaoSelecionada.id}/aprovar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDevolucaoSelecionada(data.devolucao);
      setMensagemSucesso('✓ Devolução aprovada! E-mail com instruções e declaração de conteúdo enviado ao cliente.');
      carregarDevolucoes();
      window.dispatchEvent(new Event('salv-pedidos-atualizados'));
    } catch (err) {
      setModalAlerta({ aberto: true, titulo: 'Erro', msg: err.response?.data?.message || 'Erro ao aprovar devolução.' });
    } finally {
      setSalvandoAprovacao(false);
    }
  };

  const handleRecusar = async (e) => {
    e.preventDefault();
    if (!motivoRecusa.trim()) {
      setModalAlerta({ aberto: true, titulo: 'Atenção', msg: 'Informe a justificativa da recusa.' });
      return;
    }

    setRecusando(true);
    try {
      const { data } = await api.put(`/admin/devolucoes/${devolucaoSelecionada.id}/recusar`, {
        motivo_recusa: motivoRecusa,
      });
      setDevolucaoSelecionada(data.devolucao);
      setModoRecusa(false);
      setMensagemSucesso('Solicitação de devolução recusada.');
      carregarDevolucoes();
      window.dispatchEvent(new Event('salv-pedidos-atualizados'));
    } catch (err) {
      setModalAlerta({ aberto: true, titulo: 'Erro', msg: err.response?.data?.message || 'Erro ao recusar devolução.' });
    } finally {
      setRecusando(false);
    }
  };

  const executarConclusao = async () => {
    setConcluindo(true);
    try {
      const { data } = await api.put(`/admin/devolucoes/${devolucaoSelecionada.id}/concluir`);
      setDevolucaoSelecionada(data.devolucao);
      setMensagemSucesso('✓ Devolução concluída! Cliente notificado com sucesso.');
      setModalConcluirConfirm(false);
      carregarDevolucoes();
      window.dispatchEvent(new Event('salv-pedidos-atualizados'));
    } catch (err) {
      setModalAlerta({ aberto: true, titulo: 'Erro', msg: err.response?.data?.message || 'Erro ao concluir devolução.' });
    } finally {
      setConcluindo(false);
    }
  };

  // KPIs
  const total = devolucoes.length;
  const pendentes = devolucoes.filter((d) => d.status === 'Pendente').length;
  const aprovadas = devolucoes.filter((d) => d.status === 'Aprovada').length;
  const concluidas = devolucoes.filter((d) => d.status === 'Concluida').length;

  return (
    <div className="admin-page" style={{ maxWidth: '1200px' }}>
      <div className="admin-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="admin-title">Devoluções & Logística Reversa</h1>
          <p style={{ color: '#777', fontSize: '14px', marginTop: '4px' }}>
            Gerenciamento de solicitações de troca, autorização de postagem reversa e emissão de estornos.
          </p>
        </div>
      </div>

      {/* ── Cards de Indicadores ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}>
        <div style={{ background: '#fff', padding: '20px 22px', borderRadius: '12px', border: '1px solid #eaeaea' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', fontWeight: 600 }}>
            SOLICITAÇÕES TOTAIS
          </span>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#111', marginTop: '6px' }}>{total}</p>
        </div>

        <div style={{ background: '#fff', padding: '20px 22px', borderRadius: '12px', border: '1.5px solid #fde047', background: '#fefce8' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#854d0e', fontWeight: 700 }}>
            PENDENTES DE ANÁLISE
          </span>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#a16207', marginTop: '6px' }}>{pendentes}</p>
        </div>

        <div style={{ background: '#fff', padding: '20px 22px', borderRadius: '12px', border: '1px solid #eaeaea' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0369a1', fontWeight: 700 }}>
            AUTORIZADAS / EM TRÂNSITO
          </span>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#0284c7', marginTop: '6px' }}>{aprovadas}</p>
        </div>

        <div style={{ background: '#fff', padding: '20px 22px', borderRadius: '12px', border: '1px solid #eaeaea' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#15803d', fontWeight: 700 }}>
            CONCLUÍDAS
          </span>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#16a34a', marginTop: '6px' }}>{concluidas}</p>
        </div>
      </div>

      {/* ── Filtros e Barra de Busca ── */}
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid #eaeaea',
        marginBottom: '24px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: '', rotulo: 'Todas' },
            { id: 'Pendente', rotulo: 'Pendentes' },
            { id: 'Aprovada', rotulo: 'Aprovadas' },
            { id: 'Concluida', rotulo: 'Concluídas' },
            { id: 'Recusada', rotulo: 'Recusadas' },
          ].map((tab) => {
            const ativo = filtroStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFiltroStatus(tab.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: ativo ? '1.5px solid #111' : '1px solid #ddd',
                  background: ativo ? '#111' : '#fff',
                  color: ativo ? '#fff' : '#444',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tab.rotulo}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleBuscar} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Buscar por Pedido #, Cliente ou Código..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontSize: '13px',
              width: '280px',
              outline: 'none',
            }}
          />
          <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm" style={{ padding: '8px 16px' }}>
            Buscar
          </button>
        </form>
      </div>

      {/* ── Tabela de Solicitações ── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eaeaea', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
            Carregando devoluções...
          </div>
        ) : devolucoes.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
            Nenhuma solicitação de devolução encontrada.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 20px' }}>Pedido / Data</th>
                  <th style={{ padding: '14px 20px' }}>Cliente</th>
                  <th style={{ padding: '14px 20px' }}>Motivo</th>
                  <th style={{ padding: '14px 20px' }}>Preferencia</th>
                  <th style={{ padding: '14px 20px' }}>Valor</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {devolucoes.map((d) => {
                  const clienteNome = d.user?.name || d.pedido?.user?.name || 'Cliente';
                  const clienteEmail = d.user?.email || d.pedido?.email_contato || '-';
                  const valorFmt = Number(d.valor_estorno || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                  let badgeBg = '#fefce8';
                  let badgeColor = '#a16207';
                  if (d.status === 'Aprovada') { badgeBg = '#e0f2fe'; badgeColor = '#0369a1'; }
                  if (d.status === 'Concluida') { badgeBg = '#dcfce7'; badgeColor = '#15803d'; }
                  if (d.status === 'Recusada') { badgeBg = '#fee2e2'; badgeColor = '#b91c1c'; }

                  const isDestacado = destaqueId === d.id;

                  return (
                    <tr
                      key={d.id}
                      id={`devolucao-row-${d.id}`}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'all 0.4s ease',
                        background: isDestacado ? '#eff6ff' : 'transparent',
                        boxShadow: isDestacado
                          ? '0 0 0 3px #3b82f6, 0 10px 28px rgba(59, 130, 246, 0.35)'
                          : 'none',
                        position: isDestacado ? 'relative' : 'static',
                        zIndex: isDestacado ? 10 : 1,
                      }}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <strong style={{ color: '#111' }}>Pedido #{d.pedido_id}</strong>
                        <div style={{ fontSize: '11px', color: '#888' }}>
                          {new Date(d.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <strong>{clienteNome}</strong>
                        <div style={{ fontSize: '11px', color: '#666' }}>{clienteEmail}</div>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#333' }}>
                        {d.motivo}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {d.tipo_solicitacao === 'cupom' ? (
                          <span style={{ fontSize: '11px', background: '#f3e8ff', color: '#7e22ce', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                            🎟️ Vale-Compras
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '4px', fontWeight: 700 }}>
                            💳 Reembolso
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#111' }}>
                        {valorFmt}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: badgeBg,
                          color: badgeColor,
                        }}>
                          {d.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => abrirModal(d)}
                          className="admin-btn admin-btn-secondary admin-btn-sm"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                        >
                          Gerenciar ↗
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal de Gestão da Devolução ── */}
      {devolucaoSelecionada && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '20px',
          }}
          onClick={() => setDevolucaoSelecionada(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '14px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Topo do Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #eee', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', fontWeight: 700 }}>
                  Solicitação #{devolucaoSelecionada.id}
                </span>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0 0', color: '#111' }}>
                  Devolução do Pedido #{devolucaoSelecionada.pedido_id}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDevolucaoSelecionada(null)}
                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>

            {mensagemSucesso && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '20px' }}>
                {mensagemSucesso}
              </div>
            )}

            {/* Dados do Cliente e Pedido */}
            <div style={{ background: '#f8fafc', padding: '16px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Cliente</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: '#111' }}>
                    {devolucaoSelecionada.user?.name || devolucaoSelecionada.pedido?.user?.name || 'Cliente'}
                  </p>
                  <span style={{ color: '#888', fontSize: '12px' }}>
                    {devolucaoSelecionada.user?.email || devolucaoSelecionada.pedido?.email_contato}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Preferência do Cliente</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 700, color: devolucaoSelecionada.tipo_solicitacao === 'cupom' ? '#7e22ce' : '#0369a1' }}>
                    {devolucaoSelecionada.tipo_solicitacao === 'cupom' ? '🎟️ Vale-Compras (Troca de Peça)' : '💳 Estorno / Reembolso'}
                  </p>
                </div>
              </div>

              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>
                <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', fontWeight: 700 }}>Motivo Indicado:</span>
                <p style={{ margin: '2px 0 0', fontWeight: 600, color: '#333' }}>
                  {devolucaoSelecionada.motivo}
                </p>
                {devolucaoSelecionada.descricao && (
                  <p style={{ margin: '4px 0 0', color: '#555', fontStyle: 'italic', background: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    "{devolucaoSelecionada.descricao}"
                  </p>
                )}
              </div>
            </div>

            {/* Peças Selecionadas para Devolução */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', margin: '0 0 10px', fontWeight: 700 }}>
                Peças a serem devolvidas:
              </h4>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                {(devolucaoSelecionada.itens_devolvidos || []).map((it, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: idx === devolucaoSelecionada.itens_devolvidos.length - 1 ? 'none' : '1px solid #f1f5f9', fontSize: '13px' }}>
                    <div>
                      <strong>{it.quantidade}x {it.nome}</strong>
                      <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>Variação: {it.variacao || '-'}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: '#111' }}>
                        {Number(it.subtotal || (it.quantidade * it.preco_unitario)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', fontSize: '14px', fontWeight: 800, color: '#111' }}>
                Total a ressarcir: {Number(devolucaoSelecionada.valor_estorno).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>

            {/* Fotos anexadas pelo cliente */}
            {devolucaoSelecionada.fotos && devolucaoSelecionada.fotos.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', margin: '0 0 10px', fontWeight: 700 }}>
                  📷 Fotos do produto / defeito anexadas pelo cliente ({devolucaoSelecionada.fotos.length}):
                </h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {devolucaoSelecionada.fotos.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Clique para ver a foto em tamanho original"
                      style={{
                        display: 'block',
                        width: '84px',
                        height: '84px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #cbd5e1',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                      }}
                    >
                      <img
                        src={url}
                        alt={`Foto do cliente ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ── Ações Conforme o Status ── */}
            {devolucaoSelecionada.status === 'Pendente' && (
              <div style={{ background: '#fffbeb', border: '1.5px solid #fde047', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#854d0e', margin: '0 0 12px' }}>
                  1. Aprovar Solicitação & Gerar Postagem Reversa
                </h4>

                <form onSubmit={handleAprovar}>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#333', marginBottom: '4px' }}>
                      Código de Autorização de Postagem dos Correios / Logística Reversa *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 987654321 ou código emitido no Melhor Envio/Correios"
                      value={codigoPostagem}
                      onChange={(e) => setCodigoPostagem(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', outline: 'none', fontWeight: 700, fontFamily: 'monospace' }}
                    />
                    <span style={{ fontSize: '11px', color: '#888', display: 'block', marginTop: '3px' }}>
                      O cliente apresentará este código no balcão da agência para despachar o pacote sem custos.
                    </span>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#333', marginBottom: '4px' }}>
                      Prazo / Validade do Código
                    </label>
                    <input
                      type="text"
                      value={prazoPostagem}
                      onChange={(e) => setPrazoPostagem(e.target.value)}
                      placeholder="Ex: 7 dias corridos"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', outline: 'none' }}
                    />
                  </div>

                  {/* ── Campo de Upload da Declaração de Conteúdo (DC-e) ── */}
                  <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      📄 Declaração de Conteúdo (PDF ou Imagem)
                    </label>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '8px', lineHeight: 1.4 }}>
                      Anexe o arquivo gerado no Melhor Envio ou Correios. O arquivo será anexado no e-mail de aprovação e disponibilizado para download na área do cliente.
                    </span>

                    {devolucaoSelecionada.declaracao_conteudo_url && (
                      <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                        <span style={{ color: '#166534', fontWeight: 600 }}>✓ Arquivo atual:</span>
                        <a
                          href={devolucaoSelecionada.declaracao_conteudo_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: 600 }}
                        >
                          {devolucaoSelecionada.declaracao_conteudo_nome || 'Ver Declaração de Conteúdo'} ↗
                        </a>
                      </div>
                    )}

                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setArquivoDeclaracao(e.target.files?.[0] || null)}
                      style={{ fontSize: '12px', color: '#475569' }}
                    />
                    {arquivoDeclaracao && (
                      <span style={{ display: 'block', fontSize: '11px', color: '#0284c7', fontWeight: 600, marginTop: '5px' }}>
                        Novo arquivo pronto para envio: {arquivoDeclaracao.name} ({(arquivoDeclaracao.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: '#333' }}>
                        Orientações ao Cliente (Enviadas por e-mail)
                      </label>
                      <button
                        type="button"
                        onClick={() => setInstrucoesAdmin(TEXTO_PADRAO_INSTRUCOES)}
                        style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Restaurar texto padrão
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={instrucoesAdmin}
                      onChange={(e) => setInstrucoesAdmin(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '12px', outline: 'none', resize: 'vertical' }}
                    />
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '3px' }}>
                      💬 Inclui link direto e botão de atendimento com o WhatsApp da loja: (48) 99620-5153.
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setModoRecusa(!modoRecusa)}
                      style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {modoRecusa ? 'Cancelar recusa' : 'Recusar esta solicitação'}
                    </button>

                    <button
                      type="submit"
                      disabled={salvandoAprovacao}
                      className="admin-btn admin-btn-primary admin-btn-sm"
                      style={{ padding: '9px 20px', background: '#0284c7' }}
                    >
                      {salvandoAprovacao ? 'Aprovando...' : '✓ Aprovar e Enviar Código ao Cliente'}
                    </button>
                  </div>
                </form>

                {modoRecusa && (
                  <form onSubmit={handleRecusar} style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #fed7aa' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>
                      Justificativa da Recusa (visível para o cliente) *
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Ex: Solicitação realizada após o prazo legal de 7 dias do CDC..."
                      value={motivoRecusa}
                      onChange={(e) => setMotivoRecusa(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #fca5a5', fontSize: '12px', outline: 'none' }}
                    />
                    <div style={{ textAlign: 'right', marginTop: '8px' }}>
                      <button
                        type="submit"
                        disabled={recusando}
                        className="admin-btn admin-btn-sm"
                        style={{ background: '#dc2626', color: '#fff' }}
                      >
                        {recusando ? 'Recusando...' : 'Confirmar Recusa'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {devolucaoSelecionada.status === 'Aprovada' && (
              <div style={{ background: '#f0f9ff', border: '1.5px solid #38bdf8', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0369a1', margin: '0 0 10px' }}>
                  2. Pacote em Logística Reversa (Correios)
                </h4>
                <div style={{ margin: '0 0 14px', fontSize: '13px', color: '#0c4a6e', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span>Código de Postagem Reversa: <strong>{devolucaoSelecionada.codigo_postagem_reversa}</strong></span>
                  {devolucaoSelecionada.codigo_postagem_reversa && (
                    <a
                      href={`https://rastreamento.correios.com.br/app/index.php?codigo=${encodeURIComponent(devolucaoSelecionada.codigo_postagem_reversa)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        background: '#0284c7',
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      Acompanhar Rastreio ↗
                    </a>
                  )}
                </div>

                {devolucaoSelecionada.declaracao_conteudo_url && (
                  <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '6px', border: '1.5px dashed #0284c7', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#0369a1', fontWeight: 600 }}>
                      📄 Declaração de Conteúdo: {devolucaoSelecionada.declaracao_conteudo_nome || 'Documento em PDF/Imagem'}
                    </span>
                    <a
                      href={devolucaoSelecionada.declaracao_conteudo_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '12px', color: '#0284c7', fontWeight: 700, textDecoration: 'underline' }}
                    >
                      Visualizar Documento ↗
                    </a>
                  </div>
                )}

                <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #bae6fd', marginBottom: '16px', fontSize: '13px' }}>
                  <p style={{ margin: '0 0 8px', fontWeight: 700, color: '#111' }}>
                    As peças já chegaram de volta e foram conferidas?
                  </p>
                  <span style={{ color: '#555', fontSize: '12px', display: 'block', lineHeight: 1.5 }}>
                    {devolucaoSelecionada.tipo_solicitacao === 'cupom'
                      ? `Ao concluir, o sistema gerará automaticamente um Vale-Compras de ${Number(devolucaoSelecionada.valor_estorno).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} e enviará por e-mail para o cliente realizar uma nova compra.`
                      : `Ao concluir, confirme que realizou o estorno financeiro de ${Number(devolucaoSelecionada.valor_estorno).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} via Mercado Pago/PIX.`}
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => setModalConcluirConfirm(true)}
                    disabled={concluindo}
                    className="admin-btn admin-btn-primary admin-btn-sm"
                    style={{ background: '#16a34a', padding: '10px 24px' }}
                  >
                    {concluindo ? 'Concluindo...' : '✓ Concluir Devolução & Notificar Cliente'}
                  </button>
                </div>
              </div>
            )}

            {devolucaoSelecionada.status === 'Concluida' && (
              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#15803d', margin: '0 0 8px' }}>
                  ✓ Processo de Devolução Concluído
                </h4>
                <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#166534' }}>
                  Data de conclusão: {devolucaoSelecionada.data_conclusao ? new Date(devolucaoSelecionada.data_conclusao).toLocaleDateString('pt-BR') : 'Hoje'}
                </p>
                {devolucaoSelecionada.cupom_gerado_codigo && (
                  <div style={{ marginTop: '10px', padding: '10px 14px', background: '#fff', border: '1px dashed #22c55e', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666', fontWeight: 700 }}>Cupom de Vale-Compras Emitido:</span>
                    <p style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 800, color: '#15803d', fontFamily: 'monospace' }}>
                      {devolucaoSelecionada.cupom_gerado_codigo}
                    </p>
                  </div>
                )}
              </div>
            )}

            {devolucaoSelecionada.status === 'Recusada' && (
              <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#b91c1c', margin: '0 0 8px' }}>
                  Devolução Recusada
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#991b1b' }}>
                  Motivo: {devolucaoSelecionada.motivo_recusa}
                </p>
              </div>
            )}

            <div style={{ textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setDevolucaoSelecionada(null)}
                className="admin-btn admin-btn-secondary admin-btn-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Confirmação de Conclusão da Devolução (Substitui confirm) ── */}
      {modalConcluirConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1400,
            padding: '20px',
          }}
          onClick={() => !concluindo && setModalConcluirConfirm(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                📦
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Concluir Devolução / Troca
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Pedido #{devolucaoSelecionada?.pedido_id}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.6, margin: '0 0 16px 0' }}>
              Confirma que as peças devolvidas foram <strong>recebidas na loja física e conferidas</strong>?
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px', fontSize: '13px', color: '#475569', lineHeight: 1.45 }}>
              {devolucaoSelecionada?.tipo_solicitacao === 'cupom' ? (
                <>
                  🎟️ Ao confirmar, o sistema gerará automaticamente um <strong>Vale-Compras de {Number(devolucaoSelecionada?.valor_estorno || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> e enviará por e-mail para o cliente.
                </>
              ) : (
                <>
                  💳 Ao confirmar, o sistema registrará a conclusão e enviará um e-mail confirmando o <strong>estorno de {Number(devolucaoSelecionada?.valor_estorno || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>.
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setModalConcluirConfirm(false)}
                disabled={concluindo}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executarConclusao}
                disabled={concluindo}
                style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: concluindo ? 'not-allowed' : 'pointer' }}
              >
                {concluindo ? 'Concluindo...' : 'Sim, Concluir Devolução'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Alerta Administrativo (Substitui alert) ── */}
      {modalAlerta.aberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1400,
            padding: '20px',
          }}
          onClick={() => setModalAlerta({ aberto: false, titulo: '', msg: '' })}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>⚠️</div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
              {modalAlerta.titulo}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              {modalAlerta.msg}
            </p>
            <button
              type="button"
              onClick={() => setModalAlerta({ aberto: false, titulo: '', msg: '' })}
              style={{
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 24px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

