import { useState, useEffect, useRef, useMemo } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../contexts/CartContext";
import { useAuth } from "../contexts/AuthContext";
import { useWishlist } from "../contexts/WishlistContext";
import { obterResumoConta } from "../services/contaService";
import api from "../services/api";
import {
  obterNotificacoesCliente,
  marcarNotificacaoLidaCliente,
  marcarTodasLidasCliente,
  removerNotificacaoCliente,
  limparTodasCliente,
} from "../services/notificacaoService";
import CarrinhoDrawer from "../components/CarrinhoDrawer";
import { LISTA_BANDEIRAS_RODAPE } from "../components/CardBrandIcon";
import logoImg from "../assets/logo.webp";
import "./MainLayout.css";

/* ── SVG icons inline ────────────────────────────────────── */
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconBell = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
const IconUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconHeart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const IconCart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);
const IconInstagram = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block' }}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);
const IconWhatsapp = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);
const IconPhone = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.67a16 16 0 0 0 6.06 6.06l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const IconMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const IconMapPin = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

/* ── Header ─────────────────────────────────────────────── */
function SiteHeader({ configs }) {
  const { totalItens, openCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { totalFavoritos } = useWishlist();
  const [termoBusca, setTermoBusca] = useState('');
  const [sugestoesClienteAbertas, setSugestoesClienteAbertas] = useState(false);
  const [produtosClienteList, setProdutosClienteList] = useState([]);
  const searchClienteRef = useRef(null);
  const [modalFavoritosLogin, setModalFavoritosLogin] = useState(false);
  const [pedidosPendentesCount, setPedidosPendentesCount] = useState(0);
  const [notificacoes, setNotificacoes] = useState([]);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);
  const [dropdownNotificacoesAberto, setDropdownNotificacoesAberto] = useState(false);
  const notifRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api.get('/produtos')
      .then((res) => {
        setProdutosClienteList(Array.isArray(res.data) ? res.data : (res.data?.data || []));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchClienteRef.current && !searchClienteRef.current.contains(e.target)) {
        setSugestoesClienteAbertas(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const sugestoesCliente = useMemo(() => {
    const q = (termoBusca || '').trim().toLowerCase();
    if (!q) return [];

    const resultados = [];

    // 1. Minha Conta & Páginas Pessoais
    const secoesConta = [
      { titulo: 'Formas de Pagamento (Cartões Salvos)', sub: 'Gerenciar cartões de crédito salvos', rota: '/minha-conta?aba=pagamentos', termos: ['pagamento', 'pagamentos', 'forma de pagamento', 'formas de pagamento', 'cartao', 'cartão', 'cartoes', 'cartões', 'pix'] },
      { titulo: 'Alterar Senha & Segurança', sub: 'Redefinir senha de acesso da sua conta', rota: '/minha-conta?aba=senha', termos: ['senha', 'alterar senha', 'mudar senha', 'trocar senha', 'seguranca', 'segurança', 'redefinir senha'] },
      { titulo: 'Meus Dados Pessoais', sub: 'Nome, CPF, e-mail e telefone cadastrados', rota: '/minha-conta?aba=dados', termos: ['dados', 'dados pessoais', 'perfil', 'cadastro', 'meu perfil', 'nome', 'cpf', 'email', 'telefone'] },
      { titulo: 'Meus Endereços de Entrega', sub: 'Cadastrar ou editar CEP e endereços de envio', rota: '/minha-conta?aba=enderecos', termos: ['endereco', 'endereço', 'enderecos', 'endereços', 'cep', 'local de entrega', 'entrega'] },
      { titulo: 'Meus Pedidos & Rastreamento', sub: 'Acompanhar pedidos e entregas dos Correios', rota: '/minha-conta?aba=pedidos', termos: ['pedido', 'pedidos', 'minhas compras', 'compras', 'rastreio', 'rastreamento', 'status'] },
      { titulo: 'Devoluções, Trocas & Reembolso', sub: 'Solicitar devolução ou troca de produtos', rota: '/minha-conta?aba=pedidos', termos: ['devolucao', 'devolução', 'devolucoes', 'devoluções', 'troca', 'trocas', 'reembolso', 'estorno', 'devolver'] },
      { titulo: 'Lista de Favoritos', sub: 'Peças salvas na sua lista de desejos', rota: '/minha-conta?aba=favoritos', termos: ['favorito', 'favoritos', 'desejo', 'desejos', 'salvos', 'curtidos'] },
    ];

    secoesConta.forEach((sec) => {
      if (
        sec.titulo.toLowerCase().includes(q) ||
        sec.sub.toLowerCase().includes(q) ||
        sec.termos.some((t) => t.includes(q) || q.includes(t))
      ) {
        resultados.push({
          tipo: 'Minha Conta',
          titulo: sec.titulo,
          sub: sec.sub,
          rota: sec.rota,
          icone: '👤',
        });
      }
    });

    // 2. Loja & Institucional
    const secoesLoja = [
      { titulo: 'Meu Carrinho de Compras', sub: 'Ver itens adicionados e finalizar compra', rota: '/carrinho', termos: ['carrinho', 'sacola', 'cesta', 'itens'] },
      { titulo: 'Guia de Medidas & Tamanhos', sub: 'Tabela de tamanhos PP ao G2 (Regular e Oversized)', rota: '/guia-de-medidas', termos: ['guia de medidas', 'medida', 'medidas', 'tamanho', 'tamanhos', 'tabela de medidas', 'proporcoes', 'cm'] },
      { titulo: 'Atendimento ao Cliente & WhatsApp', sub: 'Fale conosco pelo WhatsApp oficial', rota: '/contato', termos: ['contato', 'whatsapp', 'fale conosco', 'suporte', 'ajuda', 'sac', 'atendimento', 'telefone', 'email'] },
      { titulo: 'Quem Somos & Propósito', sub: 'Conheça a história e a missão da Salv Sacra', rota: '/quem-somos', termos: ['quem somos', 'sobre', 'sobre nós', 'historia', 'proposito', 'missao'] },
      { titulo: 'Termos e Condições de Uso', sub: 'Direitos, fretes e condições da loja', rota: '/termos', termos: ['termos', 'condicoes', 'condições', 'politica', 'contrato'] },
      { titulo: 'Política de Privacidade & LGPD', sub: 'Segurança e tratamento dos seus dados', rota: '/privacidade', termos: ['privacidade', 'lgpd', 'dados protegidos', 'segurança dos dados'] },
      { titulo: 'Catálogo de Camisetas', sub: 'Todas as coleções e modelos disponíveis', rota: '/produtos?categoria=camisetas', termos: ['camiseta', 'camisetas', 'roupas', 'tshirt', 't-shirt', 'camisa'] },
      { titulo: 'Camisetas Regular Fit', sub: 'Modelagem clássica e elegante', rota: '/produtos?colecao=regular-fit', termos: ['regular fit', 'regular', 'tradicional'] },
      { titulo: 'Camisetas Oversized', sub: 'Modelagem moderna e ampla', rota: '/produtos?colecao=oversized', termos: ['oversized', 'over', 'larga'] },
    ];

    secoesLoja.forEach((sec) => {
      if (
        sec.titulo.toLowerCase().includes(q) ||
        sec.sub.toLowerCase().includes(q) ||
        sec.termos.some((t) => t.includes(q) || q.includes(t))
      ) {
        resultados.push({
          tipo: 'Loja',
          titulo: sec.titulo,
          sub: sec.sub,
          rota: sec.rota,
          icone: '✦',
        });
      }
    });

    // 3. ID de Pedido
    const matchId = q.match(/^#?(\d+)$/);
    if (matchId) {
      resultados.unshift({
        tipo: 'Pedido Específico',
        titulo: `Ver Pedido #${matchId[1]}`,
        sub: `Acompanhar status e rastreio do pedido #${matchId[1]}`,
        rota: `/minha-conta?aba=pedidos&pedido=${matchId[1]}`,
        icone: '📦',
      });
    }

    // 4. Produtos do catálogo
    produtosClienteList.forEach((prod) => {
      if (prod.nome?.toLowerCase().includes(q)) {
        resultados.push({
          tipo: 'Produto',
          titulo: prod.nome,
          sub: `${Number(prod.preco_base || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · Ver detalhes`,
          rota: `/produto/${prod.id}`,
          icone: '👕',
          imagem: prod.imagem_url,
        });
      }
    });

    // 5. Fallback de busca no catálogo
    if (!resultados.some((r) => r.rota.startsWith('/produtos?busca='))) {
      resultados.push({
        tipo: 'Pesquisa no Catálogo',
        titulo: `Buscar "${termoBusca}" no catálogo`,
        sub: 'Ver todos os produtos correspondentes',
        rota: `/produtos?busca=${encodeURIComponent(termoBusca)}`,
        icone: '🔍',
      });
    }

    return resultados.slice(0, 8);
  }, [termoBusca, produtosClienteList]);

  const handleExecutarNavegacaoCliente = (rota) => {
    setSugestoesClienteAbertas(false);
    setTermoBusca('');
    if (rota === '/carrinho') {
      openCart();
    } else {
      navigate(rota);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setNotificacoes([]);
      setTotalNaoLidas(0);
      return;
    }

    const carregarNotificacoes = () => {
      obterNotificacoesCliente()
        .then(({ data }) => {
          setNotificacoes(data.notificacoes || []);
          setTotalNaoLidas(Number(data.total_nao_lidas || 0));
        })
        .catch(() => {});
    };

    carregarNotificacoes();
    const interval = setInterval(carregarNotificacoes, 20000);
    window.addEventListener('salv-pedidos-atualizados', carregarNotificacoes);
    return () => {
      clearInterval(interval);
      window.removeEventListener('salv-pedidos-atualizados', carregarNotificacoes);
    };
  }, [isAuthenticated, location.pathname]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setDropdownNotificacoesAberto(false);
      }
    };
    if (dropdownNotificacoesAberto) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownNotificacoesAberto]);

  const handleToggleNotificacoes = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setDropdownNotificacoesAberto((prev) => !prev);
  };

  const handleMarcarLida = async (n) => {
    try {
      if (!n.lida) {
        await marcarNotificacaoLidaCliente(n.id);
        setNotificacoes((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, lida: true } : item))
        );
        setTotalNaoLidas((prev) => Math.max(0, prev - 1));
      }
      if (n.link) {
        setDropdownNotificacoesAberto(false);
        navigate(n.link);
      }
    } catch {}
  };

  const handleMarcarTodasLidas = async () => {
    try {
      await marcarTodasLidasCliente();
      setNotificacoes((prev) => prev.map((item) => ({ ...item, lida: true })));
      setTotalNaoLidas(0);
    } catch {}
  };

  const handleLimparTodas = async () => {
    try {
      await limparTodasCliente();
      setNotificacoes([]);
      setTotalNaoLidas(0);
    } catch {}
  };

  const handleRemoverNotificacao = async (e, id) => {
    e.stopPropagation();
    try {
      await removerNotificacaoCliente(id);
      const eraNaoLida = notificacoes.find((n) => n.id === id && !n.lida);
      setNotificacoes((prev) => prev.filter((item) => item.id !== id));
      if (eraNaoLida) {
        setTotalNaoLidas((prev) => Math.max(0, prev - 1));
      }
    } catch {}
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setPedidosPendentesCount(0);
      return;
    }

    const verificarPendentes = () => {
      obterResumoConta()
        .then(({ data }) => {
          setPedidosPendentesCount(Number(data?.pedidos_pendentes || 0));
        })
        .catch(() => {});
    };

    verificarPendentes();
    window.addEventListener('salv-pedidos-atualizados', verificarPendentes);
    return () => window.removeEventListener('salv-pedidos-atualizados', verificarPendentes);
  }, [isAuthenticated, location.pathname]);

  const logoDestino = isAuthenticated && user?.papel === 'admin' ? '/admin' : '/';

  const handleBuscar = (e) => {
    e.preventDefault();
    if (sugestoesCliente.length > 0) {
      handleExecutarNavegacaoCliente(sugestoesCliente[0].rota);
      return;
    }
    const termo = (termoBusca || '').trim();
    if (!termo) return;
    navigate(`/produtos?busca=${encodeURIComponent(termo)}`);
  };

  const handleFavoritosClick = (e) => {
    e.preventDefault();
    if (isAuthenticated) {
      navigate('/minha-conta?aba=favoritos');
    } else {
      setModalFavoritosLogin(true);
    }
  };

  const exibirBanner = configs.aviso_topo_ativo !== '0';
  const textoBanner = configs.aviso_topo_texto || '✦ SALV SACRA — VISTA A SUA FÉ COM ELEGÂNCIA E PROPÓSITO ✦';

  return (
    <header>
      {/* Topbar dinâmico */}
      {exibirBanner && (
        <div className="topbar">
          {textoBanner}
        </div>
      )}

      {/* Logo + Busca + Ações */}
      <div className="site-header">
        <div className="header-inner">
          <Link to={logoDestino} className="header-logo" title={isAuthenticated && user?.papel === 'admin' ? 'Ir para o Painel do Administrador' : 'Ir para o Início'}>
            <img src={logoImg} alt={configs.nome_loja || "Salv Sacra"} className="logo-img" />
          </Link>

          <div ref={searchClienteRef} className="header-search">
            <form onSubmit={handleBuscar} style={{ display: 'flex', width: '100%', position: 'relative' }}>
              <input
                type="search"
                placeholder="O que você está buscando?"
                value={termoBusca}
                onFocus={() => { if (termoBusca.trim()) setSugestoesClienteAbertas(true); }}
                onChange={(e) => {
                  setTermoBusca(e.target.value);
                  setSugestoesClienteAbertas(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSugestoesClienteAbertas(false);
                }}
              />
              <button type="submit" aria-label="Buscar">
                <IconSearch />
              </button>
            </form>

            {/* Dropdown de sugestões para o cliente */}
            {sugestoesClienteAbertas && sugestoesCliente.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  width: '100%',
                  background: '#1a1a1a',
                  borderRadius: '8px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.55)',
                  border: '1px solid #333333',
                  overflow: 'hidden',
                  zIndex: 1000,
                  maxHeight: '380px',
                  overflowY: 'auto',
                }}
              >
                <div style={{ padding: '8px 14px', background: '#222', borderBottom: '1px solid #2e2e2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#c5a880', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Sugestões (Enter para a 1ª opção)
                  </span>
                  <span style={{ fontSize: '11px', color: '#888' }}>
                    {sugestoesCliente.length} resultado(s)
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {sugestoesCliente.map((sug, idx) => (
                    <button
                      key={`${sug.rota}-${idx}`}
                      type="button"
                      onClick={() => handleExecutarNavegacaoCliente(sug.rota)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        background: idx === 0 ? 'rgba(197, 168, 128, 0.1)' : 'transparent',
                        border: 'none',
                        borderBottom: idx < sugestoesCliente.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                        color: '#f3f4f6',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#282828'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = idx === 0 ? 'rgba(197, 168, 128, 0.1)' : 'transparent'; }}
                    >
                      {sug.imagem ? (
                        <img
                          src={sug.imagem}
                          alt=""
                          style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                        />
                      ) : (
                        <span style={{ fontSize: '16px', width: '28px', textAlign: 'center', flexShrink: 0, color: '#c5a880' }}>
                          {sug.icone}
                        </span>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sug.titulo}
                          </span>
                          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#2c2c2c', color: '#c5a880', fontWeight: 700, flexShrink: 0 }}>
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

          <nav className="header-actions">
            {/* 1. Notificações */}
            <div ref={notifRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleToggleNotificacoes}
                className="header-action-item"
                title={totalNaoLidas > 0 ? `${totalNaoLidas} nova(s) notificação(ões)` : 'Notificações'}
                style={{ position: 'relative' }}
              >
                <IconBell /> Notificações
                {totalNaoLidas > 0 && (
                  <span
                    style={{
                      marginLeft: '6px',
                      background: '#dc2626',
                      color: '#ffffff',
                      borderRadius: '999px',
                      padding: '1px 6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      lineHeight: '14px',
                      display: 'inline-block',
                      boxShadow: '0 2px 6px rgba(220,38,38,0.5)',
                    }}
                  >
                    {totalNaoLidas}
                  </span>
                )}
              </button>

              {/* Dropdown de Notificações do Cliente */}
              {dropdownNotificacoesAberto && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 12px)',
                    right: 0,
                    width: '370px',
                    maxWidth: '92vw',
                    background: '#ffffff',
                    borderRadius: '10px',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.22)',
                    border: '1px solid #e2e8f0',
                    zIndex: 9999,
                    overflow: 'hidden',
                    color: '#1a1a1a',
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
                      <strong style={{ fontSize: '13px', letterSpacing: '0.3px' }}>Notificações</strong>
                      {totalNaoLidas > 0 && (
                        <span
                          style={{
                            background: '#dc2626',
                            fontSize: '11px',
                            padding: '1px 7px',
                            borderRadius: '10px',
                            fontWeight: 800,
                          }}
                        >
                          {totalNaoLidas} nova(s)
                        </span>
                      )}
                    </div>
                    {notificacoes.length > 0 && (
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
                    {notificacoes.length === 0 ? (
                      <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                        <span style={{ fontSize: '26px', display: 'block', marginBottom: '8px' }}>🔔</span>
                        Nenhuma notificação no momento.
                      </div>
                    ) : (
                      notificacoes.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleMarcarLida(n)}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #f1f5f9',
                            background: n.lida ? '#ffffff' : '#f0fdf4',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = n.lida ? '#ffffff' : '#f0fdf4'; }}
                        >
                          <span style={{ fontSize: '18px', lineHeight: 1, marginTop: '2px' }}>
                            {n.categoria === 'devolucao' ? '🔄' : n.categoria === 'carrinho' ? '🛒' : '📦'}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: '12.5px', color: '#0f172a' }}>{n.titulo}</strong>
                              {!n.lida && (
                                <span style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', flexShrink: 0 }} />
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

            {/* 2. Favoritos */}
            <button
              type="button"
              onClick={handleFavoritosClick}
              className="header-action-item"
              title="Favoritos"
            >
              <IconHeart /> Favoritos
            </button>
            <Link
              to={isAuthenticated ? (pedidosPendentesCount > 0 ? '/minha-conta?aba=pedidos' : '/minha-conta') : '/login'}
              className="header-action-item"
              style={{ position: 'relative' }}
              title={pedidosPendentesCount > 0 ? 'Você possui um pedido pendente aguardando pagamento!' : 'Minha conta'}
            >
              <IconUser /> Minha conta
              {isAuthenticated && pedidosPendentesCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '12px',
                    background: '#dc2626',
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    boxShadow: '0 2px 6px rgba(220,38,38,0.45)',
                    lineHeight: '14px',
                  }}
                >
                  !
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={openCart}
              className="header-action-item"
              style={{ position: 'relative' }}
            >
              <IconCart /> Meu carrinho
              {totalItens > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '12px',
                    background: '#c4953a',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                  }}
                >
                  {totalItens}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Navbar com Dropdowns Fiéis às Imagens 3, 4 e 5 */}
      <nav className="site-navbar">
        <div className="navbar-inner">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Início
          </NavLink>

          {/* Camisetas: link normal */}
          <Link
            to="/produtos?categoria=camisetas"
            className={`nav-link ${
              location.pathname === '/produtos' && location.search.includes('categoria=camisetas')
                ? 'active'
                : ''
            }`}
          >
            Camisetas
          </Link>

          <Link to="/guia-de-medidas" className={`nav-link ${location.pathname === '/guia-de-medidas' ? 'active' : ''}`}>Guia de medidas</Link>
          <Link to="/contato" className={`nav-link ${location.pathname === '/contato' ? 'active' : ''}`}>Contato</Link>
        </div>
      </nav>

      {/* Modal de Aviso de Login para Favoritos */}
      {modalFavoritosLogin && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setModalFavoritosLogin(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '430px',
              width: '100%',
              padding: '28px 24px',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35)',
              textAlign: 'center',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '26px',
              }}
            >
              ❤️
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e1e1e', margin: '0 0 12px' }}>
              Lista de Favoritos
            </h3>

            <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.6', margin: '0 0 22px' }}>
              Você deve realizar login para favoritar os produtos.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setModalFavoritosLogin(false)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#374151',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <Link
                to="/login?redirect=%2Fminha-conta%3Faba%3Dfavoritos"
                onClick={() => {
                  sessionStorage.setItem('salv_redirect_after_auth', '/minha-conta?aba=favoritos');
                  setModalFavoritosLogin(false);
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: '6px',
                  background: '#1e1e1e',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Fazer login
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ── Footer ─────────────────────────────────────────────── */
const PAYMENT_METHODS = [
  "Visa", "Master", "Amex", "Diners", "Elo", "Hiper", "Discover", "Pix"
];

function SiteFooter({ configs }) {
  const whatsNumero = (configs.contato_whatsapp || '5548996205153').replace(/\D/g, '');
  const whatsUrl = `https://wa.me/${whatsNumero}`;

  return (
    <footer className="site-footer">
      {/* Colunas */}
      <div className="footer-columns">
        {/* Quem somos */}
        <div className="footer-col">
          <h4>Quem somos</h4>
          <Link to="/quem-somos">Salv Sacra</Link>
        </div>

        {/* Institucional */}
        <div className="footer-col">
          <h4>Institucional</h4>
          <Link to="/termos-de-uso">Termos de uso</Link>
          <Link to="/politica-de-privacidade">Política de privacidade</Link>
        </div>

        {/* Contato */}
        <div className="footer-col">
          <h4>Entre em contato</h4>
          <div className="contact-item">
            <IconWhatsapp />
            <a href={whatsUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
              {configs.contato_whatsapp || '5548996205153'}
            </a>
          </div>
          <div className="contact-item">
            <IconPhone />
            <span>{configs.contato_telefone || '(48) 99620-5153'}</span>
          </div>
          <div className="contact-item">
            <IconMail />
            <a href={`mailto:${configs.contato_email || 'salvsacra2@gmail.com'}`}>{configs.contato_email || 'salvsacra2@gmail.com'}</a>
          </div>
        </div>

        {/* Nossa Localização */}
        <div className="footer-col">
          <h4>Nossa Localização</h4>
          <div className="contact-item" style={{ marginLeft: '-14px' }}>
            <IconMapPin />
            <div>
              {configs.contato_endereco && configs.contato_endereco.includes(' - ') ? (
                <>
                  <span style={{ display: 'block', color: '#333', fontSize: '13px', lineHeight: 1.4 }}>
                    {configs.contato_endereco.split(' - ')[0]}
                  </span>
                  <span style={{ display: 'block', color: '#333', fontSize: '13px', lineHeight: 1.4, marginTop: '3px' }}>
                    {configs.contato_endereco.split(' - ').slice(1).join(' - ')}
                  </span>
                </>
              ) : (
                <>
                  <span style={{ display: 'block', color: '#333', fontSize: '13px', lineHeight: 1.4 }}>
                    {configs.contato_endereco || 'Rua Manoel Antunes Corrêa, 2171'}
                  </span>
                  {!configs.contato_endereco?.toLowerCase().includes('tubarão') && (
                    <span style={{ display: 'block', color: '#333', fontSize: '13px', lineHeight: 1.4, marginTop: '3px' }}>
                      Bairro Oficinas · Tubarão - SC
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Meios de pagamento */}
      <div className="footer-payment">
        <span className="footer-payment-label">Meios de pagamento</span>
        <div className="payment-icons" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {LISTA_BANDEIRAS_RODAPE.map((b) => (
            <span
              key={b.id}
              className="payment-badge-img"
              title={b.name}
              style={{
                background: '#ffffff',
                borderRadius: '6px',
                padding: '4px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '32px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
              }}
            >
              <img
                src={b.src}
                alt={b.name}
                style={{
                  height: '18px',
                  width: 'auto',
                  maxWidth: '54px',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </span>
          ))}
        </div>
      </div>

      {/* Copyright */}
      <div className="footer-copyright">
        <p>
          Copyright <a href="#">{configs.nome_loja || 'SALV SACRA'}</a> · {new Date().getFullYear()}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}

/* ── Layout principal ───────────────────────────────────── */
export default function MainLayout({ children, breadcrumbs }) {
  const [configs, setConfigs] = useState({});

  useEffect(() => {
    fetch('/api/configuracoes')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          setConfigs(data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <SiteHeader configs={configs} />

      <main className="main-content">
        {/* Breadcrumb */}
        {breadcrumbs && (
          <div className="breadcrumb-bar">
            <nav className="breadcrumb" aria-label="Navegação estrutural">
              {breadcrumbs.map((crumb, i) => (
                <span key={i}>
                  {i > 0 && <span className="breadcrumb-sep"> &gt; </span>}
                  {crumb.to
                    ? <Link to={crumb.to} className="breadcrumb-link">{crumb.label}</Link>
                    : <span className="breadcrumb-current">{crumb.label}</span>
                  }
                </span>
              ))}
            </nav>
          </div>
        )}

        {children}
      </main>

      <SiteFooter configs={configs} />

      {/* Gaveta lateral do Carrinho de Compras */}
      <CarrinhoDrawer />
    </div>
  );
}
