import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  obterNotificacoesAdmin,
  marcarNotificacaoLidaAdmin,
  marcarTodasLidasAdmin,
  removerNotificacaoAdmin,
  limparTodasAdmin,
} from '../services/notificacaoService';
import logo from '../assets/logo.webp';
import '../styles/admin-layout.css';

// ── Ícones SVG inline ──────────────────────────────────────────────────────
const IconHome = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
);

const IconOrders = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

const IconCatalog = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const IconTag = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

const IconStock = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const IconReturn = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
  </svg>
);

const IconReports = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="14"/>
  </svg>
);

const IconSettings = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const IconStar = () => (
  <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const IconSearch = () => (
  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconBell = () => (
  <svg width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

// ── Links de navegação ────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: 'Início',                  to: '/admin',           icon: <IconHome />,     end: true  },
  { label: 'Pedidos e Pagamentos',    to: '/admin/pedidos',   icon: <IconOrders />,   end: false },
  { label: 'Devoluções e Trocas',     to: '/admin/devolucoes',icon: <IconReturn />,   end: false },
  { label: 'Catálogo de Produtos',    to: '/admin/produtos',  icon: <IconCatalog />,  end: false },
  { label: 'Categorias e Devoções',   to: '/admin/categorias',icon: <IconTag />,      end: false },
  { label: 'Gestão de Estoque',       to: '/admin/estoque',   icon: <IconStock />,    end: false },
  { label: 'Avaliações de Clientes',  to: '/admin/avaliacoes',icon: <IconStar />,     end: false },
  { label: 'Relatórios/Faturamento',  to: '/admin/relatorios',icon: <IconReports />,  end: false },
  { label: 'Configurações',           to: '/admin/config',    icon: <IconSettings />, end: false },
];

// ── Inicial do avatar ─────────────────────────────────────────────────────────
function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Contadores
  const [novosPedidosCount, setNovosPedidosCount] = useState(0);
  const [devolucoesPendentesCount, setDevolucoesPendentesCount] = useState(0);
  const [estoqueBaixoCount, setEstoqueBaixoCount] = useState(0);

  // Notificações do Admin
  const [notificacoesAdmin, setNotificacoesAdmin] = useState([]);
  const [totalNaoLidasAdmin, setTotalNaoLidasAdmin] = useState(0);
  const [dropdownNotifAdminAberto, setDropdownNotifAdminAberto] = useState(false);
  const notifAdminRef = useRef(null);

  // Busca Universal do Admin com Autocomplete em Tempo Real
  const [termoBuscaAdmin, setTermoBuscaAdmin] = useState('');
  const [sugestoesAdminAbertas, setSugestoesAdminAbertas] = useState(false);
  const [produtosAdminList, setProdutosAdminList] = useState([]);
  const searchAdminRef = useRef(null);

  useEffect(() => {
    api.get('/produtos')
      .then((res) => {
        setProdutosAdminList(Array.isArray(res.data) ? res.data : (res.data?.data || []));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchAdminRef.current && !searchAdminRef.current.contains(e.target)) {
        setSugestoesAdminAbertas(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const sugestoesAdmin = useMemo(() => {
    const q = (termoBuscaAdmin || '').trim().toLowerCase();
    if (!q) return [];

    const resultados = [];

    // 1. Abas de Configurações
    const abasConfig = [
      { id: 'loja', titulo: 'Configurações: Identidade da Loja', sub: 'Nome da loja e slogan', rota: '/admin/config?aba=loja', termos: ['loja', 'nome', 'slogan', 'identidade', 'configuracao', 'config'] },
      { id: 'carrossel', titulo: 'Configurações: Carrossel da Vitrine', sub: 'Banners rotativos e destaques', rota: '/admin/config?aba=carrossel', termos: ['carrossel', 'banner', 'slides', 'vitrine', 'destaque'] },
      { id: 'frete', titulo: 'Configurações: Frete & Banner de Topo', sub: 'CEP de origem, frete grátis e Melhor Envio', rota: '/admin/config?aba=frete', termos: ['frete', 'melhor envio', 'cep', 'envio', 'banner topo', 'aviso', 'gratis'] },
      { id: 'pagamento', titulo: 'Configurações: Pagamentos & PIX', sub: 'Mercado Pago, chaves PIX e parcelamento', rota: '/admin/config?aba=pagamento', termos: ['pagamento', 'pix', 'cartao', 'mercado pago', 'chave pix', 'parcelas', 'juros'] },
      { id: 'cupons', titulo: 'Configurações: Cupons de Desconto', sub: 'Criar e gerenciar cupons promocionais', rota: '/admin/config?aba=cupons', termos: ['cupom', 'cupons', 'desconto', 'promocao'] },
      { id: 'contato', titulo: 'Configurações: Atendimento & Contato', sub: 'WhatsApp, telefone, e-mail e redes', rota: '/admin/config?aba=contato', termos: ['contato', 'whatsapp', 'email', 'telefone', 'endereco', 'instagram', 'atendimento', 'suporte'] },
    ];

    abasConfig.forEach((aba) => {
      if (
        aba.titulo.toLowerCase().includes(q) ||
        aba.sub.toLowerCase().includes(q) ||
        aba.termos.some((t) => t.includes(q) || q.includes(t))
      ) {
        resultados.push({
          tipo: 'Configurações',
          titulo: aba.titulo,
          sub: aba.sub,
          rota: aba.rota,
          icone: '⚙️',
        });
      }
    });

    // 2. Módulos do Painel Admin
    const secoesAdmin = [
      { titulo: 'Pedidos, Pagamentos e Entregas', sub: 'Gerenciar vendas, rastreamento e etiquetas', rota: '/admin/pedidos', termos: ['pedido', 'pedidos', 'vendas', 'pagamento', 'rastreio', 'correios', 'etiqueta', 'entrega'] },
      { titulo: 'Devoluções e Trocas', sub: 'Gerenciar solicitações de devolução e reembolsos', rota: '/admin/devolucoes', termos: ['devolucao', 'devolução', 'devolucoes', 'devoluções', 'troca', 'trocas', 'reembolso', 'estorno'] },
      { titulo: 'Catálogo de Produtos', sub: 'Listagem e edição de todos os produtos', rota: '/admin/produtos', termos: ['produto', 'produtos', 'catalogo', 'catálogo', 'itens'] },
      { titulo: 'Cadastrar Novo Produto', sub: 'Adicionar nova camiseta ao catálogo', rota: '/admin/produtos/novo', termos: ['novo produto', 'cadastrar produto', 'adicionar produto', 'criar produto'] },
      { titulo: 'Categorias e Devoções', sub: 'Gerenciar categorias e santos', rota: '/admin/categorias', termos: ['categoria', 'categorias', 'devocao', 'devoção', 'devocoes', 'santos'] },
      { titulo: 'Gestão de Estoque', sub: 'Grade de tamanhos e controle de unidades', rota: '/admin/estoque', termos: ['estoque', 'grade', 'unidades', 'quantidade', 'reposicao'] },
      { titulo: 'Avaliações de Clientes', sub: 'Moderar avaliações e comentários recebidos', rota: '/admin/avaliacoes', termos: ['avaliacao', 'avaliações', 'avaliacoes', 'reviews', 'comentarios', 'estrelas'] },
      { titulo: 'Relatórios & Faturamento', sub: 'Faturamento, métricas e ranking de vendas', rota: '/admin/relatorios', termos: ['relatorio', 'relatórios', 'faturamento', 'metricas', 'graficos', 'vendas'] },
      { titulo: 'Início / Dashboard', sub: 'Visão geral da loja', rota: '/admin', termos: ['inicio', 'dashboard', 'painel'] },
    ];

    secoesAdmin.forEach((sec) => {
      if (
        sec.titulo.toLowerCase().includes(q) ||
        sec.sub.toLowerCase().includes(q) ||
        sec.termos.some((t) => t.includes(q) || q.includes(t))
      ) {
        resultados.push({
          tipo: 'Painel Admin',
          titulo: sec.titulo,
          sub: sec.sub,
          rota: sec.rota,
          icone: '📁',
        });
      }
    });

    // 3. ID de Pedido
    const matchId = q.match(/^#?(\d+)$/);
    if (matchId) {
      resultados.unshift({
        tipo: 'Pedido Específico',
        titulo: `Ver Pedido #${matchId[1]}`,
        sub: `Acessar detalhes e entrega do pedido #${matchId[1]}`,
        rota: `/admin/pedidos?busca=${matchId[1]}`,
        icone: '📦',
      });
    }

    // 4. Produtos do catálogo
    produtosAdminList.forEach((prod) => {
      if (prod.nome?.toLowerCase().includes(q)) {
        resultados.push({
          tipo: 'Produto',
          titulo: prod.nome,
          sub: `Editar produto · ${Number(prod.preco_base || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
          rota: `/admin/produtos/editar/${prod.id}`,
          icone: '👕',
          imagem: prod.imagem_url,
        });
      }
    });

    // 5. Fallbacks úteis de busca
    if (!resultados.some((r) => r.rota.startsWith('/admin/pedidos'))) {
      resultados.push({
        tipo: 'Buscar em Pedidos',
        titulo: `Buscar "${termoBuscaAdmin}" em Pedidos`,
        sub: 'Filtrar pedidos por cliente, e-mail ou código',
        rota: `/admin/pedidos?busca=${encodeURIComponent(termoBuscaAdmin)}`,
        icone: '🔍',
      });
    }
    if (!resultados.some((r) => r.rota.startsWith('/admin/produtos'))) {
      resultados.push({
        tipo: 'Buscar em Produtos',
        titulo: `Buscar "${termoBuscaAdmin}" no Catálogo`,
        sub: 'Pesquisar produtos com este termo',
        rota: `/admin/produtos?busca=${encodeURIComponent(termoBuscaAdmin)}`,
        icone: '🔍',
      });
    }

    return resultados.slice(0, 8);
  }, [termoBuscaAdmin, produtosAdminList]);

  const handleExecutarNavegacaoAdmin = (rota) => {
    setSugestoesAdminAbertas(false);
    setTermoBuscaAdmin('');
    navigate(rota);
  };

  const handleBuscarAdmin = (e) => {
    e.preventDefault();
    if (sugestoesAdmin.length > 0) {
      handleExecutarNavegacaoAdmin(sugestoesAdmin[0].rota);
      return;
    }
    const termo = (termoBuscaAdmin || '').trim();
    if (!termo) return;
    navigate(`/admin/pedidos?busca=${encodeURIComponent(termo)}`);
  };

  // Proteção contra acesso por usuários que não são admin
  if (user && user.papel !== 'admin') {
    return <Navigate to="/login?admin=1" replace />;
  }

  const carregarDadosAdmin = () => {
    obterNotificacoesAdmin()
      .then(({ data }) => {
        setNotificacoesAdmin(data.notificacoes || []);
        setTotalNaoLidasAdmin(Number(data.total_nao_lidas || 0));
        setEstoqueBaixoCount(Number(data.estoque_baixo_count || 0));
        setDevolucoesPendentesCount(Number(data.devolucoes_pendentes_count || 0));
        setNovosPedidosCount(Number(data.novos_pedidos_count || 0));
      })
      .catch(() => {});
  };

  useEffect(() => {
    carregarDadosAdmin();
    const timer = setInterval(carregarDadosAdmin, 15000); // atualiza a cada 15s
    window.addEventListener('salv-pedidos-atualizados', carregarDadosAdmin);
    return () => {
      clearInterval(timer);
      window.removeEventListener('salv-pedidos-atualizados', carregarDadosAdmin);
    };
  }, []);

  // Fechar dropdown de notificações ao clicar fora
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifAdminRef.current && !notifAdminRef.current.contains(e.target)) {
        setDropdownNotifAdminAberto(false);
      }
    };
    if (dropdownNotifAdminAberto) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownNotifAdminAberto]);

  const handleMarcarLida = async (n) => {
    try {
      if (!n.lida) {
        const { data } = await marcarNotificacaoLidaAdmin(n.id);
        setNotificacoesAdmin((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, lida: true } : item))
        );
        setTotalNaoLidasAdmin(Number(data.total_nao_lidas || 0));
        setEstoqueBaixoCount(Number(data.estoque_baixo_count || 0));
      }
      if (n.link) {
        setDropdownNotifAdminAberto(false);
        navigate(n.link);
      }
    } catch {}
  };

  const handleMarcarTodasLidas = async () => {
    try {
      const { data } = await marcarTodasLidasAdmin();
      setNotificacoesAdmin((prev) => prev.map((item) => ({ ...item, lida: true })));
      setTotalNaoLidasAdmin(0);
      setEstoqueBaixoCount(Number(data.estoque_baixo_count || 0));
    } catch {}
  };

  const handleLimparTodas = async () => {
    try {
      const { data } = await limparTodasAdmin();
      setNotificacoesAdmin([]);
      setTotalNaoLidasAdmin(0);
      setEstoqueBaixoCount(0);
    } catch {}
  };

  const handleRemoverNotificacao = async (e, id) => {
    e.stopPropagation();
    try {
      const { data } = await removerNotificacaoAdmin(id);
      setNotificacoesAdmin((prev) => prev.filter((item) => item.id !== id));
      setTotalNaoLidasAdmin(Number(data.total_nao_lidas || 0));
      setEstoqueBaixoCount(Number(data.estoque_baixo_count || 0));
    } catch {}
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="al-root">
      {/* ════════════════════════════════════
          SIDEBAR
          ════════════════════════════════════ */}
      <aside className="al-sidebar">

        {/* Logo */}
        <Link to="/admin" className="al-logo" title="Ir para o início do painel">
          <img src={logo} alt="Salv Sacra" />
        </Link>

        {/* Navegação */}
        <nav className="al-nav" aria-label="Menu principal">
          <div className="al-nav-section">
            {NAV_ITEMS.map(({ label, to, icon, end }) => {
              const isPedidos = to === '/admin/pedidos';
              const isDevolucoes = to === '/admin/devolucoes';
              const isEstoque = to === '/admin/estoque';

              const badgeCount = isPedidos
                ? novosPedidosCount
                : isDevolucoes
                ? devolucoesPendentesCount
                : isEstoque
                ? estoqueBaixoCount
                : 0;

              const badgeTitle = isPedidos
                ? `${novosPedidosCount} novo(s) pedido(s)`
                : isDevolucoes
                ? `${devolucoesPendentesCount} solicitação(ões) de devolução pendente(s)`
                : isEstoque
                ? `${estoqueBaixoCount} item(ns) com alerta de estoque baixo`
                : '';

              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `al-nav-link${isActive ? ' active' : ''}`
                  }
                >
                  {icon}
                  <span style={{ flex: 1 }}>{label}</span>
                  {badgeCount > 0 && (
                    <span
                      style={{
                        background: '#dc2626',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '999px',
                        lineHeight: 1,
                        boxShadow: '0 2px 5px rgba(220, 38, 38, 0.4)',
                        textTransform: 'uppercase',
                      }}
                      title={badgeTitle}
                    >
                      {badgeCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Rodapé — botão sair */}
        <div className="al-sidebar-footer">
          <button className="al-logout-btn" onClick={handleSignOut} title="Encerrar sessão">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════
          COLUNA DIREITA
          ════════════════════════════════════ */}
      <div className="al-main-col">

        {/* TOP BAR */}
        <header className="al-topbar">

          {/* Busca Universal */}
          <div ref={searchAdminRef} className="al-search" style={{ position: 'relative' }}>
            <form onSubmit={handleBuscarAdmin} style={{ display: 'flex', width: '100%', position: 'relative' }}>
              <IconSearch />
              <input
                type="search"
                placeholder="Buscar produtos, pedidos, configurações..."
                aria-label="Buscar"
                value={termoBuscaAdmin}
                onFocus={() => { if (termoBuscaAdmin.trim()) setSugestoesAdminAbertas(true); }}
                onChange={(e) => {
                  setTermoBuscaAdmin(e.target.value);
                  setSugestoesAdminAbertas(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSugestoesAdminAbertas(false);
                }}
              />
            </form>

            {/* Dropdown de Sugestões em Tempo Real */}
            {sugestoesAdminAbertas && sugestoesAdmin.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  width: '100%',
                  background: '#1e1e1e',
                  borderRadius: '8px',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
                  border: '1px solid #333333',
                  overflow: 'hidden',
                  zIndex: 1000,
                  maxHeight: '380px',
                  overflowY: 'auto',
                }}
              >
                <div style={{ padding: '8px 12px', background: '#252525', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#c5a880', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Sugestões (Enter para navegar à 1ª opção)
                  </span>
                  <span style={{ fontSize: '11px', color: '#888' }}>
                    {sugestoesAdmin.length} resultado(s)
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {sugestoesAdmin.map((sug, idx) => (
                    <button
                      key={`${sug.rota}-${idx}`}
                      type="button"
                      onClick={() => handleExecutarNavegacaoAdmin(sug.rota)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        background: idx === 0 ? 'rgba(197, 168, 128, 0.1)' : 'transparent',
                        border: 'none',
                        borderBottom: idx < sugestoesAdmin.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                        color: '#f3f4f6',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#2c2c2c'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = idx === 0 ? 'rgba(197, 168, 128, 0.1)' : 'transparent'; }}
                    >
                      {sug.imagem ? (
                        <img
                          src={sug.imagem}
                          alt=""
                          style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                        />
                      ) : (
                        <span style={{ fontSize: '18px', width: '28px', textAlign: 'center', flexShrink: 0 }}>
                          {sug.icone}
                        </span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sug.titulo}
                          </span>
                          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#333', color: '#c5a880', fontWeight: 700, flexShrink: 0 }}>
                            {sug.tipo}
                          </span>
                        </div>
                        {sug.sub && (
                          <div style={{ fontSize: '11.5px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                            {sug.sub}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ações do Topo: Sino do Admin + Perfil (alinhados à direita) */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>

            {/* Sino de Notificações do Administrador (ao lado esquerdo do perfil) */}
            <div ref={notifAdminRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setDropdownNotifAdminAberto((prev) => !prev)}
                aria-label="Notificações do Administrador"
                title={totalNaoLidasAdmin > 0 ? `${totalNaoLidasAdmin} nova(s) notificação(ões)` : 'Notificações'}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#d4ccc0',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '7px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#d4ccc0'; e.currentTarget.style.background = 'none'; }}
              >
                <IconBell />
                {totalNaoLidasAdmin > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '0px',
                      right: '0px',
                      background: '#dc2626',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 5px',
                      borderRadius: '999px',
                      lineHeight: 1,
                      minWidth: '16px',
                      textAlign: 'center',
                      boxShadow: '0 2px 6px rgba(220,38,38,0.45)',
                    }}
                  >
                    {totalNaoLidasAdmin}
                  </span>
                )}
              </button>

              {/* Dropdown de Notificações do Administrador */}
              {dropdownNotifAdminAberto && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 12px)',
                    right: 0,
                    width: '380px',
                    maxWidth: '92vw',
                    background: '#ffffff',
                    borderRadius: '10px',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
                    border: '1px solid #e2e8f0',
                    zIndex: 9999,
                    overflow: 'hidden',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      padding: '14px 18px',
                      background: '#0f172a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>🔔</span>
                      <strong style={{ fontSize: '13px', letterSpacing: '0.3px' }}>Notificações da Loja</strong>
                      {totalNaoLidasAdmin > 0 && (
                        <span
                          style={{
                            background: '#dc2626',
                            fontSize: '11px',
                            padding: '1px 7px',
                            borderRadius: '10px',
                            fontWeight: 800,
                          }}
                        >
                          {totalNaoLidasAdmin} nova(s)
                        </span>
                      )}
                    </div>
                    {notificacoesAdmin.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={handleMarcarTodasLidas}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            fontSize: '11px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: 0,
                          }}
                        >
                          Marcar lidas
                        </button>
                        <span style={{ color: '#475569', fontSize: '11px' }}>•</span>
                        <button
                          type="button"
                          onClick={handleLimparTodas}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#f87171',
                            fontSize: '11px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: 0,
                          }}
                        >
                          Apagar todas
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {notificacoesAdmin.length === 0 ? (
                      <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                        <span style={{ fontSize: '26px', display: 'block', marginBottom: '8px' }}>🔔</span>
                        Nenhuma notificação no momento.
                      </div>
                    ) : (
                      notificacoesAdmin.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleMarcarLida(n)}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #f1f5f9',
                            background: n.lida ? '#ffffff' : '#fefce8',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = n.lida ? '#ffffff' : '#fefce8'; }}
                        >
                          <span style={{ fontSize: '18px', lineHeight: 1, marginTop: '2px' }}>
                            {n.categoria === 'devolucao' ? '🔄' : n.categoria === 'estoque' ? '⚠️' : '📦'}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{n.titulo}</strong>
                              {!n.lida && (
                                <span style={{ width: '8px', height: '8px', background: '#eab308', borderRadius: '50%', flexShrink: 0 }} />
                              )}
                            </div>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                              {n.mensagem}
                            </p>
                            <span style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
                              {new Date(n.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleRemoverNotificacao(e, n.id)}
                            title="Remover notificação"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              fontSize: '16px',
                              cursor: 'pointer',
                              padding: '0 4px',
                              lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Perfil */}
            <div className="al-user">
              <div className="al-user-info">
                <span className="al-user-name">{user?.name ?? 'Usuário'}</span>
                <span className="al-user-email">{user?.email ?? ''}</span>
              </div>
              <div className="al-avatar" aria-hidden="true">
                {getInitials(user?.name ?? 'U')}
              </div>
            </div>
          </div>
        </header>

        {/* CONTEÚDO — renderiza o filho da rota aninhada */}
        <main className="al-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
