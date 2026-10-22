import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../layouts/MainLayout';
import {
  alterarSenha,
  atualizarEndereco,
  atualizarPerfil,
  criarEndereco,
  listarEnderecos,
  listarPedidos,
  removerEndereco,
} from '../services/contaService';
import '../styles/auth.css';
import '../styles/minha-conta.css';

const BREADCRUMBS = [
  { label: 'Início', to: '/' },
  { label: 'Minha Conta' },
];

const TABS = [
  { id: 'resumo',    label: 'Resumo' },
  { id: 'pedidos',   label: 'Meus pedidos' },
  { id: 'dados',     label: 'Informações pessoais' },
  { id: 'enderecos', label: 'Endereços' },
  { id: 'senha',     label: 'Alterar senha' },
];

const moeda = (v) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dataBR = (v) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');

const STATUS_CLASS = {
  Pendente: 'pendente',
  Pago: 'pago',
  Enviado: 'enviado',
  Entregue: 'entregue',
  Cancelado: 'cancelado',
};

const primeiroErro = (err) => {
  const errs = err.response?.data?.errors;
  if (errs) return Object.values(errs)[0]?.[0];
  return err.response?.data?.message ?? 'Ocorreu um erro. Tente novamente.';
};

/* ───────────────────────── Resumo ───────────────────────── */
function Resumo({ user, pedidos, enderecos, irPara }) {
  const ultimo = pedidos[0];
  return (
    <>
      <h2 className="conta-section-title">Olá, {user.name.split(' ')[0]}!</h2>
      <p className="conta-section-sub">
        Aqui você acompanha seus pedidos e gerencia seus dados.
      </p>

      <div className="conta-cards">
        <button type="button" className="conta-card" onClick={() => irPara('pedidos')}>
          <span className="conta-card-num">{pedidos.length}</span>
          <span className="conta-card-label">Pedidos realizados</span>
        </button>
        <button type="button" className="conta-card" onClick={() => irPara('enderecos')}>
          <span className="conta-card-num">{enderecos.length}</span>
          <span className="conta-card-label">Endereços salvos</span>
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
function Pedidos({ pedidos }) {
  const [aberto, setAberto] = useState(null);

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
function DadosPessoais({ user, onSalvo }) {
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
          <label htmlFor="s-atual">Senha atual</label>
          <input id="s-atual" type="password" name="senha_atual" value={form.senha_atual} onChange={change} required />
        </div>
        <div className="auth-field">
          <label htmlFor="s-nova">Nova senha</label>
          <input id="s-nova" type="password" name="password" value={form.password} onChange={change} required />
        </div>
        <div className="auth-field">
          <label htmlFor="s-conf">Confirmar nova senha</label>
          <input id="s-conf" type="password" name="password_confirmation" value={form.password_confirmation} onChange={change} required />
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
  const { user, isAuthenticated, loading, signOut, updateUser } = useAuth();
  const navigate = useNavigate();
  const [aba, setAba] = useState('resumo');
  const [pedidos, setPedidos] = useState([]);
  const [enderecos, setEnderecos] = useState([]);

  const carregarPedidos = useCallback(
    () => listarPedidos().then(({ data }) => setPedidos(data)).catch(() => {}),
    [],
  );
  const carregarEnderecos = useCallback(
    () => listarEnderecos().then(({ data }) => setEnderecos(data)).catch(() => {}),
    [],
  );

  useEffect(() => {
    if (isAuthenticated) {
      carregarPedidos();
      carregarEnderecos();
    }
  }, [isAuthenticated, carregarPedidos, carregarEnderecos]);

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const sair = async () => {
    await signOut();
    navigate('/');
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
          </aside>

          <section className="conta-content">
            {aba === 'resumo' && (
              <Resumo user={user} pedidos={pedidos} enderecos={enderecos} irPara={setAba} />
            )}
            {aba === 'pedidos' && <Pedidos pedidos={pedidos} />}
            {aba === 'dados' && <DadosPessoais user={user} onSalvo={updateUser} />}
            {aba === 'enderecos' && (
              <Enderecos enderecos={enderecos} recarregar={carregarEnderecos} />
            )}
            {aba === 'senha' && <Senha />}
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
