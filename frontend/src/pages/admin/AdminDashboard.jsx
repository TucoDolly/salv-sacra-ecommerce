import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/admin.css';

// ── Ícones do Figma ──────────────────────────────────────────────────────────
const IconTrendUp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const IconInbox = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconAlertTriangle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

/**
 * Gera o caminho da curva suave SVG (Bézier Spline) e da área sombreada dinamicamente a partir dos pontos calculados.
 */
function calcularCaminhosCurva(pontos, alturaBase = 300) {
  if (!pontos || pontos.length === 0) return { linhaPath: '', areaPath: '' };
  if (pontos.length === 1) {
    return {
      linhaPath: `M ${pontos[0].x},${pontos[0].y}`,
      areaPath: `M ${pontos[0].x},${pontos[0].y} L ${pontos[0].x},${alturaBase} Z`,
    };
  }

  let d = `M ${pontos[0].x},${pontos[0].y}`;

  for (let i = 0; i < pontos.length - 1; i++) {
    const p0 = pontos[i === 0 ? 0 : i - 1];
    const p1 = pontos[i];
    const p2 = pontos[i + 1];
    const p3 = pontos[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x},${p2.y}`;
  }

  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  const area = `${d} L ${ultimo.x},${alturaBase} L ${primeiro.x},${alturaBase} Z`;

  return { linhaPath: d, areaPath: area };
}

export default function AdminDashboard() {
  const [periodo, setPeriodo] = useState('7dias'); // '7dias' ou '30dias'

  // Inicializa lendo do cache para evitar "piscar" dados anteriores
  const [data, setData] = useState(() => {
    try {
      const salvo = localStorage.getItem('admin_dashboard_cache_v3');
      return salvo ? JSON.parse(salvo) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(!data);

  // Busca os dados do dashboard uma única vez ao montar (traz 7d e 30d juntos)
  useEffect(() => {
    api.get('/admin/dashboard')
      .then((res) => {
        if (res.data) {
          setData(res.data);
          localStorage.setItem('admin_dashboard_cache_v3', JSON.stringify(res.data));
        }
      })
      .catch((err) => {
        console.error('Erro ao buscar dashboard:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const formatBRL = (val) =>
    Number(val ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  // ── Seleciona a série de dados instantaneamente a partir do estado na memória ──
  const vendas = data?.graficos?.[periodo] || (periodo === '30dias' ? data?.grafico_vendas : data?.grafico_vendas) || [];
  const valores = vendas.map((v) => Number(v.valor || 0));
  const maxValorReal = Math.max(...valores, 0);

  // Escala dinâmica adaptável:
  // Se o maior valor for R$ 78, o teto vira R$ 100 ou R$ 200, permitindo ver perfeitamente a montanha/curva da venda!
  const calcularTetoGrafico = (maxVal) => {
    if (maxVal <= 0) return 100;
    if (maxVal <= 100) return 100;
    if (maxVal <= 250) return 250;
    if (maxVal <= 500) return 500;
    if (maxVal <= 1000) return 1000;
    if (maxVal <= 2500) return 2500;
    if (maxVal <= 5000) return 5000;
    return Math.ceil((maxVal * 1.25) / 1000) * 1000;
  };

  const maxGrafico = calcularTetoGrafico(maxValorReal);

  // 5 linhas horizontais de referência calculadas proporcionalmente
  const linhasY = [
    { label: formatBRL(maxGrafico), y: 40, val: maxGrafico },
    { label: formatBRL(maxGrafico * 0.75), y: 105, val: maxGrafico * 0.75 },
    { label: formatBRL(maxGrafico * 0.5), y: 170, val: maxGrafico * 0.5 },
    { label: formatBRL(maxGrafico * 0.25), y: 235, val: maxGrafico * 0.25 },
    { label: 'R$ 0', y: 300, val: 0 },
  ];

  // Mapeia os pontos X e Y exatos de cada dia
  const yTopo = 40;
  const yBase = 300;
  const xInicio = 80;
  const xFim = 880;
  const stepX = (xFim - xInicio) / Math.max(vendas.length - 1, 1);

  const pontos = vendas.map((v, i) => {
    const x = xInicio + i * stepX;
    const proporcao = maxGrafico > 0 ? (v.valor || 0) / maxGrafico : 0;
    const y = yBase - proporcao * (yBase - yTopo);
    return { x, y, dia: v.dia, data_fmt: v.data_fmt, valor: v.valor };
  });

  const { linhaPath, areaPath } = calcularCaminhosCurva(pontos, yBase);

  return (
    <div className="admin-page">
      {/* ── Boas-vindas ── */}
      <div className="admin-dash-welcome">
        <h1 className="admin-dash-title">Bem-vindo ao Painel</h1>
        <p className="admin-dash-subtitle">Visão geral das operações da Salv Sacra</p>
      </div>

      {/* ── 4 Cards de Métricas (Figma) ── */}
      <div className="admin-dash-cards-grid">
        {/* Card 1: Faturamento Total */}
        <div className="admin-dash-card">
          <div className="admin-dash-card-info">
            <span className="admin-dash-card-label">FATURAMENTO TOTAL</span>
            <span className="admin-dash-card-value">
              {loading && !data ? (
                <div className="admin-dash-skeleton" />
              ) : (
                formatBRL(data?.cards?.faturamento_total)
              )}
            </span>
          </div>
          <div className="admin-dash-card-icon gold">
            <IconTrendUp />
          </div>
        </div>

        {/* Card 2: Total de Pedidos Mensais */}
        <div className="admin-dash-card">
          <div className="admin-dash-card-info">
            <span className="admin-dash-card-label">TOTAL DE PEDIDOS MENSAIS</span>
            <span className="admin-dash-card-value">
              {loading && !data ? (
                <div className="admin-dash-skeleton" style={{ width: '60px' }} />
              ) : (
                data?.cards?.pedidos_mensais ?? 0
              )}
            </span>
          </div>
          <div className="admin-dash-card-icon gold">
            <IconInbox />
          </div>
        </div>

        {/* Card 3: Novos Clientes */}
        <div className="admin-dash-card">
          <div className="admin-dash-card-info">
            <span className="admin-dash-card-label">NOVOS CLIENTES</span>
            <span className="admin-dash-card-value">
              {loading && !data ? (
                <div className="admin-dash-skeleton" style={{ width: '50px' }} />
              ) : (
                data?.cards?.novos_clientes ?? 0
              )}
            </span>
          </div>
          <div className="admin-dash-card-icon gold">
            <IconUsers />
          </div>
        </div>

        {/* Card 4: Itens com Estoque Crítico (Link direto para gestão de estoque) */}
        <Link
          to="/admin/estoque"
          className="admin-dash-card critical"
          style={{ textDecoration: 'none', cursor: 'pointer' }}
          title="Clique para gerenciar itens com estoque crítico"
        >
          <div className="admin-dash-card-info">
            <span className="admin-dash-card-label">ITENS COM ESTOQUE CRÍTICO</span>
            <span className="admin-dash-card-value">
              {loading && !data ? (
                <div className="admin-dash-skeleton" style={{ width: '50px' }} />
              ) : (
                data?.cards?.itens_estoque_critico ?? 0
              )}
            </span>
          </div>
          <div className="admin-dash-card-icon red">
            <IconAlertTriangle />
          </div>
        </Link>
      </div>

      {/* ── Tendência de Vendas (Gráfico SVG Dinâmico) ── */}
      <div className="admin-dash-chart-card">
        <div className="admin-dash-chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="admin-dash-chart-title">Tendência de Vendas</h2>
            <p className="admin-dash-chart-subtitle">
              {periodo === '30dias' ? 'Histórico dos últimos 30 dias' : 'Vendas realizadas nos últimos 7 dias'}
            </p>
          </div>

          {/* Seletor de período */}
          <div style={{ display: 'flex', gap: '6px', background: '#f4f4f5', padding: '3px', borderRadius: '6px' }}>
            <button
              type="button"
              onClick={() => setPeriodo('7dias')}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: periodo === '7dias' ? '#fff' : 'transparent',
                color: periodo === '7dias' ? '#18181b' : '#71717a',
                boxShadow: periodo === '7dias' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Últimos 7 dias
            </button>
            <button
              type="button"
              onClick={() => setPeriodo('30dias')}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: periodo === '30dias' ? '#fff' : 'transparent',
                color: periodo === '30dias' ? '#18181b' : '#71717a',
                boxShadow: periodo === '30dias' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              Últimos 30 dias
            </button>
          </div>
        </div>

        <div className="admin-dash-svg-container">
          <svg viewBox="0 0 920 360" width="100%" height="100%" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="yellowAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f7dc6f" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#fef9e7" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Linhas de grade e valores no eixo Y */}
            {linhasY.map((linha, idx) => (
              <g key={idx}>
                <text x="0" y={linha.y + 4} fill="#a1a1aa" fontSize="12" fontWeight="500">
                  {linha.label}
                </text>
                <line
                  x1="70"
                  y1={linha.y}
                  x2="900"
                  y2={linha.y}
                  stroke="#f4f4f5"
                  strokeWidth="1"
                  strokeDasharray={idx === 4 ? 'none' : '4 4'}
                />
              </g>
            ))}

            {/* Curva e Área Suave Dinâmicas */}
            {areaPath && (
              <path
                d={areaPath}
                fill="url(#yellowAreaGradient)"
              />
            )}

            {linhaPath && (
              <path
                d={linhaPath}
                fill="none"
                stroke="#eab308"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Pontos interativos com tooltip nativo e dias da semana */}
            {pontos.map((p, idx) => {
              // No modo de 30 dias exibe os rótulos de forma espaçada
              const exibirRotulo = periodo === '7dias' || idx % 5 === 0 || idx === pontos.length - 1;
              return (
                <g key={idx}>
                  {p.valor > 0 && (
                    <>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="5"
                        fill="#eab308"
                        stroke="#fff"
                        strokeWidth="2.5"
                      />
                      <title>{`${p.dia} (${p.data_fmt}): ${formatBRL(p.valor)}`}</title>
                    </>
                  )}
                  {exibirRotulo && (
                    <text
                      x={p.x}
                      y="335"
                      textAnchor="middle"
                      fill="#71717a"
                      fontSize="12"
                      fontWeight="500"
                    >
                      {periodo === '30dias' ? p.data_fmt : p.dia}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
