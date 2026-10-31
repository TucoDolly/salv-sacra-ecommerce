import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../layouts/MainLayout';
import {
  alterarSenha,
  atualizarEndereco,
  atualizarPerfil,
  criarCartao,
  criarEndereco,
  excluirConta,
  listarCartoes,
  listarEnderecos,
  listarPedidos,
  obterResumoConta,
  removerCartao,
  removerEndereco,
} from '../services/contaService';
import '../styles/auth.css';
import '../styles/minha-conta.css';

const BREADCRUMBS = [
  { label: 'Início', to: '/' },
  { label: 'Minha Conta' },
];

const TABS = [
  { id: 'resumo',     label: 'Resumo' },
  { id: 'pedidos',    label: 'Meus pedidos' },
  { id: 'dados',      label: 'Informações pessoais' },
  { id: 'enderecos',  label: 'Endereços' },
  { id: 'pagamentos', label: 'Formas de pagamento' },
  { id: 'senha',      label: 'Alterar senha' },
];

const moeda = (v) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dataBR = (v) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');

const STATUS_CLASS = {
  Pendente: 'pendente',
  Pago: 'pago',
  'Em separação': 'em-separacao',
  'Em montagem': 'em-separacao',
  Enviado: 'enviado',
  'Em transporte': 'em-transporte',
  Entregue: 'entregue',
  Cancelado: 'cancelado',
};

// Gera uma previsão amigável de entrega (ex: 5 a 8 dias úteis a partir da data do pedido)
const calcularPrevisaoEntrega = (dataPedido, tipoFrete) => {
  const base = dataPedido ? new Date(dataPedido) : new Date();
  const diasMin = tipoFrete && tipoFrete.toLowerCase().includes('sedex') ? 2 : 5;
  const diasMax = tipoFrete && tipoFrete.toLowerCase().includes('sedex') ? 4 : 8;

  const d1 = new Date(base);
  d1.setDate(d1.getDate() + diasMin);
  const d2 = new Date(base);
  d2.setDate(d2.getDate() + diasMax);

  return `${d1.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} e ${d2.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
};

// Determina em qual etapa da linha do tempo o pedido se encontra
// 1: Pendente (Pedido Realizado), 2: Pago, 3: Em separação, 4: Enviado, 5: Em transporte, 6: Entregue
const obterEtapaRastreio = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'entregue') return 6;
  if (s === 'em transporte') return 5;
  if (s === 'enviado') return 4;
  if (s === 'em separação' || s === 'em separacao' || s === 'em montagem') return 3;
  if (s === 'pago') return 2;
  return 1; // Pendente ou Criado
};

const primeiroErro = (err) => {
  const errs = err.response?.data?.errors;
  if (errs) return Object.values(errs)[0]?.[0];
  return err.response?.data?.message ?? 'Ocorreu um erro. Tente novamente.';
};

/* ───────────────────────── Resumo ───────────────────────── */
function Resumo({ user, pedidos, enderecos, cartoes, resumo, irPara, carregando }) {
  const ultimo = resumo?.ultimo_pedido !== undefined ? resumo.ultimo_pedido : pedidos?.[0];
  const numPedidos = resumo?.total_pedidos !== undefined ? resumo.total_pedidos : (pedidos?.length || 0);
  const numEnderecos = resumo?.total_enderecos !== undefined ? resumo.total_enderecos : (enderecos?.length || 0);
  const numCartoes = resumo?.total_cartoes !== undefined ? resumo.total_cartoes : (cartoes?.length || 0);

  return (
    <>
      <h2 className="conta-section-title">Olá, {user.name.split(' ')[0]}!</h2>
      <p className="conta-section-sub">
        Aqui você acompanha seus pedidos e gerencia seus dados.
      </p>

      <div className="conta-cards">
        <button type="button" className="conta-card" onClick={() => irPara('pedidos')}>
          <span className="conta-card-num">{numPedidos}</span>
          <span className="conta-card-label">Pedidos realizados</span>
        </button>
        <button type="button" className="conta-card" onClick={() => irPara('enderecos')}>
          <span className="conta-card-num">{numEnderecos}</span>
          <span className="conta-card-label">Endereços salvos</span>
        </button>
        <button type="button" className="conta-card" onClick={() => irPara('pagamentos')}>
          <span className="conta-card-num">{numCartoes}</span>
          <span className="conta-card-label">Cartões salvos</span>
        </button>
        <button type="button" className="conta-card" onClick={() => irPara('dados')}>
          <span className="conta-card-num">✎</span>
          <span className="conta-card-label">Editar meus dados</span>
        </button>
      </div>

      <div className="conta-box">
        <h3>Último pedido</h3>
        {ultimo ? (
          <div className="conta-pedido-resumo">
            <div>
              <strong>Pedido #{ultimo.id}</strong>
              <span> · {dataBR(ultimo.data_pedido)}</span>
            </div>
            <div>
              <span className={`conta-status ${STATUS_CLASS[ultimo.status] ?? 'pendente'}`}>
                {ultimo.status}
              </span>
              <strong> {moeda(ultimo.valor_total)}</strong>
            </div>
          </div>
        ) : carregando ? (
          <div className="conta-skeleton-linha" />
        ) : (
          <p className="conta-vazio">
            Você ainda não fez nenhum pedido. <Link to="/produtos">Ver produtos</Link>
          </p>
        )}
      </div>
    </>
  );
}

/* ───────────────────────── Pedidos ───────────────────────── */
function Pedidos({ pedidos, pedidoSelecionadoInicial }) {
  const [aberto, setAberto] = useState(pedidoSelecionadoInicial ? Number(pedidoSelecionadoInicial) : null);

  useEffect(() => {
    if (pedidoSelecionadoInicial) {
      setAberto(Number(pedidoSelecionadoInicial));
    }
  }, [pedidoSelecionadoInicial]);

  if (!pedidos.length) {
    return (
      <>
        <h2 className="conta-section-title">Meus pedidos</h2>
        <p className="conta-vazio">
          Você ainda não fez nenhum pedido. <Link to="/produtos">Ver produtos</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className="conta-section-title">Meus pedidos</h2>
      <div className="conta-lista">
        {pedidos.map((p) => (
          <div key={p.id} className="conta-box">
            <button
              type="button"
              className="conta-pedido-head"
              onClick={() => setAberto(aberto === p.id ? null : p.id)}
              aria-expanded={aberto === p.id}
            >
              <div>
                <strong>Pedido #{p.id}</strong>
                <span className="conta-muted"> · {dataBR(p.data_pedido)}</span>
              </div>
              <div className="conta-pedido-right">
                <span className={`conta-status ${STATUS_CLASS[p.status] ?? 'pendente'}`}>
                  {p.status}
                </span>
                <strong>{moeda(p.valor_total)}</strong>
                <span className="conta-chevron">{aberto === p.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {aberto === p.id && (
              <div className="conta-pedido-detalhe">
                {/* ── Rastreamento e Linha do Tempo ── */}
                <div className="conta-rastreio-container">
                  <div className="conta-previsao-banner">
                    <div className="conta-previsao-left">
                      <span className="conta-previsao-icon">📦</span>
                      <div className="conta-previsao-text">
                        <strong>Previsão de entrega: {calcularPrevisaoEntrega(p.data_pedido, p.tipo_frete)}</strong>
                        <span>Modalidade de envio: {p.tipo_frete || 'Transportadora Padrão'}</span>
                      </div>
                    </div>
                    <div>
                      <span className="conta-codigo-rastreio" title="Código de rastreamento">
                        {p.codigo_rastreio
                          ? `Rastreio: ${p.codigo_rastreio}`
                          : 'Rastreio: Aguardando postagem'}
                      </span>
                    </div>
                  </div>

                  {/* Stepper / Linha do Tempo */}
                  {(() => {
                    const etapaAtual = obterEtapaRastreio(p.status);
                    const steps = [
                      { num: 1, label: 'Pendente', sub: dataBR(p.data_pedido) },
                      { num: 2, label: 'Pago', sub: etapaAtual >= 2 ? 'Confirmado' : 'Aguardando' },
                      { num: 3, label: 'Em separação', sub: etapaAtual > 3 ? 'Concluído' : (etapaAtual === 3 ? 'Separando peças' : 'Pendente') },
                      { num: 4, label: 'Enviado', sub: etapaAtual >= 4 ? 'Postado na agência' : 'Pendente' },
                      { num: 5, label: 'Em transporte', sub: etapaAtual >= 5 ? 'A caminho' : 'Pendente' },
                      { num: 6, label: 'Entregue', sub: etapaAtual >= 6 ? 'Pacote recebido' : 'Pendente' },
                    ];

                    return (
                      <div className="conta-timeline">
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
                              <span className="conta-timeline-label">{st.label}</span>
                              <span className="conta-timeline-sub">{st.sub}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <table className="conta-tabela">
                  <thead>
                    <tr><th>Produto</th><th>Qtd</th><th>Preço</th></tr>
                  </thead>
                  <tbody>
                    {p.itens?.map((i) => (
                      <tr key={i.id}>
                        <td>
                          {i.variacao?.produto?.nome ?? 'Produto'}
                          {i.variacao && (
                            <span className="conta-muted">
                              {' '}— {i.variacao.tamanho}{i.variacao.cor ? ` / ${i.variacao.cor}` : ''}
                            </span>
                          )}
                        </td>
                        <td>{i.quantidade}</td>
                        <td>{moeda(i.preco_unitario)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="conta-pedido-info">
                  <p><strong>Pagamento:</strong> {p.metodo_pagamento?.toUpperCase()}</p>
                  <p><strong>Frete ({p.tipo_frete}):</strong> {moeda(p.valor_frete)}</p>
                  <p>
                    <strong>Entrega:</strong> {p.logradouro}, {p.numero}
                    {p.complemento ? ` - ${p.complemento}` : ''} — {p.bairro}, {p.cidade}/{p.estado} · CEP {p.cep}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/* ───────────────────── Informações pessoais ───────────────────── */
function DadosPessoais({ user, onSalvo, onExcluirConta, excluindoConta }) {
  const [form, setForm] = useState({
    name: user.name ?? '',
    email: user.email ?? '',
    telefone: user.telefone ?? '',
    cpf: user.cpf ?? '',
    data_nascimento: user.data_nascimento ?? '',
  });
  const [msg, setMsg] = useState({ tipo: '', texto: '' });
  const [salvando, setSalvando] = useState(false);

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ tipo: '', texto: '' });
    setSalvando(true);
    try {
      const { data } = await atualizarPerfil(form);
      onSalvo(data.user);
      setMsg({ tipo: 'ok', texto: data.message });
    } catch (err) {
      setMsg({ tipo: 'erro', texto: primeiroErro(err) });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <h2 className="conta-section-title">Informações pessoais</h2>
      <form className="auth-form conta-form" onSubmit={submit}>
        {msg.texto && (
          <p className={msg.tipo === 'ok' ? 'conta-ok' : 'auth-error'}>{msg.texto}</p>
        )}
        <div className="auth-field">
          <label htmlFor="c-name">Nome completo</label>
          <input id="c-name" name="name" value={form.name} onChange={change} required />
        </div>
        <div className="auth-field">
          <label htmlFor="c-email">E-mail</label>
          <input id="c-email" type="email" name="email" value={form.email} onChange={change} required />
        </div>
        <div className="conta-grid-2">
          <div className="auth-field">
            <label htmlFor="c-tel">Telefone</label>
            <input id="c-tel" name="telefone" placeholder="(48) 99999-9999" value={form.telefone} onChange={change} />
          </div>
          <div className="auth-field">
            <label htmlFor="c-cpf">CPF</label>
            <input id="c-cpf" name="cpf" placeholder="000.000.000-00" value={form.cpf} onChange={change} />
          </div>
        </div>
        <div className="auth-field">
          <label htmlFor="c-nasc">Data de nascimento</label>
          <input id="c-nasc" type="date" name="data_nascimento" value={form.data_nascimento} onChange={change} />
        </div>
        <button type="submit" className="auth-btn" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>

      {/* Zona de Exclusão da Conta */}
      <div
        className="conta-box"
        style={{
          marginTop: '32px',
          border: '1px solid #fecaca',
          background: '#fef2f2',
          padding: '20px',
          borderRadius: '10px',
        }}
      >
        <h3 style={{ color: '#b91c1c', margin: '0 0 8px 0', fontSize: '16px' }}>
          Excluir minha conta
        </h3>
        <p style={{ color: '#7f1d1d', fontSize: '13px', margin: '0 0 16px 0', lineHeight: 1.5 }}>
          Ao excluir sua conta, todos os seus dados pessoais, endereços, cartões salvos e histórico de compras serão apagados permanentemente. Esta ação não pode ser desfeita.
        </p>
        <button
          type="button"
          onClick={onExcluirConta}
          disabled={excluindoConta}
          style={{
            background: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: excluindoConta ? 'not-allowed' : 'pointer',
          }}
        >
          {excluindoConta ? 'Excluindo conta...' : 'Excluir minha conta permanentemente'}
        </button>
      </div>
    </>
  );
}

/* ───────────────────────── Endereços ───────────────────────── */
const ENDERECO_VAZIO = {
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
};

function Enderecos({ enderecos, recarregar }) {
  const [form, setForm] = useState(null); // null = fechado
  const [editId, setEditId] = useState(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const novo = () => { setEditId(null); setForm(ENDERECO_VAZIO); setErro(''); };
  const editar = (end) => {
    setEditId(end.id);
    setForm({
      cep: end.cep, logradouro: end.logradouro, numero: end.numero,
      complemento: end.complemento ?? '', bairro: end.bairro, cidade: end.cidade, estado: end.estado,
    });
    setErro('');
  };

  const buscarCep = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setForm((f) => ({
          ...f,
          logradouro: d.logradouro || f.logradouro,
          bairro: d.bairro || f.bairro,
          cidade: d.localidade || f.cidade,
          estado: d.uf || f.estado,
        }));
      }
    } catch { /* silencioso: usuário preenche manualmente */ }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      if (editId) await atualizarEndereco(editId, form);
      else await criarEndereco(form);
      setForm(null);
      await recarregar();
    } catch (err) {
      setErro(primeiroErro(err));
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (id) => {
    if (!window.confirm('Remover este endereço?')) return;
    await removerEndereco(id);
    recarregar();
  };

  return (
    <>
      <div className="conta-head-row">
        <h2 className="conta-section-title">Endereços</h2>
        {!form && (
          <button type="button" className="conta-btn-sec" onClick={novo}>+ Novo endereço</button>
        )}
      </div>

      {form && (
        <form className="auth-form conta-box conta-form" onSubmit={submit}>
          <h3>{editId ? 'Editar endereço' : 'Novo endereço'}</h3>
          {erro && <p className="auth-error">{erro}</p>}
          <div className="conta-grid-2">
            <div className="auth-field">
              <label htmlFor="e-cep">CEP</label>
              <input id="e-cep" name="cep" value={form.cep} onChange={change} onBlur={buscarCep} required />
            </div>
            <div className="auth-field">
              <label htmlFor="e-uf">Estado (UF)</label>
              <input id="e-uf" name="estado" maxLength={2} value={form.estado} onChange={change} required />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="e-log">Rua / Avenida</label>
            <input id="e-log" name="logradouro" value={form.logradouro} onChange={change} required />
          </div>
          <div className="conta-grid-2">
            <div className="auth-field">
              <label htmlFor="e-num">Número</label>
              <input id="e-num" name="numero" value={form.numero} onChange={change} required />
            </div>
            <div className="auth-field">
              <label htmlFor="e-comp">Complemento</label>
              <input id="e-comp" name="complemento" value={form.complemento} onChange={change} />
            </div>
          </div>
          <div className="conta-grid-2">
            <div className="auth-field">
              <label htmlFor="e-bai">Bairro</label>
              <input id="e-bai" name="bairro" value={form.bairro} onChange={change} required />
            </div>
            <div className="auth-field">
              <label htmlFor="e-cid">Cidade</label>
              <input id="e-cid" name="cidade" value={form.cidade} onChange={change} required />
            </div>
          </div>
          <div className="conta-actions">
            <button type="submit" className="auth-btn" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar endereço'}
            </button>
            <button type="button" className="conta-btn-sec" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {!enderecos.length && !form && (
        <p className="conta-vazio">Você ainda não cadastrou nenhum endereço.</p>
      )}

      <div className="conta-lista">
        {enderecos.map((end) => (
          <div key={end.id} className="conta-box conta-endereco">
            <div>
              <strong>{end.logradouro}, {end.numero}</strong>
              {end.complemento && <span> — {end.complemento}</span>}
              <p className="conta-muted">
                {end.bairro} · {end.cidade}/{end.estado} · CEP {end.cep}
              </p>
            </div>
            <div className="conta-actions">
              <button type="button" className="conta-link" onClick={() => editar(end)}>Editar</button>
              <button type="button" className="conta-link perigo" onClick={() => remover(end.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ───────────────────── Formas de Pagamento ───────────────────── */
const CARTAO_VAZIO = {
  tipo: 'credito',
  titular: '',
  numero: '',
  validade: '',
};

function FormasPagamento({ cartoes, recarregar }) {
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Formatação amigável do número do cartão (grupos de 4 dígitos)
  const handleNumeroChange = (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 16);
    v = v.replace(/(\d{4})/g, '$1 ').trim();
    setForm((f) => ({ ...f, numero: v }));
  };

  // Formatação amigável da validade (MM/AA)
  const handleValidadeChange = (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) {
      v = `${v.slice(0, 2)}/${v.slice(2)}`;
    }
    setForm((f) => ({ ...f, validade: v }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      await criarCartao({
        tipo: form.tipo,
        titular: form.titular,
        numero: form.numero.replace(/\s+/g, ''),
        validade: form.validade,
      });
      setForm(null);
      await recarregar();
    } catch (err) {
      setErro(primeiroErro(err));
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (id) => {
    if (!window.confirm('Deseja remover este cartão salvo?')) return;
    await removerCartao(id);
    recarregar();
  };

  return (
    <>
      <div className="conta-head-row">
        <div>
          <h2 className="conta-section-title">Formas de pagamento</h2>
          <p className="conta-section-sub">
            Gerencie seus cartões salvos para agilizar suas compras com total segurança.
          </p>
        </div>
        {!form && (
          <button type="button" className="conta-btn-sec" onClick={() => { setForm(CARTAO_VAZIO); setErro(''); }}>
            + Novo cartão
          </button>
        )}
      </div>

      {form && (
        <form className="auth-form conta-box conta-form" onSubmit={submit}>
          <h3>Novo Cartão</h3>
          {erro && <p className="auth-error">{erro}</p>}

          <div className="auth-field">
            <label htmlFor="card-tipo">Tipo de Cartão</label>
            <select
              id="card-tipo"
              name="tipo"
              value={form.tipo}
              onChange={change}
              style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff' }}
            >
              <option value="credito">Cartão de Crédito</option>
              <option value="debito">Cartão de Débito</option>
            </select>
          </div>

          <div className="auth-field">
            <label htmlFor="card-titular">Nome impresso no Cartão</label>
            <input
              id="card-titular"
              name="titular"
              placeholder="Ex: JOAO S SILVA"
              value={form.titular}
              onChange={change}
              required
            />
          </div>

          <div className="conta-grid-2">
            <div className="auth-field">
              <label htmlFor="card-num">Número do Cartão</label>
              <input
                id="card-num"
                name="numero"
                placeholder="0000 0000 0000 0000"
                value={form.numero}
                onChange={handleNumeroChange}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="card-val">Validade (MM/AA)</label>
              <input
                id="card-val"
                name="validade"
                placeholder="MM/AA"
                maxLength={5}
                value={form.validade}
                onChange={handleValidadeChange}
                required
              />
            </div>
          </div>

          <div className="conta-payment-info-box" style={{ marginTop: '4px', marginBottom: '14px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <div className="conta-payment-info-text">
              <strong>Segurança Garantida:</strong> Por normas de segurança e privacidade bancária, não solicitamos nem armazenamos o código de segurança (CVV). O CVV será solicitado apenas no momento exato em que você for fechar a compra.
            </div>
          </div>

          <div className="conta-actions">
            <button type="submit" className="auth-btn" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar cartão'}
            </button>
            <button type="button" className="conta-btn-sec" onClick={() => setForm(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {!cartoes.length && !form && (
        <p className="conta-vazio">Você ainda não tem nenhum cartão salvo.</p>
      )}

      <div className="conta-lista">
        {cartoes.map((card) => (
          <div key={card.id} className="conta-box conta-cartao-item">
            <div className="conta-cartao-left">
              <div className="conta-cartao-icon">
                {card.bandeira || 'CARD'}
              </div>
              <div className="conta-cartao-detalhes">
                <strong>
                  •••• •••• •••• {card.ultimos_digitos}
                  <span className="conta-cartao-tag">{card.tipo === 'credito' ? 'Crédito' : 'Débito'}</span>
                </strong>
                <p className="conta-muted" style={{ margin: '2px 0 0' }}>
                  {card.titular} · Validade: {card.validade}
                </p>
              </div>
            </div>
            <div className="conta-actions">
              <button
                type="button"
                className="conta-link perigo"
                onClick={() => remover(card.id)}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Orientações sobre Pix e Boleto */}
      <div className="conta-payment-info-box">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <div className="conta-payment-info-text">
          <strong>Sobre Pix e Boleto Bancário:</strong> O Pix e o Boleto não exigem cadastro prévio de dados nesta tela. Eles geram QR Codes, chave copia-e-cola e código de barras exclusivos automaticamente na conclusão de cada pedido com total segurança e praticidade.
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── Senha ───────────────────────── */
function Senha() {
  const vazio = { senha_atual: '', password: '', password_confirmation: '' };
  const [form, setForm] = useState(vazio);
  const [msg, setMsg] = useState({ tipo: '', texto: '' });
  const [salvando, setSalvando] = useState(false);

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ tipo: '', texto: '' });
    setSalvando(true);
    try {
      const { data } = await alterarSenha(form);
      setForm(vazio);
      setMsg({ tipo: 'ok', texto: data.message });
    } catch (err) {
      setMsg({ tipo: 'erro', texto: primeiroErro(err) });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <h2 className="conta-section-title">Alterar senha</h2>
      <form className="auth-form conta-form" onSubmit={submit}>
        {msg.texto && (
          <p className={msg.tipo === 'ok' ? 'conta-ok' : 'auth-error'}>{msg.texto}</p>
        )}
        <div className="auth-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="s-atual">Senha atual</label>
            <Link
              to="/esqueci-minha-senha"
              style={{ fontSize: '13px', color: '#111111', textDecoration: 'underline', marginBottom: '6px' }}
            >
              Esqueceu a senha atual?
            </Link>
          </div>
          <input
            id="s-atual"
            type="password"
            name="senha_atual"
            placeholder="Digite sua senha atual"
            value={form.senha_atual}
            onChange={change}
            required
          />
        </div>
        <div className="auth-field">
          <label htmlFor="s-nova">Nova senha</label>
          <input
            id="s-nova"
            type="password"
            name="password"
            placeholder="Mínimo de 8 caracteres"
            value={form.password}
            onChange={change}
            required
          />
        </div>
        <div className="auth-field">
          <label htmlFor="s-conf">Confirmar nova senha</label>
          <input
            id="s-conf"
            type="password"
            name="password_confirmation"
            placeholder="Repita a nova senha"
            value={form.password_confirmation}
            onChange={change}
            required
          />
        </div>
        <button type="submit" className="auth-btn" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Alterar senha'}
        </button>
      </form>
    </>
  );
}

/* ───────────────────────── Página ───────────────────────── */
export default function MinhaContaPage() {
  const { user, isAuthenticated, loading, signOut, updateUser, setSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlAba = searchParams.get('aba');
  const urlPedido = searchParams.get('pedido');
  const urlEmail = searchParams.get('email');

  const [aba, setAba] = useState(() => (urlAba && TABS.some((t) => t.id === urlAba) ? urlAba : 'resumo'));
  const [pedidos, setPedidos] = useState([]);
  const [enderecos, setEnderecos] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [excluindoConta, setExcluindoConta] = useState(false);
  const [modalExcluirConta, setModalExcluirConta] = useState(false);

  // Se o link do e-mail veio para outra conta e a conta atual não bate, desloga para que o usuário logue na conta correta
  useEffect(() => {
    if (isAuthenticated && urlEmail && user?.email && urlEmail.toLowerCase() !== user.email.toLowerCase()) {
      signOut().then(() => {
        navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      });
    }
  }, [isAuthenticated, urlEmail, user, signOut, navigate]);

  // Se a URL mudar de aba (ex: vindo de um link externo /minha-conta?aba=pedidos)
  useEffect(() => {
    if (urlAba && TABS.some((t) => t.id === urlAba)) {
      setAba(urlAba);
    }
  }, [urlAba]);

  // Lê do cache local imediatamente para os números já aparecerem na tela no milissegundo 0
  const [resumo, setResumo] = useState(() => {
    try {
      const salvo = localStorage.getItem('minha_conta_resumo');
      return salvo ? JSON.parse(salvo) : null;
    } catch {
      return null;
    }
  });
  const [carregandoDados, setCarregandoDados] = useState(!resumo);

  const carregarPedidos = useCallback(
    () => listarPedidos().then(({ data }) => setPedidos(data)).catch(() => {}),
    [],
  );
  const carregarEnderecos = useCallback(
    () => listarEnderecos().then(({ data }) => setEnderecos(data)).catch(() => {}),
    [],
  );
  const carregarCartoes = useCallback(
    () => listarCartoes().then(({ data }) => setCartoes(data)).catch(() => {}),
    [],
  );

  const carregarResumo = useCallback(() => {
    return obterResumoConta()
      .then(({ data }) => {
        setResumo(data);
        localStorage.setItem('minha_conta_resumo', JSON.stringify(data));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      // 1. Atualiza imediatamente o resumo leve com os contadores
      carregarResumo().finally(() => setCarregandoDados(false));

      // 2. Busca os dados completos para as abas secundárias
      carregarPedidos();
      carregarEnderecos();
      carregarCartoes();
    }
  }, [isAuthenticated, carregarResumo, carregarPedidos, carregarEnderecos, carregarCartoes]);

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const sair = async () => {
    localStorage.removeItem('minha_conta_resumo');
    await signOut();
    navigate('/');
  };

  const abrirConfirmacaoExclusao = () => {
    setModalExcluirConta(true);
  };

  const confirmarExclusaoConta = async () => {
    setExcluindoConta(true);
    try {
      await excluirConta();
      localStorage.removeItem('sanctum_token');
      localStorage.removeItem('minha_conta_resumo');
      localStorage.removeItem('@SalvSacra:carrinho');
      localStorage.removeItem('@SalvSacra:cupom');
      // Limpa a sessão diretamente sem chamar signOut() na API (pois a conta e tokens foram excluídos)
      setSession('', null);
      navigate('/login');
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('sanctum_token');
        setSession('', null);
        navigate('/login');
        return;
      }
      alert(primeiroErro(err));
    } finally {
      setExcluindoConta(false);
      setModalExcluirConta(false);
    }
  };

  return (
    <MainLayout breadcrumbs={BREADCRUMBS}>
      <div className="conta-page">
        <h1 className="auth-title">Minha conta</h1>

        <div className="conta-layout">
          <aside className="conta-menu" aria-label="Menu da conta">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`conta-menu-item ${aba === t.id ? 'ativo' : ''}`}
                onClick={() => setAba(t.id)}
              >
                {t.label}
              </button>
            ))}
            <button type="button" className="conta-menu-item sair" onClick={sair}>
              Sair
            </button>
            <button
              type="button"
              className="conta-menu-item sair"
              style={{ color: '#dc2626', marginTop: '4px' }}
              onClick={abrirConfirmacaoExclusao}
              disabled={excluindoConta}
            >
              {excluindoConta ? 'Excluindo...' : 'Excluir conta'}
            </button>
          </aside>

          <section className="conta-content">
            {aba === 'resumo' && (
              <Resumo
                user={user}
                pedidos={pedidos}
                enderecos={enderecos}
                cartoes={cartoes}
                resumo={resumo}
                irPara={setAba}
                carregando={carregandoDados}
              />
            )}
            {aba === 'pedidos' && <Pedidos pedidos={pedidos} pedidoSelecionadoInicial={urlPedido} />}
            {aba === 'dados' && (
              <DadosPessoais
                user={user}
                onSalvo={updateUser}
                onExcluirConta={abrirConfirmacaoExclusao}
                excluindoConta={excluindoConta}
              />
            )}
            {aba === 'enderecos' && (
              <Enderecos
                enderecos={enderecos}
                recarregar={() => {
                  carregarEnderecos();
                  carregarResumo();
                }}
              />
            )}
            {aba === 'pagamentos' && (
              <FormasPagamento
                cartoes={cartoes}
                recarregar={() => {
                  carregarCartoes();
                  carregarResumo();
                }}
              />
            )}
            {aba === 'senha' && <Senha />}
          </section>
        </div>

        {/* Modal de confirmação de exclusão da conta (sem alerta de localhost) */}
        {modalExcluirConta && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1200,
              padding: '20px',
            }}
            onClick={() => !excluindoConta && setModalExcluirConta(false)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '28px',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#b91c1c', margin: '0 0 12px 0' }}>
                Confirmar exclusão de conta
              </h3>
              <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                Tem certeza de que deseja excluir sua conta mesmo? Todos os seus dados pessoais, endereços, cartões salvos e histórico de compras serão apagados permanentemente e não poderão ser recuperados.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="conta-btn-sec"
                  onClick={() => setModalExcluirConta(false)}
                  disabled={excluindoConta}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarExclusaoConta}
                  disabled={excluindoConta}
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: excluindoConta ? 'not-allowed' : 'pointer',
                  }}
                >
                  {excluindoConta ? 'Excluindo...' : 'Sim, excluir minha conta'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
