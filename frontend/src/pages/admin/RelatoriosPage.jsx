import { useEffect, useState } from 'react';
import { getRelatoriosAdmin } from '../../services/adminRelatorioService';
import '../../styles/admin.css';

const PERIODOS = [
  { id: 'hoje', rotulo: 'Hoje' },
  { id: '7dias', rotulo: 'Últimos 7 dias' },
  { id: '30dias', rotulo: 'Últimos 30 dias' },
  { id: 'mes_atual', rotulo: 'Este Mês' },
  { id: 'ano_atual', rotulo: 'Este Ano' },
];

const formatBRL = (val) =>
  Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState('30dias');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [modoCustom, setModoCustom] = useState(false);

  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  const carregarRelatorio = async () => {
    setLoading(true);
    setErro('');
    try {
      const params = {};
      if (modoCustom) {
        params.periodo = 'custom';
        if (dataInicio) params.data_inicio = dataInicio;
        if (dataFim) params.data_fim = dataFim;
      } else {
        params.periodo = periodo;
      }

      const { data } = await getRelatoriosAdmin(params);
      setDados(data);
    } catch {
      setErro('Não foi possível carregar os relatórios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarRelatorio();
  }, [periodo]);

  const aplicarFiltroCustomizado = (e) => {
    e.preventDefault();
    setModoCustom(true);
    carregarRelatorio();
  };

  const selecionarPeriodoPredefinido = (pId) => {
    setModoCustom(false);
    setPeriodo(pId);
  };

  // Exportação rápida para CSV
  const exportarCSV = () => {
    if (!dados?.pedidos?.length) return;

    const headers = ['ID', 'Cliente', 'Email', 'Data', 'Status', 'Pagamento', 'Frete (R$)', 'Total (R$)'];
    const rows = dados.pedidos.map((p) => [
      `#${p.id}`,
      `"${p.cliente.replace(/"/g, '""')}"`,
      `"${p.email || ''}"`,
      p.data,
      p.status,
      p.metodo_pagamento,
      p.valor_frete.toFixed(2),
      p.valor_total.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_vendas_${periodo}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kpis = dados?.kpis || {};
  const pagamentos = dados?.pagamentos || [];
  const topProdutos = dados?.top_produtos || [];
  const pedidos = dados?.pedidos || [];

  return (
    <div className="admin-page" style={{ maxWidth: '1200px' }}>
      {/* ── Topo do Painel de Relatórios ── */}
      <div className="admin-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="admin-title">Relatórios & Faturamento</h1>
          <p style={{ color: '#777', fontSize: '14px', marginTop: '4px' }}>
            Desempenho de vendas, ticket médio, canais de pagamento e ranking de produtos.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={exportarCSV}
            disabled={loading || !pedidos.length}
            className="admin-btn admin-btn-secondary"
            title="Exportar pedidos deste período em planilha CSV"
          >
            📊 Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="admin-btn admin-btn-secondary"
            title="Imprimir relatório"
          >
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {/* ── Barra de Seleção de Período ── */}
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '16px 20px',
        border: '1px solid #eaeaea',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        marginBottom: '28px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
      }}>
        {/* Abas de Período Rápido */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {PERIODOS.map((p) => {
            const ativo = !modoCustom && periodo === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selecionarPeriodoPredefinido(p.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: ativo ? '1.5px solid #111' : '1px solid #ddd',
                  background: ativo ? '#111' : '#fff',
                  color: ativo ? '#fff' : '#444',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.rotulo}
              </button>
            );
          })}
        </div>

        {/* Filtro por Datas Customizadas */}
        <form onSubmit={aplicarFiltroCustomizado} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', color: '#666', fontWeight: 600 }}>De:</span>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: '13px', color: '#666', fontWeight: 600 }}>Até:</span>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            className="admin-btn admin-btn-primary admin-btn-sm"
            style={{ padding: '7px 14px' }}
          >
            Filtrar
          </button>
        </form>
      </div>

      {erro && (
        <div style={{ padding: '14px', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '24px' }}>
          {erro}
        </div>
      )}

      {/* ── 4 Cards de Métricas Principais ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '28px',
      }}>
        {/* Card 1: Faturamento Bruto */}
        <div style={{ background: '#fff', padding: '22px 24px', borderRadius: '12px', border: '1px solid #eaeaea', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', fontWeight: 600 }}>
            FATURAMENTO TOTAL
          </span>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#111', marginTop: '8px', letterSpacing: '-0.5px' }}>
            {loading ? '...' : formatBRL(kpis.faturamento_total)}
          </p>
          <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 600 }}>
            {kpis.pedidos_validos || 0} pedidos confirmados
          </span>
        </div>

        {/* Card 2: Ticket Médio */}
        <div style={{ background: '#fff', padding: '22px 24px', borderRadius: '12px', border: '1px solid #eaeaea', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', fontWeight: 600 }}>
            TICKET MÉDIO
          </span>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#111', marginTop: '8px', letterSpacing: '-0.5px' }}>
            {loading ? '...' : formatBRL(kpis.ticket_medio)}
          </p>
          <span style={{ fontSize: '12px', color: '#666' }}>
            Média por pedido aprovado
          </span>
        </div>

        {/* Card 3: Taxa de Aprovação */}
        <div style={{ background: '#fff', padding: '22px 24px', borderRadius: '12px', border: '1px solid #eaeaea', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', fontWeight: 600 }}>
            TAXA DE SUCESSO
          </span>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#111', marginTop: '8px', letterSpacing: '-0.5px' }}>
            {loading ? '...' : `${kpis.taxa_aprovacao ?? 0}%`}
          </p>
          <span style={{ fontSize: '12px', color: kpis.pedidos_cancelados > 0 ? '#b91c1c' : '#15803d', fontWeight: 600 }}>
            {kpis.pedidos_cancelados || 0} pedido(s) cancelado(s)
          </span>
        </div>

        {/* Card 4: Líquido sem Frete */}
        <div style={{ background: '#fff', padding: '22px 24px', borderRadius: '12px', border: '1px solid #eaeaea', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', fontWeight: 600 }}>
            RECEITA DE PRODUTOS
          </span>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#111', marginTop: '8px', letterSpacing: '-0.5px' }}>
            {loading ? '...' : formatBRL(kpis.faturamento_liquido)}
          </p>
          <span style={{ fontSize: '12px', color: '#666' }}>
            Frete repassado: {formatBRL(kpis.faturamento_frete)}
          </span>
        </div>
      </div>

      {/* ── Seção Dupla: Métodos de Pagamento + Top Produtos Mais Vendidos ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
        marginBottom: '28px',
      }}>
        {/* Bloco 1: Formas de Pagamento */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eaeaea', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111', margin: 0, marginBottom: '6px' }}>
            Canais de Pagamento
          </h3>
          <p style={{ fontSize: '13px', color: '#888', margin: 0, marginBottom: '20px' }}>
            Volume financeiro por forma de pagamento no período.
          </p>

          {pagamentos.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', padding: '30px 0' }}>Nenhuma venda no período.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pagamentos.map((pg) => (
                <div key={pg.metodo}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: '#333', marginBottom: '6px' }}>
                    <span>{pg.metodo} ({pg.quantidade} pedidos)</span>
                    <span>{formatBRL(pg.total)} ({pg.porcentagem}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pg.porcentagem}%`,
                      height: '100%',
                      background: pg.metodo.toLowerCase().includes('pix') ? '#0ea5e9' : pg.metodo.toLowerCase().includes('cartão') ? '#d4ac0d' : '#64748b',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bloco 2: Top 5 Produtos Mais Vendidos */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eaeaea', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111', margin: 0, marginBottom: '6px' }}>
            Produtos Mais Vendidos
          </h3>
          <p style={{ fontSize: '13px', color: '#888', margin: 0, marginBottom: '20px' }}>
            Top itens com maior saída de estoque no período.
          </p>

          {topProdutos.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', padding: '30px 0' }}>Nenhum item vendido no período.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {topProdutos.map((item, idx) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#94a3b8', width: '18px' }}>
                      #{idx + 1}
                    </span>
                    {item.imagem_url ? (
                      <img src={item.imagem_url} alt={item.nome} style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #eee' }} />
                    ) : (
                      <div style={{ width: '38px', height: '38px', borderRadius: '6px', background: '#e2e8f0' }} />
                    )}
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#111', margin: 0 }}>{item.nome}</h4>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{item.categoria}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>{item.qtd_total} un</span>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{formatBRL(item.valor_total)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabela de Pedidos do Relatório ── */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eaeaea', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111', margin: 0 }}>Pedidos Registrados no Período</h3>
            <span style={{ fontSize: '13px', color: '#888' }}>
              {pedidos.length} pedido(s) listado(s) de {dados?.intervalo?.inicio} até {dados?.intervalo?.fim}
            </span>
          </div>
        </div>

        {pedidos.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
            Nenhum pedido encontrado para o período selecionado.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 20px' }}>Pedido</th>
                  <th style={{ padding: '14px 20px' }}>Cliente</th>
                  <th style={{ padding: '14px 20px' }}>Data</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px' }}>Pagamento</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => {
                  const cancelado = p.status === 'Cancelado';
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', opacity: cancelado ? 0.6 : 1 }}>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#111' }}>
                        #{p.id}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#333' }}>
                        <div><strong>{p.cliente}</strong></div>
                        <div style={{ fontSize: '11px', color: '#888' }}>{p.email}</div>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#64748b' }}>
                        {p.data}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: cancelado ? '#fee2e2' : '#dcfce7',
                          color: cancelado ? '#b91c1c' : '#15803d',
                        }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#475569', fontWeight: 600 }}>
                        {p.metodo_pagamento}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 800, color: cancelado ? '#94a3b8' : '#111' }}>
                        {formatBRL(p.valor_total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
