import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import {
  atualizarCupom,
  atualizarValeCompraAdmin,
  bloquearCupomAdmin,
  criarCupom,
  criarValeCompraAdmin,
  desbloquearCupomAdmin,
  listarCuponsPromocionaisAdmin,
  listarValesCompraAdmin,
  obterHistoricoCupomAdmin,
  removerCupom,
  revogarCupomAdmin,
} from '../../services/cupomService';

const FORM_PROMO_VAZIO = {
  codigo: '',
  descricao: '',
  percentual: '',
  tipo: 'produto',
  todos_produtos: true,
  ativo: true,
  produto_ids: [],
  validade: '',
  valor_minimo_pedido: '',
  limite_usos: '',
  condicoes_utilizacao: '',
};

const FORM_VALE_VAZIO = {
  codigo: '',
  valor_inicial: '',
  saldo_atual: '',
  user_id: '',
  pedido_origem_id: '',
  validade: '',
  valor_minimo_pedido: '',
  condicoes_utilizacao: '',
  descricao: '',
  ativo: true,
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid #d4d4d8',
  fontSize: '13.5px',
  outline: 'none',
  background: '#fff',
};

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 700,
  color: '#374151',
  marginBottom: '6px',
};

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatarData = (d) => {
  if (!d) return 'Sem validade';
  try {
    return new Date(d).toLocaleDateString('pt-BR');
  } catch {
    return String(d);
  }
};

const formatarDataHora = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(d);
  }
};

const STATUS_BADGE = {
  ativo: { bg: '#dcfce7', color: '#15803d', label: 'Ativo' },
  inativo: { bg: '#f3f4f6', color: '#4b5563', label: 'Inativo' },
  esgotado: { bg: '#ede9fe', color: '#6b21a8', label: 'Esgotado' },
  expirado: { bg: '#ffedd5', color: '#c2410c', label: 'Expirado' },
  bloqueado: { bg: '#fee2e2', color: '#b91c1c', label: 'Bloqueado (Chargeback/MED)' },
  revogado: { bg: '#991b1b', color: '#fff', label: 'Revogado' },
};

const EVENTO_LABEL = {
  criacao: 'Emissão / Criação',
  utilizacao: 'Utilização em Pedido',
  consumo_parcial: 'Abatimento Parcial',
  consumo_total: 'Consumo Integral',
  restauracao: 'Restauração (Cancelamento/Devolução)',
  bloqueio: 'Bloqueio (Chargeback/MED)',
  revogacao: 'Revogação Definitiva',
  desbloqueio: 'Desbloqueio Administrativo',
  ajuste: 'Ajuste Manual de Saldo',
};

export default function CuponsAdmin() {
  const [abaAtiva, setAbaAtiva] = useState('promocionais');

  // Listas e dados auxiliares
  const [promocionais, setPromocionais] = useState([]);
  const [vales, setVales] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [clientesConhecidos, setClientesConhecidos] = useState([]);

  // Filtros
  const [filtroTipoPromo, setFiltroTipoPromo] = useState('');
  const [filtroStatusPromo, setFiltroStatusPromo] = useState('');
  const [buscaPromo, setBuscaPromo] = useState('');
  const [filtroStatusVale, setFiltroStatusVale] = useState('');
  const [buscaVale, setBuscaVale] = useState('');

  // Formulários
  const [formPromo, setFormPromo] = useState(FORM_PROMO_VAZIO);
  const [editPromoId, setEditPromoId] = useState(null);
  const [formVale, setFormVale] = useState(FORM_VALE_VAZIO);
  const [editValeId, setEditValeId] = useState(null);

  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState({ tipo: '', texto: '' });

  // Modais (Histórico + Bloqueio/Revogação)
  const [modalHistorico, setModalHistorico] = useState({
    aberto: false,
    cupom: null,
    carregando: false,
    itens: [],
  });
  const [modalBloqueio, setModalBloqueio] = useState({
    aberto: false,
    cupom: null,
    acao: 'bloquear',
    motivo: '',
    enviando: false,
  });

  const carregarTudo = useCallback(async () => {
    setCarregando(true);
    try {
      const [resPromos, resVales, resProds, resPedidos] = await Promise.all([
        listarCuponsPromocionaisAdmin({
          ...(filtroTipoPromo ? { tipo: filtroTipoPromo } : {}),
          ...(filtroStatusPromo ? { status: filtroStatusPromo } : {}),
          ...(buscaPromo.trim() ? { busca: buscaPromo.trim() } : {}),
        }),
        listarValesCompraAdmin({
          ...(filtroStatusVale ? { status: filtroStatusVale } : {}),
          ...(buscaVale.trim() ? { busca: buscaVale.trim() } : {}),
        }),
        api.get('/produtos', { params: { per_page: 500 } }),
        api.get('/admin/pedidos', { params: { per_page: 200 } }).catch(() => ({ data: [] })),
      ]);

      setPromocionais(Array.isArray(resPromos.data) ? resPromos.data : []);
      setVales(Array.isArray(resVales.data) ? resVales.data : []);
      setProdutos(resProds.data?.data || resProds.data || []);

      // Extrai lista única de clientes dos pedidos e dos vales para facilitar vínculo manual
      const listaPed = Array.isArray(resPedidos.data?.data)
        ? resPedidos.data.data
        : Array.isArray(resPedidos.data)
          ? resPedidos.data
          : [];
      const mapaCli = new Map();
      listaPed.forEach((ped) => {
        if (ped?.user?.id) {
          mapaCli.set(ped.user.id, ped.user);
        }
      });
      (Array.isArray(resVales.data) ? resVales.data : []).forEach((v) => {
        if (v?.usuario?.id) {
          mapaCli.set(v.usuario.id, v.usuario);
        }
      });
      setClientesConhecidos(Array.from(mapaCli.values()));
    } catch {
      setMsg({ tipo: 'erro', texto: 'Não foi possível carregar os benefícios e produtos.' });
    } finally {
      setCarregando(false);
    }
  }, [filtroTipoPromo, filtroStatusPromo, buscaPromo, filtroStatusVale, buscaVale]);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setModalHistorico((prev) => ({ ...prev, aberto: false }));
        setModalBloqueio((prev) => ({ ...prev, aberto: false }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ── Ações Cupons Promocionais ──
  const setPromo = (campo, valor) => setFormPromo((f) => ({ ...f, [campo]: valor }));
  const toggleProdutoPromo = (id) =>
    setFormPromo((f) => ({
      ...f,
      produto_ids: f.produto_ids.includes(id)
        ? f.produto_ids.filter((x) => x !== id)
        : [...f.produto_ids, id],
    }));

  const editarPromo = (c) => {
    setAbaAtiva('promocionais');
    setEditPromoId(c.id);
    setFormPromo({
      codigo: c.codigo || '',
      descricao: c.descricao || '',
      percentual: c.percentual ?? '',
      tipo: c.tipo === 'frete' ? 'frete' : 'produto',
      todos_produtos: Boolean(c.todos_produtos),
      ativo: Boolean(c.ativo),
      produto_ids: (c.produtos || []).map((p) => p.id),
      validade: c.validade ? String(c.validade).slice(0, 10) : '',
      valor_minimo_pedido: c.valor_minimo_pedido ?? '',
      limite_usos: c.limite_usos ?? '',
      condicoes_utilizacao: c.condicoes_utilizacao || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarPromo = () => {
    setEditPromoId(null);
    setFormPromo(FORM_PROMO_VAZIO);
  };

  const salvarPromo = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setMsg({ tipo: '', texto: '' });
    try {
      const payload = {
        codigo: formPromo.codigo.trim().toUpperCase(),
        descricao: formPromo.descricao.trim() || null,
        percentual: Number(formPromo.percentual),
        tipo: formPromo.tipo,
        todos_produtos: Boolean(formPromo.todos_produtos),
        ativo: Boolean(formPromo.ativo),
        produto_ids: formPromo.todos_produtos ? [] : formPromo.produto_ids,
        validade: formPromo.validade || null,
        valor_minimo_pedido:
          formPromo.valor_minimo_pedido !== '' ? Number(formPromo.valor_minimo_pedido) : null,
        limite_usos: formPromo.limite_usos !== '' ? Number(formPromo.limite_usos) : null,
        condicoes_utilizacao: formPromo.condicoes_utilizacao.trim() || null,
      };
      if (editPromoId) await atualizarCupom(editPromoId, payload);
      else await criarCupom(payload);

      setMsg({
        tipo: 'sucesso',
        texto: editPromoId ? 'Cupom promocional atualizado!' : 'Cupom promocional criado com sucesso!',
      });
      cancelarPromo();
      carregarTudo();
    } catch (err) {
      const errs = err.response?.data?.errors;
      setMsg({
        tipo: 'erro',
        texto:
          (errs && Object.values(errs)[0]?.[0]) ||
          err.response?.data?.message ||
          'Erro ao salvar o cupom promocional.',
      });
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivoPromo = async (c) => {
    setMsg({ tipo: '', texto: '' });
    try {
      await atualizarCupom(c.id, {
        codigo: c.codigo,
        descricao: c.descricao || null,
        percentual: Number(c.percentual || 0),
        tipo: c.tipo === 'frete' ? 'frete' : 'produto',
        todos_produtos: Boolean(c.todos_produtos),
        ativo: !c.ativo,
        produto_ids: (c.produtos || []).map((p) => p.id),
        validade: c.validade ? String(c.validade).slice(0, 10) : null,
        valor_minimo_pedido: c.valor_minimo_pedido !== null ? Number(c.valor_minimo_pedido) : null,
        limite_usos: c.limite_usos !== null ? Number(c.limite_usos) : null,
        condicoes_utilizacao: c.condicoes_utilizacao || null,
      });
      carregarTudo();
    } catch (err) {
      setMsg({
        tipo: 'erro',
        texto: err.response?.data?.message || 'Não foi possível alterar o status do cupom.',
      });
    }
  };

  const excluirBeneficio = async (c) => {
    if (!window.confirm(`Deseja realmente excluir ${c.codigo}?`)) return;
    try {
      await removerCupom(c.id);
      setMsg({ tipo: 'sucesso', texto: `${c.codigo} removido com sucesso.` });
      carregarTudo();
    } catch (err) {
      setMsg({
        tipo: 'erro',
        texto: err.response?.data?.message || 'Não foi possível excluir este benefício.',
      });
    }
  };

  // ── Ações Vales-Compra ──
  const setVale = (campo, valor) => setFormVale((f) => ({ ...f, [campo]: valor }));

  const editarVale = (v) => {
    setAbaAtiva('vales');
    setEditValeId(v.id);
    setFormVale({
      codigo: v.codigo || '',
      valor_inicial: v.valor_inicial ?? v.valor_fixo ?? '',
      saldo_atual: v.saldo_atual ?? v.valor_fixo ?? '',
      user_id: v.user_id ?? '',
      pedido_origem_id: v.pedido_origem_id ?? '',
      validade: v.validade ? String(v.validade).slice(0, 10) : '',
      valor_minimo_pedido: v.valor_minimo_pedido ?? '',
      condicoes_utilizacao: v.condicoes_utilizacao || '',
      descricao: v.descricao || '',
      ativo: Boolean(v.ativo),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarVale = () => {
    setEditValeId(null);
    setFormVale(FORM_VALE_VAZIO);
  };

  const salvarVale = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setMsg({ tipo: '', texto: '' });
    try {
      const payload = {
        codigo: formVale.codigo.trim().toUpperCase() || undefined,
        tipo: 'vale_compra',
        valor_inicial: Number(formVale.valor_inicial),
        saldo_atual:
          editValeId && formVale.saldo_atual !== ''
            ? Number(formVale.saldo_atual)
            : Number(formVale.valor_inicial),
        user_id: formVale.user_id !== '' ? Number(formVale.user_id) : null,
        pedido_origem_id: formVale.pedido_origem_id !== '' ? Number(formVale.pedido_origem_id) : null,
        validade: formVale.validade || null,
        valor_minimo_pedido:
          formVale.valor_minimo_pedido !== '' ? Number(formVale.valor_minimo_pedido) : null,
        condicoes_utilizacao: formVale.condicoes_utilizacao.trim() || null,
        descricao: formVale.descricao.trim() || null,
        ativo: Boolean(formVale.ativo),
        todos_produtos: true,
      };

      if (editValeId) await atualizarValeCompraAdmin(editValeId, payload);
      else await criarValeCompraAdmin(payload);

      setMsg({
        tipo: 'sucesso',
        texto: editValeId ? 'Vale-compra atualizado com sucesso!' : 'Vale-compra emitido com sucesso!',
      });
      cancelarVale();
      carregarTudo();
    } catch (err) {
      const errs = err.response?.data?.errors;
      setMsg({
        tipo: 'erro',
        texto:
          (errs && Object.values(errs)[0]?.[0]) ||
          err.response?.data?.message ||
          'Erro ao salvar o vale-compra.',
      });
    } finally {
      setSalvando(false);
    }
  };

  // ── Modais: Histórico, Bloqueio/Revogação e Desbloqueio ──
  const abrirHistorico = async (c) => {
    setModalHistorico({ aberto: true, cupom: c, carregando: true, itens: [] });
    try {
      const { data } = await obterHistoricoCupomAdmin(c.id);
      setModalHistorico({
        aberto: true,
        cupom: c,
        carregando: false,
        itens: Array.isArray(data) ? data : [],
      });
    } catch {
      setModalHistorico({ aberto: true, cupom: c, carregando: false, itens: [] });
    }
  };

  const abrirModalBloqueio = (c, acaoInicial = 'bloquear') => {
    setModalBloqueio({
      aberto: true,
      cupom: c,
      acao: acaoInicial,
      motivo: 'Contestação bancária (Chargeback / MED) registrada no pedido de origem.',
      enviando: false,
    });
  };

  const confirmarBloqueio = async (e) => {
    e.preventDefault();
    if (!modalBloqueio.cupom || !modalBloqueio.motivo.trim()) return;
    setModalBloqueio((m) => ({ ...m, enviando: true }));
    setMsg({ tipo: '', texto: '' });
    try {
      const fn =
        modalBloqueio.acao === 'revogar' ? revogarCupomAdmin : bloquearCupomAdmin;
      const { data } = await fn(modalBloqueio.cupom.id, modalBloqueio.motivo.trim());
      setMsg({ tipo: 'sucesso', texto: data?.message || 'Vale bloqueado com sucesso.' });
      setModalBloqueio({ aberto: false, cupom: null, acao: 'bloquear', motivo: '', enviando: false });
      carregarTudo();
    } catch (err) {
      const errs = err.response?.data?.errors;
      setMsg({
        tipo: 'erro',
        texto:
          (errs && Object.values(errs)[0]?.[0]) ||
          err.response?.data?.message ||
          'Erro ao bloquear/revogar benefício.',
      });
      setModalBloqueio((m) => ({ ...m, enviando: false }));
    }
  };

  const handleDesbloquear = async (c) => {
    const obs = window.prompt(
      `Desbloquear o vale-compra ${c.codigo}? Informe uma observação opcional:`,
      'Contestação resolvida / Desbloqueado pelo administrador.'
    );
    if (obs === null) return;
    setMsg({ tipo: '', texto: '' });
    try {
      const { data } = await desbloquearCupomAdmin(c.id, obs);
      setMsg({ tipo: 'sucesso', texto: data?.message || 'Vale desbloqueado com sucesso.' });
      carregarTudo();
    } catch (err) {
      setMsg({
        tipo: 'erro',
        texto: err.response?.data?.message || 'Erro ao desbloquear o vale-compra.',
      });
    }
  };

  const renderBadgeStatus = (c) => {
    const st = c.status || (c.ativo ? 'ativo' : 'inativo');
    const cfg = STATUS_BADGE[st] || STATUS_BADGE.inativo;
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '4px 10px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 700,
          background: cfg.bg,
          color: cfg.color,
          whiteSpace: 'nowrap',
        }}
      >
        {cfg.label}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Navegação interna entre Cupons Promocionais e Vales-Compra */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => setAbaAtiva('promocionais')}
          className={`admin-btn ${abaAtiva === 'promocionais' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <span>🏷️</span>
          <span>Cupons Promocionais (Produto e Frete)</span>
          <span
            style={{
              background: abaAtiva === 'promocionais' ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
            }}
          >
            {promocionais.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva('vales')}
          className={`admin-btn ${abaAtiva === 'vales' ? 'admin-btn-primary' : 'admin-btn-secondary'}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <span>🎟️</span>
          <span>Vales-Compra (Créditos de Clientes)</span>
          <span
            style={{
              background: abaAtiva === 'vales' ? 'rgba(255,255,255,0.2)' : '#ede9fe',
              color: abaAtiva === 'vales' ? '#fff' : '#6b21a8',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
            }}
          >
            {vales.length}
          </span>
        </button>
      </div>

      {msg.texto && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '14px',
            background: msg.tipo === 'sucesso' ? '#dcfce7' : '#fee2e2',
            color: msg.tipo === 'sucesso' ? '#15803d' : '#b91c1c',
          }}
        >
          {msg.texto}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ABA 1: CUPONS PROMOCIONAIS (PRODUTO E FRETE)
         ══════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'promocionais' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <form
            onSubmit={salvarPromo}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '20px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px', color: '#111' }}>
              {editPromoId ? `Editar cupom promocional ${formPromo.codigo}` : 'Novo cupom promocional'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Código do cupom *</label>
                <input
                  style={{ ...inputStyle, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}
                  value={formPromo.codigo}
                  onChange={(e) => setPromo('codigo', e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder="Ex: FE15"
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Tipo de benefício *</label>
                <select
                  style={inputStyle}
                  value={formPromo.tipo}
                  onChange={(e) => setPromo('tipo', e.target.value)}
                >
                  <option value="produto">Cupom de Desconto (Percentual em Produtos)</option>
                  <option value="frete">Cupom de Frete Grátis (Percentual no Frete)</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Desconto (%) *</label>
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  style={inputStyle}
                  value={formPromo.percentual}
                  onChange={(e) => setPromo('percentual', e.target.value)}
                  placeholder="Ex: 20 (ou 100 para frete grátis)"
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Validade</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={formPromo.validade}
                  onChange={(e) => setPromo('validade', e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Pedido mínimo (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={inputStyle}
                  value={formPromo.valor_minimo_pedido}
                  onChange={(e) => setPromo('valor_minimo_pedido', e.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label style={labelStyle}>Limite máximo de usos</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  style={inputStyle}
                  value={formPromo.limite_usos}
                  onChange={(e) => setPromo('limite_usos', e.target.value)}
                  placeholder="Ilimitado se vazio"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Descrição (visível ao cliente)</label>
                <input
                  style={inputStyle}
                  value={formPromo.descricao}
                  onChange={(e) => setPromo('descricao', e.target.value)}
                  placeholder="Ex: 20% de desconto na coleção devocional"
                />
              </div>
              <div>
                <label style={labelStyle}>Condições de utilização</label>
                <input
                  style={inputStyle}
                  value={formPromo.condicoes_utilizacao}
                  onChange={(e) => setPromo('condicoes_utilizacao', e.target.value)}
                  placeholder="Ex: Não acumulável com outro cupom promocional"
                />
              </div>
            </div>

            {formPromo.tipo === 'produto' && (
              <div>
                <label style={labelStyle}>Peças elegíveis para este cupom</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formPromo.todos_produtos}
                    onChange={(e) => setPromo('todos_produtos', e.target.checked)}
                  />
                  Todas as peças da loja
                </label>

                {!formPromo.todos_produtos && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                      gap: '8px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      padding: '12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: '#fff',
                    }}
                  >
                    {produtos.length === 0 && (
                      <span style={{ fontSize: '13px', color: '#888' }}>Nenhum produto cadastrado.</span>
                    )}
                    {produtos.map((p) => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formPromo.produto_ids.includes(p.id)}
                          onChange={() => toggleProdutoPromo(p.id)}
                        />
                        {p.nome}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formPromo.ativo}
                onChange={(e) => setPromo('ativo', e.target.checked)}
              />
              Cupom ativo (disponível no checkout)
            </label>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={salvando}>
                {salvando ? 'Salvando...' : editPromoId ? 'Salvar alterações' : 'Criar cupom promocional'}
              </button>
              {editPromoId && (
                <button type="button" className="admin-btn admin-btn-secondary" onClick={cancelarPromo}>
                  Cancelar edição
                </button>
              )}
            </div>
          </form>

          {/* Filtros e Tabela de Cupons Promocionais */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Cupons Promocionais Cadastrados</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Buscar por código ou descrição..."
                  value={buscaPromo}
                  onChange={(e) => setBuscaPromo(e.target.value)}
                  style={{ ...inputStyle, width: '210px', padding: '7px 10px' }}
                />
                <select
                  value={filtroTipoPromo}
                  onChange={(e) => setFiltroTipoPromo(e.target.value)}
                  style={{ ...inputStyle, width: '160px', padding: '7px 10px' }}
                >
                  <option value="">Todos os tipos</option>
                  <option value="produto">Desconto em Produtos</option>
                  <option value="frete">Desconto no Frete</option>
                </select>
                <select
                  value={filtroStatusPromo}
                  onChange={(e) => setFiltroStatusPromo(e.target.value)}
                  style={{ ...inputStyle, width: '150px', padding: '7px 10px' }}
                >
                  <option value="">Todos os status</option>
                  <option value="ativo">Ativos</option>
                  <option value="inativo">Inativos</option>
                  <option value="esgotado">Esgotados</option>
                  <option value="expirado">Expirados</option>
                </select>
              </div>
            </div>

            {carregando && promocionais.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px' }}>Carregando cupons...</p>
            ) : promocionais.length === 0 ? (
              <p style={{ color: '#888', fontSize: '14px' }}>Nenhum cupom promocional encontrado.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Tipo</th>
                      <th>Desconto</th>
                      <th>Condições / Escopo</th>
                      <th>Usos</th>
                      <th>Validade</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center', width: '250px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {promocionais.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <strong style={{ letterSpacing: '0.8px' }}>{c.codigo}</strong>
                          {c.descricao && (
                            <div style={{ fontSize: '11.5px', color: '#64748b' }}>{c.descricao}</div>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              background: c.tipo === 'frete' ? '#e0f2fe' : '#fef3c7',
                              color: c.tipo === 'frete' ? '#0369a1' : '#92400e',
                            }}
                          >
                            {c.tipo === 'frete' ? '🚚 Frete' : '👕 Produto'}
                          </span>
                        </td>
                        <td><strong>{Number(c.percentual)}%</strong></td>
                        <td style={{ fontSize: '12px', maxWidth: '220px' }}>
                          <div>{c.todos_produtos ? 'Todas as peças' : `${(c.produtos || []).length} peça(s) selecionada(s)`}</div>
                          {Number(c.valor_minimo_pedido || 0) > 0 && (
                            <div style={{ color: '#475569' }}>Mín: {moeda(c.valor_minimo_pedido)}</div>
                          )}
                          {c.condicoes_utilizacao && (
                            <div style={{ color: '#64748b' }}>{c.condicoes_utilizacao}</div>
                          )}
                        </td>
                        <td style={{ fontSize: '12.5px' }}>
                          {c.usos_atuais || 0} / {c.limite_usos ?? '∞'}
                        </td>
                        <td style={{ fontSize: '12.5px' }}>{formatarData(c.validade)}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => alternarAtivoPromo(c)}
                            style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
                            title="Clique para ativar/inativar"
                          >
                            {renderBadgeStatus(c)}
                          </button>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            style={{ marginRight: '6px' }}
                            onClick={() => abrirHistorico(c)}
                          >
                            Histórico
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-secondary admin-btn-sm"
                            style={{ marginRight: '6px' }}
                            onClick={() => editarPromo(c)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger admin-btn-sm"
                            onClick={() => excluirBeneficio(c)}
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ABA 2: VALES-COMPRA (CRÉDITOS DE CLIENTES)
         ══════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'vales' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Formulário manual de Vale-Compra */}
          <form
            onSubmit={salvarVale}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              background: '#faf5ff',
              border: '1px solid #e9d5ff',
              borderRadius: '10px',
              padding: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#4c1d95' }}>
                {editValeId ? `Editar vale-compra ${formVale.codigo}` : 'Emitir vale-compra manualmente'}
              </h3>
              <span style={{ fontSize: '12px', color: '#6b21a8', fontWeight: 600 }}>
                Combinável com 1 cupom promocional e mantém saldo parcial após a compra
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Código do vale (auto se vazio)</label>
                <input
                  style={{ ...inputStyle, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.8px' }}
                  value={formVale.codigo}
                  onChange={(e) => setVale('codigo', e.target.value.toUpperCase().replace(/\s/g, ''))}
                  placeholder="VALE-XXXXXX"
                />
              </div>

              <div>
                <label style={labelStyle}>Valor inicial (R$) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  style={inputStyle}
                  value={formVale.valor_inicial}
                  onChange={(e) => setVale('valor_inicial', e.target.value)}
                  placeholder="Ex: 100.00"
                  required
                />
              </div>

              {editValeId && (
                <div>
                  <label style={labelStyle}>Saldo atual restante (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={inputStyle}
                    value={formVale.saldo_atual}
                    onChange={(e) => setVale('saldo_atual', e.target.value)}
                  />
                </div>
              )}

              <div>
                <label style={labelStyle}>Cliente vinculado</label>
                <select
                  style={inputStyle}
                  value={formVale.user_id}
                  onChange={(e) => setVale('user_id', e.target.value)}
                >
                  <option value="">Sem vínculo (ou informar ID)</option>
                  {clientesConhecidos.map((cli) => (
                    <option key={cli.id} value={cli.id}>
                      #{cli.id} — {cli.name} ({cli.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Ou ID do cliente (User ID)</label>
                <input
                  type="number"
                  min="1"
                  style={inputStyle}
                  value={formVale.user_id}
                  onChange={(e) => setVale('user_id', e.target.value)}
                  placeholder="ID do usuário"
                />
              </div>

              <div>
                <label style={labelStyle}>Pedido de origem (ID)</label>
                <input
                  type="number"
                  min="1"
                  style={inputStyle}
                  value={formVale.pedido_origem_id}
                  onChange={(e) => setVale('pedido_origem_id', e.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label style={labelStyle}>Validade</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={formVale.validade}
                  onChange={(e) => setVale('validade', e.target.value)}
                />
              </div>

              <div>
                <label style={labelStyle}>Pedido mínimo (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={inputStyle}
                  value={formVale.valor_minimo_pedido}
                  onChange={(e) => setVale('valor_minimo_pedido', e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Descrição / Motivo da emissão</label>
                <input
                  style={inputStyle}
                  value={formVale.descricao}
                  onChange={(e) => setVale('descricao', e.target.value)}
                  placeholder="Ex: Crédito concedido por devolução ou cortesia"
                />
              </div>
              <div>
                <label style={labelStyle}>Condições de utilização</label>
                <input
                  style={inputStyle}
                  value={formVale.condicoes_utilizacao}
                  onChange={(e) => setVale('condicoes_utilizacao', e.target.value)}
                  placeholder="Ex: Válido para uso parcial ou integral combinável com 1 cupom"
                />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formVale.ativo}
                onChange={(e) => setVale('ativo', e.target.checked)}
              />
              Vale-compra ativo
            </label>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={salvando}>
                {salvando ? 'Salvando...' : editValeId ? 'Salvar vale-compra' : 'Emitir vale-compra'}
              </button>
              {editValeId && (
                <button type="button" className="admin-btn admin-btn-secondary" onClick={cancelarVale}>
                  Cancelar edição
                </button>
              )}
            </div>
          </form>

          {/* Filtros e Listagem de Vales-Compra */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>Vales-Compra Emitidos</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Buscar por código, cliente ou pedido..."
                  value={buscaVale}
                  onChange={(e) => setBuscaVale(e.target.value)}
                  style={{ ...inputStyle, width: '240px', padding: '7px 10px' }}
                />
                <select
                  value={filtroStatusVale}
                  onChange={(e) => setFiltroStatusVale(e.target.value)}
                  style={{ ...inputStyle, width: '180px', padding: '7px 10px' }}
                >
                  <option value="">Todos os status</option>
                  <option value="ativo">Ativo (com saldo)</option>
                  <option value="esgotado">Esgotado</option>
                  <option value="expirado">Expirado</option>
                  <option value="bloqueado">Bloqueado (Chargeback/MED)</option>
                  <option value="revogado">Revogado</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>

            {vales.length === 0 ? (
              <p style={{ color: '#888', fontSize: '14px' }}>Nenhum vale-compra encontrado.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Valor Inicial</th>
                      <th>Saldo Restante</th>
                      <th>Cliente Vinculado</th>
                      <th>Pedido Origem</th>
                      <th>Validade &amp; Condições</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center', width: '280px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vales.map((v) => {
                      const bloqueado = v.status === 'bloqueado' || v.status === 'revogado';
                      return (
                        <tr key={v.id}>
                          <td>
                            <strong style={{ fontFamily: 'monospace', fontSize: '13px', letterSpacing: '0.6px', color: '#5b21b6' }}>
                              {v.codigo}
                            </strong>
                            {v.descricao && (
                              <div style={{ fontSize: '11.5px', color: '#64748b' }}>{v.descricao}</div>
                            )}
                          </td>
                          <td>{moeda(v.valor_inicial ?? v.valor_fixo)}</td>
                          <td>
                            <strong style={{ color: Number(v.saldo_atual) > 0 ? '#15803d' : '#64748b', fontSize: '14px' }}>
                              {moeda(v.saldo_atual ?? v.valor_fixo)}
                            </strong>
                          </td>
                          <td style={{ fontSize: '12.5px' }}>
                            {v.usuario ? (
                              <div>
                                <strong>{v.usuario.name}</strong>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>{v.usuario.email}</div>
                              </div>
                            ) : v.user_id ? (
                              `Cliente #${v.user_id}`
                            ) : (
                              <span style={{ color: '#94a3b8' }}>Portador livre</span>
                            )}
                          </td>
                          <td style={{ fontSize: '12.5px' }}>
                            {v.pedido_origem_id ? (
                              <span style={{ fontWeight: 700 }}>Pedido #{v.pedido_origem_id}</span>
                            ) : (
                              <span style={{ color: '#64748b' }}>Manual Admin</span>
                            )}
                            {v.devolucao_id && (
                              <div style={{ fontSize: '11px', color: '#64748b' }}>Dev. #{v.devolucao_id}</div>
                            )}
                          </td>
                          <td style={{ fontSize: '12px', maxWidth: '210px' }}>
                            <div>Validade: {formatarData(v.validade)}</div>
                            {Number(v.valor_minimo_pedido || 0) > 0 && (
                              <div style={{ color: '#475569' }}>Mín: {moeda(v.valor_minimo_pedido)}</div>
                            )}
                            {v.condicoes_utilizacao && (
                              <div style={{ color: '#64748b' }}>{v.condicoes_utilizacao}</div>
                            )}
                          </td>
                          <td>
                            {renderBadgeStatus(v)}
                            {bloqueado && v.motivo_bloqueio && (
                              <div
                                style={{
                                  marginTop: '4px',
                                  fontSize: '11px',
                                  color: '#b91c1c',
                                  maxWidth: '180px',
                                  lineHeight: 1.3,
                                }}
                              >
                                Motivo: {v.motivo_bloqueio}
                              </div>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="admin-btn admin-btn-secondary admin-btn-sm"
                                onClick={() => abrirHistorico(v)}
                              >
                                Histórico
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn-secondary admin-btn-sm"
                                onClick={() => editarVale(v)}
                              >
                                Editar
                              </button>
                              {bloqueado ? (
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-primary admin-btn-sm"
                                  style={{ background: '#15803d', borderColor: '#15803d' }}
                                  onClick={() => handleDesbloquear(v)}
                                >
                                  Desbloquear
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="admin-btn admin-btn-danger admin-btn-sm"
                                  onClick={() => abrirModalBloqueio(v, 'bloquear')}
                                  title="Bloquear ou revogar por Chargeback/MED"
                                >
                                  Bloquear / Revogar
                                </button>
                              )}
                            </div>
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
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL DE HISTÓRICO DE MOVIMENTAÇÕES
         ══════════════════════════════════════════════════════════════ */}
      {modalHistorico.aberto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setModalHistorico({ aberto: false, cupom: null, carregando: false, itens: [] })}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '720px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 24px 48px rgba(15, 23, 42, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px' }}>
                  Histórico — {modalHistorico.cupom?.codigo}
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Registro completo de emissão, utilizações, restaurações e bloqueios
                </span>
              </div>
              <button
                type="button"
                className="admin-btn admin-btn-secondary admin-btn-sm"
                onClick={() => setModalHistorico({ aberto: false, cupom: null, carregando: false, itens: [] })}
              >
                Fechar
              </button>
            </div>

            {modalHistorico.carregando ? (
              <p style={{ color: '#64748b', fontSize: '14px' }}>Carregando histórico...</p>
            ) : modalHistorico.itens.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '14px' }}>Nenhuma movimentação registrada ainda.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {modalHistorico.itens.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      background: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                        {EVENTO_LABEL[h.tipo_evento] || h.tipo_evento}
                      </strong>
                      <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {formatarDataHora(h.created_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#334155', marginBottom: '4px' }}>
                      {h.descricao}
                    </div>
                    <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11.5px', color: '#475569' }}>
                      {h.valor !== null && <span>Valor: <strong>{moeda(h.valor)}</strong></span>}
                      {h.saldo_anterior !== null && h.saldo_posterior !== null && (
                        <span>
                          Saldo: {moeda(h.saldo_anterior)} → <strong>{moeda(h.saldo_posterior)}</strong>
                        </span>
                      )}
                      {h.pedido_id && <span>Pedido: <strong>#{h.pedido_id}</strong></span>}
                      {h.usuario && <span>Responsável: {h.usuario.name}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL DE BLOQUEIO / REVOGAÇÃO POR CONTESTAÇÃO BANCÁRIA (MED)
         ══════════════════════════════════════════════════════════════ */}
      {modalBloqueio.aberto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setModalBloqueio({ aberto: false, cupom: null, acao: 'bloquear', motivo: '', enviando: false })}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <form
            onSubmit={confirmarBloqueio}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              boxShadow: '0 24px 48px rgba(15, 23, 42, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '17px', color: '#991b1b' }}>
              🛡️ Bloquear / Revogar Vale-Compra ({modalBloqueio.cupom?.codigo})
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              Utilize esta ação caso o pedido de origem tenha sofrido contestação bancária (Chargeback / MED) ou fraude. O saldo restante será congelado imediatamente.
            </p>

            <div>
              <label style={labelStyle}>Ação de Segurança</label>
              <select
                style={inputStyle}
                value={modalBloqueio.acao}
                onChange={(e) => setModalBloqueio((m) => ({ ...m, acao: e.target.value }))}
              >
                <option value="bloquear">Bloquear (Suspensão Preventiva — pode ser desbloqueado depois)</option>
                <option value="revogar">Revogar (Cancelamento por Chargeback / MED confirmado)</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Motivo do bloqueio / revogação *</label>
              <textarea
                rows={3}
                style={inputStyle}
                value={modalBloqueio.motivo}
                onChange={(e) => setModalBloqueio((m) => ({ ...m, motivo: e.target.value }))}
                placeholder="Informe o motivo da contestação bancária..."
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="admin-btn admin-btn-secondary"
                onClick={() => setModalBloqueio({ aberto: false, cupom: null, acao: 'bloquear', motivo: '', enviando: false })}
              >
                Cancelar
              </button>
              <button type="submit" className="admin-btn admin-btn-danger" disabled={modalBloqueio.enviando}>
                {modalBloqueio.enviando
                  ? 'Processando...'
                  : modalBloqueio.acao === 'revogar'
                    ? 'Confirmar Revogação'
                    : 'Confirmar Bloqueio'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
