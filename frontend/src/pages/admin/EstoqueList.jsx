import { useEffect, useMemo, useState } from 'react';
import { getEstoqueAdmin, updateEstoqueVariacao } from '../../services/adminEstoqueService';
import { getHexCor } from '../../constants/cores';
import LoadingSpinner from '../../components/LoadingSpinner';
import '../../styles/admin.css';

const OPCOES_TAMANHO = ['PP', 'P', 'M', 'G', 'GG', 'G1', 'G2'];

const normalizarBusca = (txt) =>
  (txt || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export default function EstoqueList() {
  const [produtos, setProdutos] = useState([]);
  const [resumo, setResumo] = useState({
    total_produtos: 0,
    total_variacoes: 0,
    total_criticos: 0,
    total_esgotados: 0,
    total_pecas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState(''); // '' | 'critico' | 'esgotado' | 'normal'
  const [salvandoId, setSalvandoId] = useState(null);
  const [feedback, setFeedback] = useState({ tipo: '', texto: '' });

  // ── Filtros adicionais de organização e modelos ──────────────────────────────
  const [modeloFiltro, setModeloFiltro]         = useState('todos'); // 'todos' | 'Regular Fit' | 'Oversized'
  const [tamanhoFiltro, setTamanhoFiltro]       = useState('');
  const [corFiltro, setCorFiltro]               = useState('');
  const [ordenacaoEstoque, setOrdenacaoEstoque] = useState('tamanho_padrao'); // 'tamanho_padrao' | 'estoque_desc' | 'estoque_asc' | 'cor_asc'

  // Valores em edição local por variação id: { [varId]: number }
  const [edicoes, setEdicoes] = useState({});

  const carregarDados = async () => {
    setLoading(true);
    try {
      const params = {};
      if (busca.trim()) params.busca = busca.trim();
      if (filtro) params.filtro = filtro;

      const { data } = await getEstoqueAdmin(params);
      setProdutos(data.produtos || []);
      if (data.resumo) {
        setResumo(data.resumo);
      }

      // Preenche os valores locais para inputs
      const novosValores = {};
      (data.produtos || []).forEach((prod) => {
        (prod.variacoes || []).forEach((v) => {
          novosValores[v.id] = v.estoque;
        });
      });
      setEdicoes(novosValores);
    } catch {
      setFeedback({ tipo: 'erro', texto: 'Não foi possível carregar o estoque.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      carregarDados();
    }, 250);
    return () => clearTimeout(timer);
  }, [busca, filtro]);

  // Sincronização automática em segundo plano sem refresh (a cada 5 segundos e ao focar na janela)
  useEffect(() => {
    const carregarSilencioso = () => {
      if (!salvandoId && document.visibilityState === 'visible') {
        const params = {};
        if (busca.trim()) params.busca = busca.trim();
        if (filtro) params.filtro = filtro;

        getEstoqueAdmin(params)
          .then(({ data }) => {
            setProdutos(data.produtos || []);
            if (data.resumo) setResumo(data.resumo);
            setEdicoes((prev) => {
              const novosValores = { ...prev };
              (data.produtos || []).forEach((prod) => {
                (prod.variacoes || []).forEach((v) => {
                  if (novosValores[v.id] === undefined) {
                    novosValores[v.id] = v.estoque;
                  }
                });
              });
              return novosValores;
            });
          })
          .catch(() => {});
      }
    };

    const interval = setInterval(carregarSilencioso, 5000);

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        carregarDados();
      }
    };
    const handleStorage = (e) => {
      if (e.key === 'salv_sync_trigger') {
        carregarDados();
      }
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [busca, filtro, salvandoId]);

  const handleInputChange = (variacaoId, valorStr) => {
    const val = valorStr === '' ? '' : Math.max(0, parseInt(valorStr, 10) || 0);
    setEdicoes((prev) => ({ ...prev, [variacaoId]: val }));
  };

  const handleAjusteRapido = (variacaoId, delta) => {
    const atual = typeof edicoes[variacaoId] === 'number' ? edicoes[variacaoId] : 0;
    const novo = Math.max(0, atual + delta);
    setEdicoes((prev) => ({ ...prev, [variacaoId]: novo }));
  };

  const salvarEstoque = async (variacaoId, valorOriginal) => {
    const novoValor = edicoes[variacaoId];
    if (novoValor === undefined || novoValor === '' || novoValor === valorOriginal) return;

    setSalvandoId(variacaoId);
    setFeedback({ tipo: '', texto: '' });

    try {
      await updateEstoqueVariacao(variacaoId, Number(novoValor));
      setFeedback({ tipo: 'sucesso', texto: 'Estoque atualizado com sucesso!' });
      
      // Atualiza o estado em memória para evitar refetch pesado
      setProdutos((prev) =>
        prev.map((prod) => ({
          ...prod,
          variacoes: prod.variacoes.map((v) =>
            v.id === variacaoId ? { ...v, estoque: Number(novoValor) } : v
          ),
        }))
      );

      // Recalcula resumo rapidamente
      carregarDados();
      try {
        localStorage.setItem('salv_sync_trigger', String(Date.now()));
      } catch {}
      window.dispatchEvent(new Event('salv-pedidos-atualizados'));
      setTimeout(() => setFeedback({ tipo: '', texto: '' }), 3000);
    } catch {
      setFeedback({ tipo: 'erro', texto: 'Erro ao salvar o estoque.' });
    } finally {
      setSalvandoId(null);
    }
  };

  // Cores cadastradas nos produtos retornados
  const coresDisponiveis = useMemo(() => {
    const conjunto = new Set();
    produtos.forEach((prod) => {
      (prod.variacoes || []).forEach((v) => {
        if (v.cor && v.cor.trim()) conjunto.add(v.cor.trim());
      });
    });
    return Array.from(conjunto);
  }, [produtos]);

  // Processa e filtra produtos e suas variações
  const produtosProcessados = useMemo(() => {
    const termoNorm = normalizarBusca(busca);

    return produtos
      .filter((produto) => {
        if (!termoNorm) return true;
        const nomeNorm = normalizarBusca(produto.nome);
        const catNorm  = normalizarBusca(produto.categoria?.nome);
        const devNorm  = normalizarBusca(produto.devocao?.nome);
        const modNorm  = normalizarBusca(produto.modelo);
        if (nomeNorm.includes(termoNorm) || catNorm.includes(termoNorm) || devNorm.includes(termoNorm) || modNorm.includes(termoNorm)) {
          return true;
        }
        return (produto.variacoes || []).some((v) =>
          normalizarBusca(v.cor).includes(termoNorm) ||
          normalizarBusca(v.tamanho).includes(termoNorm)
        );
      })
      .map((produto) => {
        const vars = (produto.variacoes || []).filter((v) => {
          if (modeloFiltro !== 'todos' && (v.modelo || 'Regular Fit') !== modeloFiltro) {
            return false;
          }
          if (tamanhoFiltro && v.tamanho !== tamanhoFiltro) {
            return false;
          }
          if (corFiltro && (v.cor || '').toLowerCase() !== corFiltro.toLowerCase()) {
            return false;
          }
          return true;
        });

        const ordenadas = [...vars].sort((a, b) => {
          if (ordenacaoEstoque === 'tamanho_padrao') {
            const idxA = OPCOES_TAMANHO.indexOf(a.tamanho);
            const idxB = OPCOES_TAMANHO.indexOf(b.tamanho);
            const posA = idxA === -1 ? 999 : idxA;
            const posB = idxB === -1 ? 999 : idxB;
            if (posA !== posB) return posA - posB;
            return (a.cor || '').localeCompare(b.cor || '');
          }
          if (ordenacaoEstoque === 'estoque_desc') {
            const valA = edicoes[a.id] !== undefined ? edicoes[a.id] : a.estoque;
            const valB = edicoes[b.id] !== undefined ? edicoes[b.id] : b.estoque;
            if (valB !== valA) return valB - valA;
            const idxA = OPCOES_TAMANHO.indexOf(a.tamanho);
            const idxB = OPCOES_TAMANHO.indexOf(b.tamanho);
            return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
          }
          if (ordenacaoEstoque === 'estoque_asc') {
            const valA = edicoes[a.id] !== undefined ? edicoes[a.id] : a.estoque;
            const valB = edicoes[b.id] !== undefined ? edicoes[b.id] : b.estoque;
            if (valA !== valB) return valA - valB;
            const idxA = OPCOES_TAMANHO.indexOf(a.tamanho);
            const idxB = OPCOES_TAMANHO.indexOf(b.tamanho);
            return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
          }
          if (ordenacaoEstoque === 'cor_asc') {
            const comp = (a.cor || '').localeCompare(b.cor || '');
            if (comp !== 0) return comp;
            const idxA = OPCOES_TAMANHO.indexOf(a.tamanho);
            const idxB = OPCOES_TAMANHO.indexOf(b.tamanho);
            return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
          }
          return 0;
        });

        return {
          ...produto,
          variacoesExibidas: ordenadas,
        };
      })
      .filter((prod) => {
        const temFiltroAtivo = modeloFiltro !== 'todos' || tamanhoFiltro !== '' || corFiltro !== '';
        return temFiltroAtivo ? prod.variacoesExibidas.length > 0 : true;
      });
  }, [produtos, busca, modeloFiltro, tamanhoFiltro, corFiltro, ordenacaoEstoque, edicoes]);

  const temFiltroVariacaoAtivo =
    modeloFiltro !== 'todos' || tamanhoFiltro !== '' || corFiltro !== '' || ordenacaoEstoque !== 'tamanho_padrao';

  const limparFiltrosVariacao = () => {
    setModeloFiltro('todos');
    setTamanhoFiltro('');
    setCorFiltro('');
    setOrdenacaoEstoque('tamanho_padrao');
  };

  return (
    <div className="admin-page" style={{ maxWidth: '1200px' }}>
      {/* ── Topo do Painel de Estoque ── */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">Gestão de Estoque</h1>
          <p style={{ color: '#777', fontSize: '14px', marginTop: '4px' }}>
            Controle ágil de quantidades por variação (tamanho e cor) com alertas de reposição.
          </p>
        </div>
      </div>

      {/* ── Cards de Indicadores Rápidos ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div style={{ background: '#fff', padding: '18px 20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #eee' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', fontWeight: 600 }}>Total de Peças</span>
          <p style={{ fontSize: '26px', fontWeight: 700, color: '#111', marginTop: '6px' }}>{resumo.total_pecas}</p>
        </div>

        <div style={{ background: '#fff', padding: '18px 20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #eee' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', fontWeight: 600 }}>Variações Cadastradas</span>
          <p style={{ fontSize: '26px', fontWeight: 700, color: '#111', marginTop: '6px' }}>{resumo.total_variacoes}</p>
        </div>

        <div
          onClick={() => setFiltro(filtro === 'critico' ? '' : 'critico')}
          style={{
            background: filtro === 'critico' ? '#fff5f5' : '#fff',
            padding: '18px 20px',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            border: filtro === 'critico' ? '1.5px solid #e74c3c' : '1px solid #fecaca',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          title="Clique para filtrar apenas itens com estoque crítico (<= 5)"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c0392b', fontWeight: 600 }}>Itens Críticos (≤ 5)</span>
            <span style={{ fontSize: '11px', background: '#ffe4e6', color: '#e11d48', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>Atenção</span>
          </div>
          <p style={{ fontSize: '26px', fontWeight: 700, color: '#e11d48', marginTop: '6px' }}>{resumo.total_criticos}</p>
        </div>

        <div
          onClick={() => setFiltro(filtro === 'esgotado' ? '' : 'esgotado')}
          style={{
            background: filtro === 'esgotado' ? '#fbfbfb' : '#fff',
            padding: '18px 20px',
            borderRadius: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            border: filtro === 'esgotado' ? '1.5px solid #111' : '1px solid #eee',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          title="Clique para filtrar produtos esgotados (0 un)"
        >
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#888', fontWeight: 600 }}>Esgotados</span>
          <p style={{ fontSize: '26px', fontWeight: 700, color: '#444', marginTop: '6px' }}>{resumo.total_esgotados}</p>
        </div>
      </div>

      {/* ── Alertas de Feedback ── */}
      {feedback.texto && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontWeight: 600,
          fontSize: '14px',
          background: feedback.tipo === 'sucesso' ? '#dcfce7' : '#fee2e2',
          color: feedback.tipo === 'sucesso' ? '#15803d' : '#b91c1c',
          border: `1px solid ${feedback.tipo === 'sucesso' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {feedback.texto}
        </div>
      )}

      {/* ── Barra de Filtros Principais ── */}
      <div style={{
        background: '#fff',
        padding: '16px 20px',
        borderRadius: '10px',
        border: '1px solid #eaeaea',
        marginBottom: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}>
        {/* Linha 1: Busca e Status */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}>
          <div style={{ flex: '1', minWidth: '240px', position: 'relative' }}>
            <input
              type="search"
              placeholder="Buscar por produto ou categoria..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setFiltro('')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: filtro === '' ? '1.5px solid #111' : '1px solid #ddd',
                background: filtro === '' ? '#111' : '#fff',
                color: filtro === '' ? '#fff' : '#444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFiltro('critico')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: filtro === 'critico' ? '1.5px solid #e11d48' : '1px solid #ddd',
                background: filtro === 'critico' ? '#ffe4e6' : '#fff',
                color: filtro === 'critico' ? '#be123c' : '#444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Estoque Crítico (≤ 5)
            </button>
            <button
              type="button"
              onClick={() => setFiltro('esgotado')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: filtro === 'esgotado' ? '1.5px solid #64748b' : '1px solid #ddd',
                background: filtro === 'esgotado' ? '#f1f5f9' : '#fff',
                color: filtro === 'esgotado' ? '#334155' : '#444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Esgotados
            </button>
            <button
              type="button"
              onClick={() => setFiltro('normal')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: filtro === 'normal' ? '1.5px solid #16a34a' : '1px solid #ddd',
                background: filtro === 'normal' ? '#dcfce7' : '#fff',
                color: filtro === 'normal' ? '#15803d' : '#444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Estoque Normal
            </button>
          </div>
        </div>

        {/* Linha 2: Separação de Modelos e Filtros de Variação (Tamanho, Cor, Ordenação) */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #f1f5f9',
        }}>
          {/* Abas de Modelos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>
              Modelo:
            </span>
            <button
              type="button"
              onClick={() => setModeloFiltro('todos')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: modeloFiltro === 'todos' ? '1.5px solid #1e1e1e' : '1px solid #cbd5e1',
                background: modeloFiltro === 'todos' ? '#1e1e1e' : '#fff',
                color: modeloFiltro === 'todos' ? '#fff' : '#475569',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Todos os Modelos
            </button>
            <button
              type="button"
              onClick={() => setModeloFiltro('Regular Fit')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: modeloFiltro === 'Regular Fit' ? '1.5px solid #1e1e1e' : '1px solid #cbd5e1',
                background: modeloFiltro === 'Regular Fit' ? '#1e1e1e' : '#fff',
                color: modeloFiltro === 'Regular Fit' ? '#fff' : '#475569',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Regular Fit
            </button>
            <button
              type="button"
              onClick={() => setModeloFiltro('Oversized')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: modeloFiltro === 'Oversized' ? '1.5px solid #1e1e1e' : '1px solid #cbd5e1',
                background: modeloFiltro === 'Oversized' ? '#1e1e1e' : '#fff',
                color: modeloFiltro === 'Oversized' ? '#fff' : '#475569',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Oversized
            </button>
          </div>

          {/* Filtros de Variação (Tamanho, Cor, Ordenar) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Tamanho */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Tamanho:
              </span>
              <select
                value={tamanhoFiltro}
                onChange={(e) => setTamanhoFiltro(e.target.value)}
                style={{
                  padding: '5px 8px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: '12px',
                  color: '#1e293b',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value="">Todos</option>
                {OPCOES_TAMANHO.map((tam) => (
                  <option key={tam} value={tam}>{tam}</option>
                ))}
              </select>
            </div>

            {/* Cor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Cor:
              </span>
              <select
                value={corFiltro}
                onChange={(e) => setCorFiltro(e.target.value)}
                style={{
                  padding: '5px 8px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: '12px',
                  color: '#1e293b',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value="">Todas</option>
                {coresDisponiveis.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Ordenar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Ordenar:
              </span>
              <select
                value={ordenacaoEstoque}
                onChange={(e) => setOrdenacaoEstoque(e.target.value)}
                style={{
                  padding: '5px 8px',
                  borderRadius: '5px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: '12px',
                  color: '#1e293b',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value="tamanho_padrao">Tamanho (PP → G2)</option>
                <option value="estoque_desc">Mais estoque</option>
                <option value="estoque_asc">Menos estoque</option>
                <option value="cor_asc">Cor (A-Z)</option>
              </select>
            </div>

            {temFiltroVariacaoAtivo && (
              <button
                type="button"
                onClick={limparFiltrosVariacao}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '4px 6px',
                }}
              >
                ✕ Limpar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Lista de Produtos e Variações ── */}
      {loading ? (
        <div style={{ padding: '60px 20px' }}>
          <LoadingSpinner size="md" />
        </div>
      ) : produtosProcessados.length === 0 ? (
        <div style={{ background: '#fff', padding: '50px 20px', textAlign: 'center', borderRadius: '12px', border: '1px solid #eee' }}>
          <p style={{ color: '#666', fontSize: '15px' }}>Nenhum produto encontrado com os filtros selecionados.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {produtosProcessados.map((produto) => {
            const totalEstoqueProd = (produto.variacoesExibidas || []).reduce((acc, v) => {
              const val = edicoes[v.id] !== undefined ? edicoes[v.id] : v.estoque;
              return acc + (val || 0);
            }, 0);
            const totalEstoqueGeral = (produto.variacoes || []).reduce((acc, v) => {
              const val = edicoes[v.id] !== undefined ? edicoes[v.id] : v.estoque;
              return acc + (val || 0);
            }, 0);
            const temCritico = (produto.variacoes || []).some((v) => v.estoque <= 5);
            const temModelosMultiplos = (produto.variacoes || []).some((v) => v.modelo === 'Oversized') && (produto.variacoes || []).some((v) => (v.modelo || 'Regular Fit') === 'Regular Fit');

            return (
              <div
                key={produto.id}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  border: temCritico ? '1px solid #fecaca' : '1px solid #e5e7eb',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                }}
              >
                {/* Cabeçalho do Produto */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: temCritico ? '#fffaf8' : '#fafafa',
                  borderBottom: '1px solid #eee',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {produto.imagem_url ? (
                      <img
                        src={produto.imagem_url}
                        alt={produto.nome}
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #eee' }}
                      />
                    ) : (
                      <div style={{ width: '48px', height: '48px', background: '#e2e8f0', borderRadius: '6px' }} />
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#111', margin: 0 }}>
                          {produto.nome}
                        </h3>
                        {temModelosMultiplos && (
                          <span style={{
                            background: '#e2e8f0',
                            color: '#334155',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}>
                            Regular & Oversized
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '12px', color: '#666' }}>
                        {produto.categoria?.nome || 'Sem categoria'} · {produto.devocao?.nome || 'Devoção'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#888', fontWeight: 600 }}>
                        {temFiltroVariacaoAtivo || filtro ? 'Total no Filtro' : 'Total do Produto'}
                      </span>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: '#111', margin: 0 }}>
                        {temFiltroVariacaoAtivo || filtro ? (
                          <>
                            {totalEstoqueProd} un{' '}
                            <span style={{ fontSize: '11px', color: '#777', fontWeight: 400 }}>
                              ({(produto.variacoesExibidas || []).length} de {(produto.variacoes || []).length} var.)
                            </span>
                          </>
                        ) : (
                          `${totalEstoqueGeral} un`
                        )}
                      </p>
                    </div>

                    {temCritico && (filtro === '' || filtro === 'critico') && (
                      <span style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '6px',
                      }}>
                        Atenção no estoque
                      </span>
                    )}
                  </div>
                </div>

                {/* Tabela de Variações */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', tableLayout: 'fixed' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', color: '#64748b', borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                        <th style={{ width: '16%', padding: '14px 16px', textAlign: 'center' }}>Modelo</th>
                        <th style={{ width: '12%', padding: '14px 16px', textAlign: 'center' }}>Tamanho</th>
                        <th style={{ width: '20%', padding: '14px 16px', textAlign: 'center' }}>Cor</th>
                        <th style={{ width: '16%', padding: '14px 16px', textAlign: 'center' }}>Nível</th>
                        <th style={{ width: '22%', padding: '14px 16px', textAlign: 'center' }}>Quantidade em Estoque</th>
                        <th style={{ width: '14%', padding: '14px 16px', textAlign: 'center' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(produto.variacoesExibidas || []).map((variacao) => {
                        const valorAtual = edicoes[variacao.id] !== undefined ? edicoes[variacao.id] : variacao.estoque;
                        const modificado = valorAtual !== variacao.estoque;
                        const salvando = salvandoId === variacao.id;

                        let statusBadge = (
                          <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                            Normal
                          </span>
                        );
                        if (variacao.estoque === 0) {
                          statusBadge = (
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                              Esgotado
                            </span>
                          );
                        } else if (variacao.estoque <= 5) {
                          statusBadge = (
                            <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                              Crítico ({variacao.estoque} un)
                            </span>
                          );
                        }

                        return (
                          <tr key={variacao.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                background: variacao.modelo === 'Oversized' ? '#1e1e1e' : '#f1f5f9',
                                color: variacao.modelo === 'Oversized' ? '#fff' : '#334155',
                              }}>
                                {variacao.modelo || 'Regular Fit'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1e293b', textAlign: 'center' }}>
                              {variacao.tamanho || 'Único'}
                            </td>
                            <td style={{ padding: '14px 16px', color: '#475569', textAlign: 'center' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <span style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  background: getHexCor(variacao.cor),
                                  border: '1px solid rgba(0,0,0,0.15)',
                                  flexShrink: 0,
                                }} />
                                {variacao.cor || 'Padrão'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              {statusBadge}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleAjusteRapido(variacao.id, -1)}
                                  disabled={salvando || valorAtual <= 0}
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '5px',
                                    border: '1px solid #cbd5e1',
                                    background: '#fff',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '15px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  className="estoque-number-input"
                                  value={valorAtual}
                                  onChange={(e) => handleInputChange(variacao.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') salvarEstoque(variacao.id, variacao.estoque);
                                  }}
                                  style={{
                                    border: modificado ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                                    background: modificado ? '#fffbeb' : '#fff',
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAjusteRapido(variacao.id, 1)}
                                  disabled={salvando}
                                  style={{
                                    width: '30px',
                                    height: '30px',
                                    borderRadius: '5px',
                                    border: '1px solid #cbd5e1',
                                    background: '#fff',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '15px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => salvarEstoque(variacao.id, variacao.estoque)}
                                disabled={!modificado || salvando}
                                style={{
                                  padding: '7px 18px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: modificado && !salvando ? 'pointer' : 'default',
                                  border: 'none',
                                  background: modificado ? '#1e1e1e' : '#f1f5f9',
                                  color: modificado ? '#fff' : '#94a3b8',
                                  transition: 'background 0.2s',
                                  minWidth: '76px',
                                }}
                              >
                                {salvando ? 'Salvando...' : 'Salvar'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
