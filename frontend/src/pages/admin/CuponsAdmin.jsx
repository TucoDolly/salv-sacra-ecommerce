import { useEffect, useState } from 'react';
import api from '../../services/api';
import { atualizarCupom, criarCupom, listarCuponsAdmin, removerCupom } from '../../services/cupomService';

const FORM_VAZIO = {
  codigo: '',
  descricao: '',
  percentual: '',
  tipo: 'produto',
  todos_produtos: true,
  ativo: true,
  produto_ids: [],
};

const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' };
const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' };

export default function CuponsAdmin() {
  const [cupons, setCupons] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [form, setForm] = useState(FORM_VAZIO);
  const [editId, setEditId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState({ tipo: '', texto: '' });

  const carregar = async () => {
    try {
      const [{ data: c }, { data: p }] = await Promise.all([
        listarCuponsAdmin(),
        api.get('/produtos', { params: { per_page: 500 } }),
      ]);
      setCupons(c || []);
      setProdutos(p?.data || p || []);
    } catch {
      setMsg({ tipo: 'erro', texto: 'Não foi possível carregar cupons/produtos.' });
    }
  };

  useEffect(() => { carregar(); }, []);

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const toggleProduto = (id) =>
    setForm((f) => ({
      ...f,
      produto_ids: f.produto_ids.includes(id) ? f.produto_ids.filter((x) => x !== id) : [...f.produto_ids, id],
    }));

  const editar = (c) => {
    setEditId(c.id);
    setForm({
      codigo: c.codigo,
      descricao: c.descricao || '',
      percentual: c.percentual,
      tipo: c.tipo,
      todos_produtos: c.todos_produtos,
      ativo: c.ativo,
      produto_ids: (c.produtos || []).map((p) => p.id),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelar = () => { setEditId(null); setForm(FORM_VAZIO); };

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setMsg({ tipo: '', texto: '' });
    try {
      const payload = { ...form, percentual: Number(form.percentual) };
      if (editId) await atualizarCupom(editId, payload);
      else await criarCupom(payload);
      setMsg({ tipo: 'sucesso', texto: editId ? 'Cupom atualizado!' : 'Cupom criado com sucesso!' });
      cancelar();
      carregar();
    } catch (err) {
      const errs = err.response?.data?.errors;
      setMsg({ tipo: 'erro', texto: (errs && Object.values(errs)[0]?.[0]) || 'Erro ao salvar o cupom.' });
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (c) => {
    if (!window.confirm(`Excluir o cupom ${c.codigo}?`)) return;
    await removerCupom(c.id);
    carregar();
  };

  const alternarAtivo = async (c) => {
    await atualizarCupom(c.id, {
      ...c,
      ativo: !c.ativo,
      produto_ids: (c.produtos || []).map((p) => p.id),
    });
    carregar();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {msg.texto && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '14px',
          background: msg.tipo === 'sucesso' ? '#dcfce7' : '#fee2e2',
          color: msg.tipo === 'sucesso' ? '#15803d' : '#b91c1c',
        }}>
          {msg.texto}
        </div>
      )}

      {/* ── Formulário ── */}
      <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>{editId ? `Editar cupom ${form.codigo}` : 'Novo cupom'}</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
          <div>
            <label style={labelStyle}>Nome / Código do cupom *</label>
            <input
              style={{ ...inputStyle, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}
              value={form.codigo}
              onChange={(e) => set('codigo', e.target.value.toUpperCase().replace(/\s/g, ''))}
              placeholder="Ex: FE10"
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Desconto (%) *</label>
            <input
              type="number" min="0.01" max="100" step="0.01" style={inputStyle}
              value={form.percentual}
              onChange={(e) => set('percentual', e.target.value)}
              placeholder="Ex: 15"
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Aplicar desconto sobre *</label>
            <select style={inputStyle} value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
              <option value="produto">Valor das camisetas</option>
              <option value="frete">Valor do frete</option>
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Descrição (aparece para o cliente)</label>
          <input
            style={inputStyle}
            value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)}
            placeholder="Ex: 10% de desconto na sua primeira compra"
          />
        </div>

        <div>
          <label style={labelStyle}>Peças que podem usar o cupom</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '10px', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.todos_produtos} onChange={(e) => set('todos_produtos', e.target.checked)} />
            Todas as peças da loja
          </label>

          {!form.todos_produtos && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px',
              maxHeight: '240px', overflowY: 'auto', padding: '12px', border: '1px solid #eee', borderRadius: '8px', background: '#fafafa',
            }}>
              {produtos.length === 0 && <span style={{ fontSize: '13px', color: '#888' }}>Nenhum produto cadastrado.</span>}
              {produtos.map((p) => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.produto_ids.includes(p.id)} onChange={() => toggleProduto(p.id)} />
                  {p.nome}
                </label>
              ))}
            </div>
          )}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
          <input type="checkbox" checked={form.ativo} onChange={(e) => set('ativo', e.target.checked)} />
          Cupom ativo (visível para os clientes)
        </label>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={salvando}>
            {salvando ? 'Salvando...' : editId ? 'Salvar alterações' : 'Adicionar cupom'}
          </button>
          {editId && (
            <button type="button" className="admin-btn admin-btn-secondary" onClick={cancelar}>Cancelar</button>
          )}
        </div>
      </form>

      {/* ── Lista ── */}
      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>Cupons cadastrados</h3>
        {cupons.length === 0 ? (
          <p style={{ color: '#888', fontSize: '14px' }}>Nenhum cupom cadastrado ainda.</p>
        ) : (
          <table className="admin-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Desconto</th>
                <th>Aplica em</th>
                <th>Peças</th>
                <th>Status</th>
                <th style={{ textAlign: 'center', width: '190px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {cupons.map((c) => (
                <tr key={c.id}>
                  <td><strong style={{ letterSpacing: '1px' }}>{c.codigo}</strong></td>
                  <td>{Number(c.percentual)}%</td>
                  <td>{c.tipo === 'frete' ? 'Frete' : 'Camisetas'}</td>
                  <td style={{ fontSize: '12px', maxWidth: '220px' }}>
                    {c.todos_produtos ? 'Todas' : (c.produtos || []).map((p) => p.nome).join(', ')}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => alternarAtivo(c)}
                      className={`admin-status-badge ${c.ativo ? 'pago' : 'cancelado'}`}
                      style={{ border: 'none', cursor: 'pointer' }}
                      title="Clique para ativar/desativar"
                    >
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
                    <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" style={{ marginRight: '8px' }} onClick={() => editar(c)}>
                      Editar
                    </button>
                    <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => excluir(c)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

