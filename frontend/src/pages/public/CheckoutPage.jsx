import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import logoImg from '../../assets/logo.webp';
import '../../styles/checkout.css';
import '../../styles/cupom.css';
import CupomSelector from '../../components/CupomSelector';
import IconPix from '../../components/IconPix';
import CardBrandIcon, { detectarBandeira } from '../../components/CardBrandIcon';

import { listarEnderecos, listarCartoes, obterUltimoEndereco } from '../../services/contaService';

// Ícones SVG inline
const IconShieldCheck = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const IconInfo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const IconMapPin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconTruck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const IconMessage = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const IconCreditCard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);


const IconBarcode = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="5" x2="3" y2="19" />
    <line x1="7" y1="5" x2="7" y2="19" />
    <line x1="10" y1="5" x2="10" y2="19" />
    <line x1="14" y1="5" x2="14" y2="19" />
    <line x1="18" y1="5" x2="18" y2="19" />
    <line x1="21" y1="5" x2="21" y2="19" />
  </svg>
);

const getDadosCheckoutSalvos = () => {
  try {
    const salvo = localStorage.getItem('@SalvSacra:checkout_dados');
    return salvo ? JSON.parse(salvo) : null;
  } catch {
    return null;
  }
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, updateUser } = useAuth();
  const {
    items,
    subtotal,
    shippingOptions: opcoesFreteContext,
    selectedShipping,
    setSelectedShipping,
    setCep: setGlobalCep,
    loadingFrete,
    openCart,
    clearCart,
    cupom,
    valeCompra,
    descontoCupom,
    descontoProduto,
    descontoFrete,
    descontoVale,
    saldoDisponivelVale,
    saldoRestanteVale,
    removerCupom,
    removerValeCompra,
    removerTodosBeneficios,
  } = useCart();

  // Etapa atual do checkout: 'entrega' | 'pagamento'
  const [etapa, setEtapa] = useState('entrega');
  const [resumoBeneficiosConcluido, setResumoBeneficiosConcluido] = useState(null);

  const dadosSalvos = getDadosCheckoutSalvos();

  // Dados de contato e endereço (carregam instantaneamente da memória do navegador ou usuário para eliminar qualquer delay)
  const [email, setEmail] = useState(() => dadosSalvos?.email || user?.email || '');
  const [nome, setNome] = useState(() => dadosSalvos?.nome || user?.name || '');
  const [telefone, setTelefone] = useState(() => dadosSalvos?.telefone || (user?.telefone ? formatarTelefoneInput(user.telefone) : ''));
  const [cpf, setCpf] = useState(() => dadosSalvos?.cpf || (user?.cpf ? formatarCpfInput(user.cpf) : ''));
  const [endereco, setEndereco] = useState(() => dadosSalvos?.endereco || {
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
  });

  // Endereços e cartões salvos do usuário autenticado
  const [enderecosSalvos, setEnderecosSalvos] = useState([]);
  const [cartoesSalvos, setCartoesSalvos] = useState([]);
  const [cartaoSelecionadoId, setCartaoSelecionadoId] = useState('novo');

  const [buscandoCep, setBuscandoCep] = useState(false);
  const [observacoes, setObservacoes] = useState('');

  // Opções de envio dinâmicas calculadas pela API / CartContext
  const opcoesFrete = opcoesFreteContext || [];

  // Pagamento: 'cartao' | 'pix' | 'boleto'
  const [metodoPagamento, setMetodoPagamento] = useState('cartao');
  const [tipoCartao, setTipoCartao] = useState('credito'); // 'credito' | 'debito'
  const [parcelasCartao, setParcelasCartao] = useState(1);
  const [maxParcelas, setMaxParcelas] = useState(6);
  const [parcelaMinima, setParcelaMinima] = useState(50.0);
  const [cpfTitular, setCpfTitular] = useState('');
  const [salvarDadosCompra, setSalvarDadosCompra] = useState(false);
  const [cartao, setCartao] = useState({
    numero: '',
    titular: '',
    validade: '',
    cvv: '',
  });

  const detectarBandeiraCartao = (num) => {
    const limpo = (num || '').replace(/\D/g, '');
    if (!limpo) return '';
    if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(limpo)) return 'Elo';
    if (/^(34|37)/.test(limpo)) return 'Amex';
    if (/^(606282|3841)/.test(limpo)) return 'Hipercard';
    if (/^(5[1-5]|2[2-7])/.test(limpo)) return 'Mastercard';
    if (/^4/.test(limpo)) return 'Visa';
    return 'Cartão';
  };

  const formatarCpfInput = (val) => {
    const d = (val || '').replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
  };

  const formatarTelefoneInput = (val) => {
    const d = (val || '').replace(/\D/g, '').slice(0, 11);
    if (!d) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
  };

  // Validação matemática do CPF (Dígitos verificadores - Módulo 11 oficial da Receita Federal)
  const validarCpfAlgoritmo = (cpfStr) => {
    const d = (cpfStr || '').replace(/\D/g, '');
    if (d.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(d)) return false; // Bloqueia 000.000.000-00, 111.111.111-11, etc.

    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(d.charAt(i), 10) * (10 - i);
    let resto = 11 - (soma % 11);
    let dig1 = resto === 10 || resto === 11 ? 0 : resto;
    if (dig1 !== parseInt(d.charAt(9), 10)) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(d.charAt(i), 10) * (11 - i);
    resto = 11 - (soma % 11);
    let dig2 = resto === 10 || resto === 11 ? 0 : resto;
    return dig2 === parseInt(d.charAt(10), 10);
  };

  // Validação de formato e DDD de telefone nacional (11 a 99)
  const validarTelefoneFormato = (telStr) => {
    const d = (telStr || '').replace(/\D/g, '');
    if (d.length < 10 || d.length > 11) return false;
    const ddd = parseInt(d.slice(0, 2), 10);
    if (ddd < 11 || ddd > 99) return false;
    if (d.length === 11 && d.charAt(2) !== '9') return false; // Celular de 11 dígitos começa com 9
    return true;
  };

  const [loading, setLoading] = useState(false);
  const [pedidoConcluido, setPedidoConcluido] = useState(null);
  const [copiadoPix, setCopiadoPix] = useState(false);
  const [tempoRestantePix, setTempoRestantePix] = useState(1800); // 30 minutos em segundos
  const [confirmandoPagamento, setConfirmandoPagamento] = useState(false);
  const [cancelandoPix, setCancelandoPix] = useState(false);

  // Modal para avisos e recusas de pagamento (sem usar o alert nativo do navegador)
  const [modalAviso, setModalAviso] = useState({
    aberto: false,
    tipo: 'erro', // 'erro' | 'alerta' | 'info'
    titulo: '',
    mensagem: '',
    sugestaoPix: false,
  });

  const abrirModalAviso = ({ titulo, mensagem, sugestaoPix = false, tipo = 'erro' }) => {
    setModalAviso({
      aberto: true,
      tipo,
      titulo: titulo || 'Atenção',
      mensagem: mensagem || '',
      sugestaoPix,
    });
  };

  const fecharModalAviso = () => {
    setModalAviso((prev) => ({ ...prev, aberto: false }));
  };

  // Fecha o modal ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modalAviso.aberto) {
        fecharModalAviso();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalAviso.aberto]);

  // Polling automático para verificar se o pagamento PIX/Boleto foi aprovado (no Mercado Pago ou pelo Admin)
  useEffect(() => {
    if (!pedidoConcluido || pedidoConcluido.status !== 'Pendente') return;

    const timerPolling = setInterval(async () => {
      try {
        const { data } = await api.get(`/pedidos/${pedidoConcluido.id}`);
        if (data && data.status && data.status !== 'Pendente') {
          setPedidoConcluido(data);
          clearCart();
          removerCupom();
        }
      } catch {
        // Silencioso durante o polling
      }
    }, 3500);

    return () => clearInterval(timerPolling);
  }, [pedidoConcluido]);

  // Cronômetro regressivo de 30 minutos para a tela de Aguardando Pagamento PIX
  useEffect(() => {
    if (!pedidoConcluido || pedidoConcluido.status !== 'Pendente' || metodoPagamento !== 'pix') return;

    if (pedidoConcluido.created_at || pedidoConcluido.data_pedido) {
      const dt = new Date(pedidoConcluido.created_at || pedidoConcluido.data_pedido).getTime();
      const restante = Math.max(0, Math.floor((dt + 30 * 60 * 1000 - Date.now()) / 1000));
      setTempoRestantePix(restante);
    }

    const timerCountdown = setInterval(() => {
      setTempoRestantePix((prev) => {
        if (prev <= 1) {
          clearInterval(timerCountdown);
          // Cancela automaticamente ao atingir 5 minutos sem pagamento
          api.post(`/pedidos/${pedidoConcluido.id}/cancelar`)
            .then(() => {
              window.dispatchEvent(new Event('salv-pedidos-atualizados'));
              setPedidoConcluido(null);
              navigate('/minha-conta?aba=pedidos');
            })
            .catch(() => {
              setPedidoConcluido(null);
              navigate('/minha-conta?aba=pedidos');
            });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerCountdown);
  }, [pedidoConcluido, metodoPagamento, navigate]);

  const formatarCronometro = (segundos) => {
    const min = String(Math.floor(segundos / 60)).padStart(2, '0');
    const sec = String(segundos % 60).padStart(2, '0');
    return `${min}:${sec}`;
  };

  const handleCopiarPix = (codigo) => {
    navigator.clipboard.writeText(codigo);
    setCopiadoPix(true);
    setTimeout(() => setCopiadoPix(false), 3000);
  };

  const handleConfirmarPagamentoSimulado = async () => {
    if (!pedidoConcluido) return;
    setConfirmandoPagamento(true);
    try {
      const { data } = await api.post(`/pedidos/${pedidoConcluido.id}/confirmar-pagamento`);
      if (data?.pedido) {
        setPedidoConcluido(data.pedido);
        clearCart();
        removerCupom();
      }
    } catch {
      abrirModalAviso({
        titulo: 'Erro ao Confirmar',
        mensagem: 'Não foi possível confirmar o pagamento no momento. Tente novamente em instantes.',
        tipo: 'alerta',
      });
    } finally {
      setConfirmandoPagamento(false);
    }
  };

  const handleCancelarPix = async () => {
    if (!pedidoConcluido) return;
    setCancelandoPix(true);
    try {
      await api.post(`/pedidos/${pedidoConcluido.id}/cancelar`);
      window.dispatchEvent(new Event('salv-pedidos-atualizados'));
      setPedidoConcluido(null);
      navigate('/minha-conta?aba=pedidos');
    } catch {
      setPedidoConcluido(null);
      navigate('/minha-conta?aba=pedidos');
    } finally {
      setCancelandoPix(false);
    }
  };

  const handleVoltarParaPagamento = async () => {
    if (!pedidoConcluido) {
      setEtapa('pagamento');
      return;
    }
    setCancelandoPix(true);
    try {
      await api.post(`/pedidos/${pedidoConcluido.id}/cancelar`);
      window.dispatchEvent(new Event('salv-pedidos-atualizados'));
    } catch {
      // Silencioso se der erro no cancelamento
    } finally {
      setCancelandoPix(false);
      setPedidoConcluido(null);
      setEtapa('pagamento');
    }
  };

  // Sincroniza dados com o usuário autenticado caso ainda não preenchidos
  useEffect(() => {
    if (user) {
      if (user.email) setEmail((prev) => prev || user.email);
      if (user.name) setNome((prev) => prev || user.name);
      if (user.telefone) setTelefone((prev) => prev || formatarTelefoneInput(user.telefone));
      if (user.cpf) {
        const cpfFmt = formatarCpfInput(user.cpf);
        setCpf((prev) => prev || cpfFmt);
        setCpfTitular((prev) => prev || cpfFmt);
      }
    }
  }, [user]);

  useEffect(() => {
    api.get('/configuracoes/publicas')
      .then((res) => {
        if (res.data?.cartao_parcelas_max) {
          const max = parseInt(res.data.cartao_parcelas_max, 10);
          if (max >= 1 && max <= 12) setMaxParcelas(max);
        }
        if (res.data?.cartao_parcela_minima) {
          const min = parseFloat(res.data.cartao_parcela_minima);
          if (!isNaN(min) && min > 0) setParcelaMinima(min);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      listarEnderecos()
        .then((res) => {
          const lista = res.data || [];
          setEnderecosSalvos(lista);
          if (lista.length > 0) {
            const end = lista[0]; // Seleciona automaticamente o endereço cadastrado pelo próprio cliente
            setEndereco((prev) => (prev.cep ? prev : {
              cep: end.cep || '',
              logradouro: end.logradouro || '',
              numero: end.numero || '',
              complemento: end.complemento || '',
              bairro: end.bairro || '',
              cidade: end.cidade || '',
              estado: end.estado || '',
            }));
          } else {
            // Se o usuário ainda não cadastrou no perfil mas já fez compras anteriores, preenche com o último usado
            obterUltimoEndereco()
              .then((resUltimo) => {
                if (resUltimo?.data) {
                  const endU = resUltimo.data;
                  setEndereco((prev) => (prev.cep ? prev : {
                    cep: endU.cep || '',
                    logradouro: endU.logradouro || '',
                    numero: endU.numero || '',
                    complemento: endU.complemento || '',
                    bairro: endU.bairro || '',
                    cidade: endU.cidade || '',
                    estado: endU.estado || '',
                  }));
                  if (endU.telefone) {
                    setTelefone((prev) => prev || formatarTelefoneInput(endU.telefone));
                  }
                  if (endU.cpf) {
                    setCpf((prev) => prev || formatarCpfInput(endU.cpf));
                    setCpfTitular((prev) => prev || formatarCpfInput(endU.cpf));
                  }
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});

      listarCartoes()
        .then((res) => {
          const lista = res.data || [];
          setCartoesSalvos(lista);
          if (lista.length > 0) {
            const primeiro = lista[0];
            setCartaoSelecionadoId(primeiro.id);
            setTipoCartao(primeiro.tipo === 'debito' ? 'debito' : 'credito');
            setCartao({
              numero: primeiro.numero,
              titular: primeiro.titular,
              validade: primeiro.validade,
              cvv: '',
            });
            if (primeiro.cpf) {
              setCpfTitular(formatarCpfInput(primeiro.cpf));
            }
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Só usuários logados podem finalizar uma compra
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: '/checkout' }, replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Cálculos de valor combinados (1 Cupom Promocional + 1 Vale-Compra)
  const freteAtual = selectedShipping || (opcoesFrete.length > 0 ? opcoesFrete[0] : null);
  const freteValor = freteAtual ? Number(freteAtual.preco) : 0;
  const tipoFreteNome = freteAtual ? freteAtual.nome : 'A calcular';
  const subtotalBase = Number(subtotal || 0);
  const descontoFreteEfetivo =
    cupom?.tipo === 'frete' ? Math.min(freteValor, Number(descontoFrete || 0)) : 0;
  const descontoProdutoEfetivo =
    cupom && cupom.tipo !== 'frete' ? Math.min(subtotalBase, Number(descontoProduto || 0)) : 0;
  const fretePago = Math.max(0, Number((freteValor - descontoFreteEfetivo).toFixed(2)));
  const totalAposCupom = Math.max(
    0,
    Number(((subtotalBase - descontoProdutoEfetivo) + fretePago).toFixed(2))
  );
  const abatimentoVale = valeCompra
    ? Math.min(totalAposCupom, Number(saldoDisponivelVale || descontoVale || 0))
    : 0;
  const saldoRestanteNoVale = valeCompra
    ? Math.max(0, Number((saldoDisponivelVale - abatimentoVale).toFixed(2)))
    : 0;
  const totalFinal = Math.max(0, Number((totalAposCupom - abatimentoVale).toFixed(2)));
  const totalBase = totalFinal;
  const cobertoPorBeneficios =
    totalFinal <= 0.009 && (abatimentoVale > 0 || descontoProdutoEfetivo > 0);

  // Calcula o número máximo de parcelas permitidas (parcela mínima configurada, padrão R$ 50,00, máximo 12x)
  const maxParcelasDisponiveis = Math.max(1, Math.min(12, Math.floor(totalFinal / (parcelaMinima || 50.00))));

  useEffect(() => {
    if (parcelasCartao > maxParcelasDisponiveis) {
      setParcelasCartao(1);
    }
  }, [maxParcelasDisponiveis, parcelasCartao]);

  // Sincroniza o CEP do endereço do Checkout com o motor de cálculo de frete
  useEffect(() => {
    const cepLimpo = (endereco.cep || '').replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      setGlobalCep(`${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`);
    }
  }, [endereco.cep, setGlobalCep]);

  // Busca automática do CEP via ViaCEP
  const handleCepBlur = async (e) => {
    const cepLimpo = e.target.value.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      setGlobalCep(`${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`);
      setBuscandoCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setEndereco((prev) => ({
            ...prev,
            logradouro: data.logradouro || prev.logradouro,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            estado: data.uf || prev.estado,
          }));
        }
      } catch (err) {
        console.error('Erro ao consultar ViaCEP:', err);
      } finally {
        setBuscandoCep(false);
      }
    }
  };

  const handleAvancarParaPagamento = (e) => {
    e.preventDefault();
    if (!email || !endereco.cep || !endereco.logradouro || !endereco.numero) {
      abrirModalAviso({
        titulo: 'Dados de Entrega Incompletos',
        mensagem: 'Por favor, preencha todos os campos obrigatórios de contato e entrega (E-mail, CEP, Endereço e Número).',
        tipo: 'alerta',
      });
      return;
    }
    const telLimpo = (telefone || '').replace(/\D/g, '');
    if (!validarTelefoneFormato(telLimpo)) {
      abrirModalAviso({
        titulo: 'Telefone Inválido',
        mensagem: 'Por favor, informe um telefone ou WhatsApp válido com DDD (ex: (48) 99123-4567).',
        tipo: 'alerta',
      });
      return;
    }
    const cpfLimpo = (cpf || '').replace(/\D/g, '');
    if (!validarCpfAlgoritmo(cpfLimpo)) {
      abrirModalAviso({
        titulo: 'CPF Inválido',
        mensagem: 'O CPF informado é inválido. Por favor, confira os números digitados para prosseguir com o pedido.',
        tipo: 'alerta',
      });
      return;
    }
    if (!freteAtual) {
      abrirModalAviso({
        titulo: 'Selecione a Opção de Frete',
        mensagem: 'Por favor, informe um CEP válido e selecione uma modalidade de frete para continuar.',
        tipo: 'alerta',
      });
      return;
    }
    setEtapa('pagamento');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalizarPedido = async () => {
    if (items.length === 0) {
      abrirModalAviso({
        titulo: 'Carrinho Vazio',
        mensagem: 'Seu carrinho de compras está vazio.',
        tipo: 'alerta',
      });
      navigate('/');
      return;
    }
    if (!cobertoPorBeneficios && metodoPagamento === 'cartao') {
      if (totalFinal < 1.00) {
        abrirModalAviso({
          titulo: 'Valor Mínimo para Cartão',
          mensagem: 'O valor mínimo para pagamentos com Cartão de Crédito é de R$ 1,00. Para valores menores, utilize o PIX.',
          tipo: 'alerta',
          sugestaoPix: true,
        });
        return;
      }
      if (!cartao.cvv || cartao.cvv.length < 3) {
        abrirModalAviso({
          titulo: 'Código de Segurança Obrigatório',
          mensagem: 'Por favor, informe o código de segurança (CVV - 3 dígitos no verso do cartão) para autorizar o pagamento.',
          tipo: 'alerta',
        });
        return;
      }
      if (cartaoSelecionadoId === 'novo') {
        if (!cartao.numero || !cartao.titular || !cartao.validade) {
          abrirModalAviso({
            titulo: 'Dados do Cartão Incompletos',
            mensagem: 'Por favor, preencha todos os dados obrigatórios do cartão (Número, Nome impresso e Validade).',
            tipo: 'alerta',
          });
          return;
        }
      }
    }

    setLoading(true);

    const metodoEnvio = cobertoPorBeneficios
      ? (valeCompra ? 'vale_compra' : 'pix')
      : (metodoPagamento === 'cartao' ? 'cartao_credito' : metodoPagamento);

    const snapshotBeneficios = {
      cupomCodigo: cupom?.codigo || null,
      descontoCupom: descontoProdutoEfetivo + descontoFreteEfetivo,
      descontoProduto: descontoProdutoEfetivo,
      descontoFrete: descontoFreteEfetivo,
      valeCodigo: valeCompra?.codigo || null,
      abatimentoVale,
      saldoAnteriorVale: saldoDisponivelVale,
      saldoRestanteNoVale,
    };

    const payload = {
      email_contato: email,
      telefone: telefone,
      cpf: (cpf || '').replace(/\D/g, ''),
      cep: endereco.cep,
      logradouro: endereco.logradouro,
      numero: endereco.numero,
      complemento: endereco.complemento,
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      estado: endereco.estado,
      tipo_frete: tipoFreteNome,
      valor_frete: freteValor,
      metodo_pagamento: metodoEnvio,
      observacoes: observacoes,
      cupom_codigo:
        (descontoProdutoEfetivo > 0 || descontoFreteEfetivo > 0) ? cupom?.codigo : null,
      vale_compra_codigo: abatimentoVale > 0 ? valeCompra?.codigo : null,
      salvar_dados: salvarDadosCompra,
      salvar_cartao: !cobertoPorBeneficios && salvarDadosCompra,
      cartao_dados:
        !cobertoPorBeneficios && metodoPagamento === 'cartao'
          ? (() => {
              const cartaoSalvo =
                cartaoSelecionadoId !== 'novo'
                  ? cartoesSalvos.find((c) => c.id === cartaoSelecionadoId)
                  : null;
              return {
                tipo: 'credito',
                numero: cartao.numero,
                titular: cartao.titular,
                validade: cartao.validade,
                cvv: cartao.cvv,
                cpf: cartaoSalvo ? (cartaoSalvo.cpf || cpfTitular || cpf) : cpfTitular,
                parcelas: Number(parcelasCartao) || 1,
                bandeira: detectarBandeiraCartao(cartao.numero) || 'Cartão',
              };
            })()
          : null,
      itens: items.map((i) => ({
        produto_id: i.produtoId,
        variacao_id: i.variacaoId || null,
        quantidade: i.quantidade,
        preco: i.preco,
      })),
    };

    try {
      const res = await api.post('/pedidos', payload);
      setResumoBeneficiosConcluido({
        ...snapshotBeneficios,
        saldoRestanteNoVale:
          res.data?.saldo_restante_vale ?? snapshotBeneficios.saldoRestanteNoVale,
      });
      setPedidoConcluido(res.data.pedido);

      // Salva os dados de entrega localmente para próximas compras
      if (salvarDadosCompra) {
        try {
          localStorage.setItem('@SalvSacra:checkout_dados', JSON.stringify({
            email,
            nome,
            telefone,
            cpf,
            endereco,
          }));
        } catch {}
      }

      if (res.data?.user && updateUser) {
        updateUser(res.data.user);
      }

      // Limpa o carrinho, cupom promocional e vale-compra pois o pedido já foi criado
      if (res.data.pedido) {
        clearCart();
        if (removerTodosBeneficios) {
          removerTodosBeneficios();
        } else {
          removerCupom();
          if (removerValeCompra) removerValeCompra();
        }
      }
      try {
        localStorage.removeItem('minha_conta_pedidos');
        const resumoSalvo = localStorage.getItem('minha_conta_resumo');
        if (resumoSalvo && res.data?.pedido) {
          const parsed = JSON.parse(resumoSalvo);
          localStorage.setItem(
            'minha_conta_resumo',
            JSON.stringify({
              ...parsed,
              total_pedidos: (Number(parsed.total_pedidos) || 0) + 1,
              ultimo_pedido: res.data.pedido,
            })
          );
        }
        localStorage.setItem('salv_sync_trigger', String(Date.now()));
      } catch {}
      window.dispatchEvent(new Event('salv-pedidos-atualizados'));
    } catch (err) {
      console.error('Erro ao finalizar pedido:', err);
      if (err.response?.status === 401) {
        navigate('/login', { state: { from: '/checkout' } });
      } else {
        const errs = err.response?.data?.errors;
        const msg =
          (errs && Object.values(errs)[0]?.[0]) ||
          err.response?.data?.message ||
          'Não foi possível finalizar o pedido. Tente novamente.';

        const ehErroCartao = metodoPagamento === 'cartao' || metodoEnvio.includes('cartao');
        abrirModalAviso({
          titulo: ehErroCartao ? 'Cartão Não Autorizado' : 'Aviso no Pagamento',
          mensagem: msg,
          sugestaoPix: ehErroCartao,
          tipo: 'erro',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const logoDestino = isAuthenticated && user?.papel === 'admin' ? '/admin' : '/';

  if (authLoading || !isAuthenticated) return null;

  // Fluxo Pós-Finalização: Aguardando Pagamento (PIX) vs. Em Análise (Cartão) vs. Pedido Confirmado
  if (pedidoConcluido) {
    const valorEmDinheiroPedido = Number(
      pedidoConcluido.valor_pago_dinheiro ?? pedidoConcluido.valor_total ?? 0
    );
    const pagoIntegralmenteComBeneficios =
      valorEmDinheiroPedido <= 0.009 || pedidoConcluido.metodo_pagamento === 'vale_compra';
    const aguardandoPix =
      !pagoIntegralmenteComBeneficios &&
      metodoPagamento === 'pix' &&
      pedidoConcluido.status === 'Pendente';
    const emAnaliseCartao =
      !pagoIntegralmenteComBeneficios &&
      metodoPagamento === 'cartao' &&
      pedidoConcluido.status === 'Pendente';
    const codigoPix =
      pedidoConcluido.pix_copia_e_cola ||
      `00020126580014br.gov.bcb.pix0120salvsacra2@gmail.com5204000053039865405${Number(pedidoConcluido.valor_total || totalFinal).toFixed(2)}5802BR5910SALV SACRA6007TUBARAO62140510PEDIDO${String(pedidoConcluido.id).padStart(4, '0')}6304B14F`;
    const qrCodeUrl =
      pedidoConcluido.pix_qr_code_base64 ||
      `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(codigoPix)}`;

    return (
      <div className="checkout-page">
        <header className="checkout-header">
          <div className="checkout-header-inner">
            <Link
              to={logoDestino}
              className="checkout-logo-link"
              title="Voltar para a página inicial"
            >
              <img src={logoImg} alt="Salv Sacra" className="checkout-logo-img" />
            </Link>
            <div className="checkout-safe-badge">
              <span className="checkout-safe-icon"><IconShieldCheck /></span>
              <span>Compra 100% Segura</span>
            </div>
          </div>
        </header>

        {/* ── TELA 1: AGUARDANDO PAGAMENTO PIX ── */}
        {aguardandoPix ? (
          <div className="checkout-success-wrap" style={{ maxWidth: '560px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#fff8e6',
                color: '#b45309',
                border: '1px solid #fde68a',
                padding: '6px 16px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '14px',
              }}
            >
              <span className="pix-pulse-dot" />
              Aguardando Pagamento · Expira em {formatarCronometro(tempoRestantePix)}
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#111', margin: '0 0 6px' }}>
              Escaneie o QR Code para pagar
            </h2>
            <p style={{ fontSize: '14px', color: '#666', margin: '0 0 18px' }}>
              Pedido <strong>#{pedidoConcluido.id}</strong> · Valor total a pagar:{' '}
              <strong style={{ color: '#111', fontSize: '16px' }}>
                R$ {Number(pedidoConcluido.valor_total || totalFinal).toFixed(2).replace('.', ',')}
              </strong>
            </p>

            {/* QR Code PIX */}
            <div
              style={{
                background: '#fff',
                border: '2px solid #111',
                borderRadius: '12px',
                padding: '16px',
                display: 'inline-block',
                boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
                marginBottom: '18px',
              }}
            >
              <img
                src={qrCodeUrl}
                alt="QR Code PIX Salv Sacra"
                style={{ width: '210px', height: '210px', display: 'block' }}
              />
            </div>

            {/* Chave PIX Copia e Cola */}
            <div className="checkout-pix-box" style={{ marginTop: '0', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ color: '#926c15', margin: 0, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  PIX Copia e Cola
                </h4>
                <span style={{ fontSize: '11px', color: '#777' }}>Abra o app do seu banco e cole o código</span>
              </div>

              <code
                style={{
                  fontSize: '11px',
                  background: '#fff',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  display: 'block',
                  wordBreak: 'break-all',
                  color: '#333',
                  marginBottom: '10px',
                }}
              >
                {codigoPix}
              </code>

              <button
                type="button"
                onClick={() => handleCopiarPix(codigoPix)}
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  background: copiadoPix ? '#15803d' : '#111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {copiadoPix ? '✓ Código PIX Copiado!' : '📋 Copiar Código PIX'}
              </button>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '12px',
                color: '#475569',
                lineHeight: 1.5,
                marginTop: '16px',
              }}
            >
              🔄 <strong>Atualização automática:</strong> Assim que você concluir o pagamento no aplicativo do seu banco, esta tela confirmará o seu pedido automaticamente em poucos segundos.
            </div>

            {/* Botão para confirmar/simular o pagamento em ambiente de apresentação/testes */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #e5e7eb' }}>
              <button
                type="button"
                onClick={handleConfirmarPagamentoSimulado}
                disabled={confirmandoPagamento}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  background: '#f0fdf4',
                  color: '#166534',
                  border: '1.5px solid #86efac',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {confirmandoPagamento
                  ? 'Verificando pagamento...'
                  : '✓ Já realizei o pagamento / Confirmar PIX agora'}
              </button>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={handleVoltarParaPagamento}
                  disabled={cancelandoPix}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    background: '#fff',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: cancelandoPix ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; }}
                >
                  {cancelandoPix ? 'Cancelando...' : '✕ Cancelar Pedido'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPedidoConcluido(null);
                    navigate('/');
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    background: '#fff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; }}
                >
                  ← Voltar para a loja (pagar depois)
                </button>
              </div>
            </div>
          </div>
        ) : emAnaliseCartao ? (
          /* ── TELA 3: PAGAMENTO COM CARTÃO EM ANÁLISE ── */
          <div className="checkout-success-wrap" style={{ maxWidth: '580px' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                margin: '0 auto 16px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.2)',
              }}
            >
              ⏳
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#eff6ff',
                color: '#1e40af',
                border: '1px solid #bfdbfe',
                padding: '6px 16px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '14px',
              }}
            >
              Em Análise de Segurança
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#111', margin: '0 0 8px' }}>
              Pedido Realizado com Sucesso!
            </h2>
            <p style={{ marginTop: '4px', color: '#4b5563', fontSize: '15px', lineHeight: 1.6 }}>
              O pagamento do Pedido <strong>#{pedidoConcluido.id}</strong> está em análise preventiva pela operadora do cartão.
            </p>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px', lineHeight: 1.5 }}>
              Esse procedimento é padrão para a segurança da transação. Assim que o emissor aprovar a cobrança, você receberá a confirmação por e-mail e o pedido seguirá para separação.
            </p>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '16px 20px',
                margin: '22px 0',
                textAlign: 'left',
                fontSize: '13px',
                color: '#334155',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Número do Pedido:</span>
                <strong>#{pedidoConcluido.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Status da Transação:</span>
                <span style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, fontSize: '12px' }}>
                  Em análise pela operadora
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Forma de Pagamento:</span>
                <strong>Cartão de Crédito</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Valor Total:</span>
                <strong>R$ {Number(pedidoConcluido.valor_total || totalFinal).toFixed(2).replace('.', ',')}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '24px' }}>
              <Link
                to="/minha-conta?aba=pedidos"
                className="checkout-submit-btn"
                style={{
                  background: '#1a1a1a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '14px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  width: '100%',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Acompanhar na Minha Conta
              </Link>
              <button
                type="button"
                onClick={() => {
                  clearCart();
                  setPedidoConcluido(null);
                  navigate('/');
                }}
                style={{
                  background: 'transparent',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '12px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Continuar Comprando
              </button>
            </div>
          </div>
        ) : (
          /* ── TELA 2: PAGAMENTO CONFIRMADO / PEDIDO CONCLUÍDO COM SUCESSO ── */
          <div className="checkout-success-wrap">
            <div className="checkout-success-icon">✓</div>
            <h2>
              {pagoIntegralmenteComBeneficios
                ? 'Pedido Confirmado com Benefícios!'
                : 'Pagamento Confirmado!'}
            </h2>
            <p style={{ marginTop: '8px', color: '#444', fontSize: '15px' }}>
              Seu Pedido <strong>#{pedidoConcluido.id}</strong> foi aprovado e já entrou para separação.
            </p>
            <p style={{ fontSize: '13px', color: '#777', marginTop: '6px' }}>
              Enviamos o comprovante e os detalhes de acompanhamento para <strong>{pedidoConcluido.email_contato || email}</strong>
            </p>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px 18px',
                margin: '22px 0',
                textAlign: 'left',
                fontSize: '13px',
                color: '#334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Status atual:</span>
                <strong style={{ color: '#15803d' }}>
                  {pedidoConcluido.status === 'Pendente' ? 'Pago' : pedidoConcluido.status}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Modalidade de entrega:</span>
                <strong>{pedidoConcluido.tipo_frete || tipoFreteNome}</strong>
              </div>
              {Number(pedidoConcluido.valor_desconto_cupom || resumoBeneficiosConcluido?.descontoCupom || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e8449' }}>
                  <span>
                    Cupom ({pedidoConcluido.cupom_codigo || resumoBeneficiosConcluido?.cupomCodigo}):
                  </span>
                  <strong>
                    − R${' '}
                    {Number(
                      pedidoConcluido.valor_desconto_cupom ||
                        resumoBeneficiosConcluido?.descontoCupom ||
                        0
                    )
                      .toFixed(2)
                      .replace('.', ',')}
                  </strong>
                </div>
              )}
              {Number(pedidoConcluido.valor_vale_compra || resumoBeneficiosConcluido?.abatimentoVale || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b21a8' }}>
                  <span>
                    Vale-Compra ({pedidoConcluido.vale_compra_codigo || resumoBeneficiosConcluido?.valeCodigo}):
                  </span>
                  <strong>
                    − R${' '}
                    {Number(
                      pedidoConcluido.valor_vale_compra ||
                        resumoBeneficiosConcluido?.abatimentoVale ||
                        0
                    )
                      .toFixed(2)
                      .replace('.', ',')}
                  </strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '6px', marginTop: '2px' }}>
                <span>Valor pago em dinheiro:</span>
                <strong>
                  R${' '}
                  {Number(
                    pedidoConcluido.valor_pago_dinheiro ??
                      pedidoConcluido.valor_total ??
                      totalFinal
                  )
                    .toFixed(2)
                    .replace('.', ',')}
                </strong>
              </div>
              {Number(resumoBeneficiosConcluido?.saldoRestanteNoVale || 0) > 0 && (
                <div style={{ marginTop: '4px', padding: '8px 10px', borderRadius: '6px', background: '#f3e8ff', color: '#5b21b6', fontSize: '12px', fontWeight: 600 }}>
                  🎟 Seu vale-compra ({resumoBeneficiosConcluido.valeCodigo}) continua ATIVO com{' '}
                  <strong>
                    R$ {Number(resumoBeneficiosConcluido.saldoRestanteNoVale).toFixed(2).replace('.', ',')}
                  </strong>{' '}
                  de saldo para compras futuras!
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '24px' }}>
              <Link
                to="/minha-conta?tab=pedidos"
                className="checkout-submit-btn"
                style={{ textDecoration: 'none', textAlign: 'center', lineHeight: '52px', display: 'block' }}
              >
                Acompanhar Meu Pedido
              </Link>
              <Link
                to={logoDestino}
                style={{
                  textDecoration: 'none',
                  textAlign: 'center',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#555',
                }}
              >
                Voltar para a Loja
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="checkout-page">
      {/* ── 1. Topo Seguro com Logo Proporcional ── */}
      <header className="checkout-header">
        <div className="checkout-header-inner">
          <Link to={logoDestino} className="checkout-logo-link">
            <img src={logoImg} alt="Salv Sacra" className="checkout-logo-img" />
          </Link>

          <div className="checkout-safe-badge">
            <span className="checkout-safe-icon">
              <IconShieldCheck />
            </span>
            <span>Compra Segura 100% Protegido</span>
          </div>
        </div>
      </header>

      {/* ── 2. Stepper de Progresso Clicável ── */}
      <div className="checkout-stepper">
        {/* 1. Carrinho */}
        <button
          type="button"
          className="checkout-step-item completed"
          onClick={() => {
            navigate('/');
            setTimeout(() => openCart(), 150);
          }}
          title="Ver itens do carrinho"
        >
          <div className="checkout-step-circle">✓</div>
          <span className="checkout-step-label">Carrinho</span>
        </button>

        <div className="checkout-step-line" />

        {/* 2. Entrega */}
        <button
          type="button"
          className={`checkout-step-item ${etapa === 'entrega' ? 'active' : 'completed'}`}
          onClick={() => setEtapa('entrega')}
          title="Editar dados de entrega"
        >
          <div className="checkout-step-circle">
            {etapa === 'pagamento' ? '✓' : '📍'}
          </div>
          <span className="checkout-step-label">Entrega</span>
        </button>

        <div className="checkout-step-line" />

        {/* 3. Pagamento */}
        <button
          type="button"
          className={`checkout-step-item ${etapa === 'pagamento' ? 'active' : ''}`}
          onClick={() => {
            if (email && endereco.cep) setEtapa('pagamento');
          }}
          title="Ir para pagamento"
        >
          <div className="checkout-step-circle">💳</div>
          <span className="checkout-step-label">Pagamento</span>
        </button>
      </div>

      {/* ── 3. Grid Principal ── */}
      <div className="checkout-container">
        <div className="checkout-grid">
          
          {/* Coluna Esquerda: Entrega OU Pagamento */}
          <div className="checkout-main-col">
            
            {/* ═══════════ ETAPA 1: ENTREGA ═══════════ */}
            {etapa === 'entrega' && (
              <form onSubmit={handleAvancarParaPagamento} className="checkout-box">
                <h2 className="checkout-section-title">
                  <IconMapPin /> Dados de Contato e Entrega
                </h2>

                <div className="checkout-priority-box">
                  <IconInfo />
                  <span>
                    Preencha os dados onde deseja receber sua encomenda. O pagamento será realizado no próximo passo.
                  </span>
                </div>

                {enderecosSalvos.length > 1 && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#555' }}>
                      Selecione um de seus endereços cadastrados:
                    </label>
                    <select
                      className="checkout-input"
                      style={{ marginTop: '4px' }}
                      onChange={(e) => {
                        const selecionado = enderecosSalvos.find((end) => String(end.id) === e.target.value);
                        if (selecionado) {
                          setEndereco({
                            cep: selecionado.cep || '',
                            logradouro: selecionado.logradouro || '',
                            numero: selecionado.numero || '',
                            complemento: selecionado.complemento || '',
                            bairro: selecionado.bairro || '',
                            cidade: selecionado.cidade || '',
                            estado: selecionado.estado || '',
                          });
                        }
                      }}
                    >
                      {enderecosSalvos.map((end, idx) => (
                        <option key={end.id} value={end.id}>
                          {end.logradouro}, {end.numero} - {end.bairro}, {end.cidade}/{end.estado} (CEP {end.cep}) {idx === 0 ? ' [Padrão]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="checkout-form-grid">
                  <div className="checkout-input-row">
                    <div className="checkout-input-group">
                      <label>Seu Nome Completo *</label>
                      <input
                        type="text"
                        required
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="checkout-input"
                        placeholder="Ex: João da Silva"
                      />
                    </div>
                    <div className="checkout-input-group">
                      <label>E-mail de Contato *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="checkout-input"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <div className="checkout-input-row">
                    <div className="checkout-input-group">
                      <label>Telefone / WhatsApp *</label>
                      <input
                        type="text"
                        required
                        maxLength="15"
                        value={telefone}
                        onChange={(e) => setTelefone(formatarTelefoneInput(e.target.value))}
                        className="checkout-input"
                        placeholder="Ex: (48) 99123-4567"
                      />
                    </div>
                    <div className="checkout-input-group">
                      <label>Seu CPF *</label>
                      <input
                        type="text"
                        required
                        maxLength="14"
                        value={cpf}
                        onChange={(e) => {
                          const valFmt = formatarCpfInput(e.target.value);
                          setCpf(valFmt);
                          if (!cpfTitular || cpfTitular === cpf) {
                            setCpfTitular(valFmt);
                          }
                        }}
                        className="checkout-input"
                        placeholder="Ex: 123.456.789-00"
                      />
                    </div>
                  </div>

                  <div className="checkout-input-row">
                    <div className="checkout-input-group">
                      <label>CEP * {buscandoCep && <small>(Buscando...)</small>}</label>
                      <input
                        type="text"
                        required
                        maxLength="9"
                        value={endereco.cep}
                        onBlur={handleCepBlur}
                        onChange={(e) => setEndereco({ ...endereco, cep: e.target.value })}
                        className="checkout-input"
                        placeholder="Ex: 01001-000"
                      />
                    </div>
                  </div>

                  <div className="checkout-input-row-3">
                    <div className="checkout-input-group">
                      <label>Endereço (Rua/Avenida) *</label>
                      <input
                        type="text"
                        required
                        value={endereco.logradouro}
                        onChange={(e) => setEndereco({ ...endereco, logradouro: e.target.value })}
                        className="checkout-input"
                        placeholder="Ex: Av. Paulista"
                      />
                    </div>
                    <div className="checkout-input-group">
                      <label>Número *</label>
                      <input
                        type="text"
                        required
                        value={endereco.numero}
                        onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })}
                        className="checkout-input"
                        placeholder="Ex: 1000"
                      />
                    </div>
                    <div className="checkout-input-group">
                      <label>Complemento</label>
                      <input
                        type="text"
                        value={endereco.complemento}
                        onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })}
                        className="checkout-input"
                        placeholder="Ex: Apto 42"
                      />
                    </div>
                  </div>

                  <div className="checkout-input-row-3">
                    <div className="checkout-input-group">
                      <label>Bairro *</label>
                      <input
                        type="text"
                        required
                        value={endereco.bairro}
                        onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })}
                        className="checkout-input"
                        placeholder="Ex: Bela Vista"
                      />
                    </div>
                    <div className="checkout-input-group">
                      <label>Cidade *</label>
                      <input
                        type="text"
                        required
                        value={endereco.cidade}
                        onChange={(e) => setEndereco({ ...endereco, cidade: e.target.value })}
                        className="checkout-input"
                        placeholder="Ex: São Paulo"
                      />
                    </div>
                    <div className="checkout-input-group">
                      <label>UF *</label>
                      <input
                        type="text"
                        required
                        maxLength="2"
                        value={endereco.estado}
                        onChange={(e) => setEndereco({ ...endereco, estado: e.target.value.toUpperCase() })}
                        className="checkout-input"
                        placeholder="SP"
                      />
                    </div>
                  </div>

                  {/* Seleção do Tipo de Envio */}
                  {loadingFrete && opcoesFrete.length === 0 ? (
                    <div style={{ marginTop: '16px', padding: '12px 14px', background: '#f8f9fa', borderRadius: '6px', border: '1px dashed #ccc', fontSize: '13px', color: '#666' }}>
                      Calculando opções e prazos de frete para o seu CEP...
                    </div>
                  ) : opcoesFrete.length > 0 ? (
                    <div style={{ marginTop: '10px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#555' }}>
                        Selecione a Modalidade de Envio:
                      </label>
                      <div className="checkout-shipping-select-list">
                        {opcoesFrete.map((opt) => {
                          const isSelected = freteAtual?.id === opt.id;
                          return (
                            <div
                              key={opt.id}
                              className={`checkout-shipping-option-card ${isSelected ? 'selected' : ''}`}
                              onClick={() => setSelectedShipping(opt)}
                            >
                              <div className="shipping-radio">
                                {isSelected && <div className="shipping-radio-dot" />}
                              </div>
                              <div className="shipping-details">
                                <span className="shipping-name">{opt.nome}</span>
                                <span className="shipping-deadline">{opt.prazo}</span>
                              </div>
                              <span className="shipping-price" style={{ color: opt.preco === 0 ? '#1e8449' : 'inherit' }}>
                                {opt.preco === 0 ? 'GRÁTIS' : `R$ ${Number(opt.preco).toFixed(2).replace('.', ',')}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '16px', padding: '12px 14px', background: '#f8f9fa', borderRadius: '6px', border: '1px dashed #ccc', fontSize: '13px', color: '#666' }}>
                      Informe um CEP válido acima para carregar as opções e prazos de frete.
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="checkout-submit-btn"
                  style={{ marginTop: '28px' }}
                >
                  CONTINUAR PARA O PAGAMENTO
                </button>
              </form>
            )}

            {/* ═══════════ ETAPA 2: PAGAMENTO (FIGMA EXATO) ═══════════ */}
            {etapa === 'pagamento' && (
              <>
                {/* Resumo do que foi preenchido na entrega */}
                <div className="checkout-box">
                  <div className="checkout-priority-box">
                    <IconInfo />
                    <span>
                      Escolha como receber sua encomenda. Pagamento aprovado, seu pedido entra em preparação com prioridade.
                    </span>
                  </div>

                  <div className="checkout-info-row">
                    <div className="checkout-info-content">
                      <IconMail />
                      <div className="checkout-info-text">
                        <strong>{email}</strong>
                      </div>
                    </div>
                    <button type="button" className="checkout-action-link" onClick={() => setEtapa('entrega')}>
                      Alterar
                    </button>
                  </div>

                  <div className="checkout-info-row">
                    <div className="checkout-info-content">
                      <IconMapPin />
                      <div className="checkout-info-text">
                        <strong>{endereco.logradouro} {endereco.numero}</strong>
                        <span>CEP {endereco.cep} - {endereco.bairro}</span>
                        <span>{endereco.cidade}, {endereco.estado} - {telefone}</span>
                      </div>
                    </div>
                    <button type="button" className="checkout-action-link" onClick={() => setEtapa('entrega')}>
                      Alterar
                    </button>
                  </div>

                  <div className="checkout-info-row">
                    <div className="checkout-info-content">
                      <IconTruck />
                      <div className="checkout-info-text">
                        <strong>{tipoFreteNome} · R${freteValor.toFixed(2).replace('.', ',')}</strong>
                        <span>{freteAtual.prazo}</span>
                      </div>
                    </div>
                    <button type="button" className="checkout-action-link" onClick={() => setEtapa('entrega')}>
                      Alterar
                    </button>
                  </div>

                  <div className="checkout-info-row">
                    <div className="checkout-info-content">
                      <IconMessage />
                      <div className="checkout-info-text">
                        <strong>Observações personalizadas</strong>
                        {observacoes && <span>{observacoes}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="checkout-action-link"
                      onClick={() => {
                        const txt = prompt('Digite observações para o pedido:', observacoes);
                        if (txt !== null) setObservacoes(txt);
                      }}
                    >
                      {observacoes ? 'Editar' : 'Adicionar'}
                    </button>
                  </div>
                </div>

                {/* Formas de Pagamento Accordion ou Confirmação Coberta por Benefícios */}
                <h2 className="checkout-payment-heading">Forma de pagamento</h2>

                {cobertoPorBeneficios ? (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #faf5ff 0%, #ecf8f0 100%)',
                      border: '1.5px solid #7e22ce',
                      borderRadius: '10px',
                      padding: '18px 20px',
                      marginBottom: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '22px' }}>🎟️</span>
                      <div>
                        <strong style={{ fontSize: '15px', color: '#1e1e1e', display: 'block' }}>
                          Pedido 100% Coberto por Benefícios
                        </strong>
                        <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 700 }}>
                          Total a pagar em dinheiro: R$ 0,00 · Não é necessário cartão ou PIX
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.55, marginTop: '8px' }}>
                      {descontoProdutoEfetivo + descontoFreteEfetivo > 0 && (
                        <div>
                          • Cupom <strong>{cupom?.codigo}</strong>: desconto de{' '}
                          <strong>
                            R$ {(descontoProdutoEfetivo + descontoFreteEfetivo).toFixed(2).replace('.', ',')}
                          </strong>
                        </div>
                      )}
                      {abatimentoVale > 0 && (
                        <div>
                          • Vale-Compra <strong>{valeCompra?.codigo}</strong>: abatimento de{' '}
                          <strong>R$ {abatimentoVale.toFixed(2).replace('.', ',')}</strong> neste pedido
                        </div>
                      )}
                    </div>

                    {valeCompra && saldoRestanteNoVale > 0 && (
                      <div
                        style={{
                          marginTop: '12px',
                          background: '#fff',
                          border: '1px solid #d8b4fe',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          fontSize: '12.5px',
                          color: '#5b21b6',
                          fontWeight: 600,
                        }}
                      >
                        ✨ O seu vale-compra ({valeCompra.codigo}) possui{' '}
                        <strong>R$ {saldoDisponivelVale.toFixed(2).replace('.', ',')}</strong>, abaterá{' '}
                        <strong>R$ {abatimentoVale.toFixed(2).replace('.', ',')}</strong> agora e{' '}
                        <strong>continuará ATIVO com R$ {saldoRestanteNoVale.toFixed(2).replace('.', ',')} de saldo</strong>{' '}
                        para suas compras futuras!
                      </div>
                    )}
                  </div>
                ) : (
                <div className="checkout-payment-options">
                  {/* Cartão de Crédito */}
                  <div className={`checkout-payment-card ${metodoPagamento === 'cartao' ? 'selected' : ''}`}>
                    <div className="checkout-payment-header" onClick={() => setMetodoPagamento('cartao')}>
                      <div className="checkout-payment-left">
                        <IconCreditCard />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, display: 'block', fontSize: '14px', color: '#111' }}>
                              Cartão de Crédito
                            </span>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fff', padding: '1px 5px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                              {['visa', 'mastercard', 'elo', 'amex', 'hipercard'].map((b) => (
                                <CardBrandIcon key={b} brand={b} height={13} />
                              ))}
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, display: 'block', marginTop: '2px' }}>
                            À vista ou em até {maxParcelas}x sem juros (aceita cartões de crédito e múltiplos)
                          </span>
                        </div>
                      </div>
                      <span className="checkout-payment-arrow">›</span>
                    </div>

                    {metodoPagamento === 'cartao' && (
                      <div className="checkout-payment-body">
                        {/* Seletor de cartões salvos */}
                        {cartoesSalvos.length > 0 && (
                          <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#555', display: 'block', marginBottom: '8px' }}>
                              Escolha um cartão salvo:
                            </label>
                            <div className="checkout-saved-cards-list">
                              {cartoesSalvos.map((c) => {
                                const isSel = cartaoSelecionadoId === c.id;
                                return (
                                  <div
                                    key={c.id}
                                    className={`checkout-saved-card-item ${isSel ? 'selected' : ''}`}
                                    onClick={() => {
                                      setCartaoSelecionadoId(c.id);
                                      setCartao((prev) => ({
                                        ...prev,
                                        numero: c.numero,
                                        titular: c.titular,
                                        validade: c.validade,
                                      }));
                                      if (c.cpf) {
                                        setCpfTitular(formatarCpfInput(c.cpf));
                                      }
                                    }}
                                  >
                                    <div className="checkout-saved-card-left">
                                      <div className="checkout-saved-card-radio" />
                                      <div>
                                        <strong>•••• •••• •••• {c.ultimos_digitos}</strong>
                                        <span className="checkout-saved-card-badge">Crédito</span>
                                        <div style={{ fontSize: '11px', color: '#666' }}>
                                          {c.titular} · Validade: {c.validade}
                                        </div>
                                      </div>
                                    </div>
                                    <CardBrandIcon brand={c.bandeira || detectarBandeira(c.numero)} height={22} withBackground />
                                  </div>
                                );
                              })}

                              {/* Opção de outro cartão */}
                              <div
                                className={`checkout-saved-card-item ${cartaoSelecionadoId === 'novo' ? 'selected' : ''}`}
                                onClick={() => {
                                  setCartaoSelecionadoId('novo');
                                  setCartao({ numero: '', titular: '', validade: '', cvv: '' });
                                }}
                              >
                                <div className="checkout-saved-card-left">
                                  <div className="checkout-saved-card-radio" />
                                  <span>+ Usar outro cartão</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="checkout-card-form">
                          {cartaoSelecionadoId === 'novo' ? (
                            <>
                              <div className="checkout-input-group">
                                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>Número do Cartão *</span>
                                  {detectarBandeira(cartao.numero) && (
                                    <CardBrandIcon brand={detectarBandeira(cartao.numero)} height={22} withBackground />
                                  )}
                                </label>
                                <input
                                  type="text"
                                  placeholder="0000 0000 0000 0000"
                                  maxLength="19"
                                  autoComplete="off"
                                  value={cartao.numero}
                                  onChange={(e) => {
                                    let v = e.target.value.replace(/\D/g, '').slice(0, 16);
                                    v = v.replace(/(\d{4})/g, '$1 ').trim();
                                    setCartao({ ...cartao, numero: v });
                                  }}
                                  className="checkout-input"
                                />
                              </div>
                              <div className="checkout-input-row">
                                <div className="checkout-input-group">
                                  <label>Nome impresso no Cartão *</label>
                                  <input
                                    type="text"
                                    placeholder="Nome como no cartão"
                                    autoComplete="off"
                                    value={cartao.titular}
                                    onChange={(e) => setCartao({ ...cartao, titular: e.target.value.toUpperCase() })}
                                    className="checkout-input"
                                  />
                                </div>
                                <div className="checkout-input-group">
                                  <label>CPF do Titular</label>
                                  <input
                                    type="text"
                                    placeholder="000.000.000-00"
                                    maxLength="14"
                                    autoComplete="off"
                                    value={cpfTitular}
                                    onChange={(e) => setCpfTitular(formatarCpfInput(e.target.value))}
                                    className="checkout-input"
                                  />
                                </div>
                              </div>
                              <div className="checkout-input-row">
                                <div className="checkout-input-group">
                                  <label>Validade *</label>
                                  <input
                                    type="text"
                                    placeholder="MM/AA"
                                    maxLength="5"
                                    autoComplete="off"
                                    value={cartao.validade}
                                    onChange={(e) => {
                                      let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                                      if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                                      setCartao({ ...cartao, validade: v });
                                    }}
                                    className="checkout-input"
                                  />
                                </div>
                                <div className="checkout-input-group">
                                  <label>CVV (Código de segurança) *</label>
                                  <input
                                    type="password"
                                    placeholder="123"
                                    maxLength="4"
                                    autoComplete="off"
                                    value={cartao.cvv}
                                    onChange={(e) => setCartao({ ...cartao, cvv: e.target.value })}
                                    className="checkout-input"
                                  />
                                </div>
                              </div>
                            </>
                          ) : (
                            <div>
                              <div className="checkout-input-group" style={{ maxWidth: '240px' }}>
                                <label>CVV (Código de segurança) *</label>
                                <input
                                  type="password"
                                  placeholder="Ex: 123"
                                  maxLength="4"
                                  value={cartao.cvv}
                                  onChange={(e) => setCartao({ ...cartao, cvv: e.target.value })}
                                  className="checkout-input"
                                  required
                                />
                              </div>
                              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px', marginBottom: '8px' }}>
                                🔒 Por segurança, informe apenas o código CVV de 3 a 4 dígitos impresso no verso do cartão.
                              </div>
                            </div>
                          )}

                          {/* Parcelamento (Crédito) */}
                          <div className="checkout-input-group" style={{ marginTop: '8px' }}>
                            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                              <span>Opções de Parcelamento</span>
                              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, textTransform: 'none' }}>
                                (mínimo de R$ {(parcelaMinima || 50).toFixed(2).replace('.', ',')} por parcela a partir de 2x)
                              </span>
                            </label>
                            <select
                              value={parcelasCartao}
                              onChange={(e) => setParcelasCartao(Number(e.target.value))}
                              className="checkout-input"
                              style={{ cursor: 'pointer', background: '#fff' }}
                            >
                              {Array.from({ length: maxParcelasDisponiveis }, (_, i) => i + 1).map((n) => {
                                if (n <= maxParcelas) {
                                  const valorParcela = (totalFinal / n).toFixed(2).replace('.', ',');
                                  return (
                                    <option key={n} value={n}>
                                      {n}x de R$ {valorParcela} sem juros {n === 1 ? '(À vista)' : ''}
                                    </option>
                                  );
                                }
                                const taxaJuros = 0.025 + (n - maxParcelas) * 0.015;
                                const totalComJuros = totalFinal * (1 + taxaJuros);
                                const valorParcela = (totalComJuros / n).toFixed(2).replace('.', ',');
                                const totalFmt = totalComJuros.toFixed(2).replace('.', ',');
                                return (
                                  <option key={n} value={n}>
                                    {n}x de R$ {valorParcela} com juros (Total: R$ {totalFmt})
                                  </option>
                                );
                              })}
                            </select>
                            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginTop: '6px' }}>
                              💡 Cartões múltiplos (com função crédito e débito) são processados à vista em 1x pela operadora.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pix */}
                  <div className={`checkout-payment-card ${metodoPagamento === 'pix' ? 'selected' : ''}`}>
                    <div className="checkout-payment-header" onClick={() => setMetodoPagamento('pix')}>
                      <div className="checkout-payment-left">
                        <IconPix />
                        <div>
                          <span style={{ fontWeight: 700, display: 'block', fontSize: '14px', color: '#111' }}>
                            PIX — Débito Instantâneo em Conta
                          </span>
                          <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600, display: 'block', marginTop: '2px' }}>
                            Aprovação em segundos · Saída direta do saldo bancário
                          </span>
                        </div>
                      </div>
                      <div className="checkout-payment-right">
                        <span>Pague R${totalFinal.toFixed(2).replace('.', ',')}</span>
                        <span className="checkout-payment-arrow">›</span>
                      </div>
                    </div>

                    {metodoPagamento === 'pix' && (
                      <div className="checkout-payment-body">
                        <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                          ⚡ <strong>Débito instantâneo da sua conta bancária:</strong> Ao clicar em &quot;Fazer Pedido&quot;, será gerado o QR Code e a chave Copia e Cola para pagamento no app do seu banco (Nubank, Caixa, Itaú, Inter, etc.).
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                          O valor é debitado na hora do saldo da sua conta e o pedido é aprovado em segundos sem precisar de maquininha ou cartão físico.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                )}

                {/* Salvar dados da compra */}
                <div className="checkout-save-data-card">
                  <div className="checkout-save-data-left">
                    <input
                      type="checkbox"
                      id="salvar-dados"
                      checked={salvarDadosCompra}
                      onChange={(e) => setSalvarDadosCompra(e.target.checked)}
                    />
                    <label htmlFor="salvar-dados">Salvar dados para <strong>comprar mais rápido</strong> na Salv Sacra</label>
                  </div>
                  <div className="checkout-nuvem-tag">
                    <span>🔒 Compra Segura</span>
                  </div>
                </div>

                {/* Botão FAZER PEDIDO */}
                <button
                  type="button"
                  className="checkout-submit-btn"
                  disabled={loading}
                  onClick={handleFinalizarPedido}
                >
                  {loading
                    ? 'PROCESSANDO...'
                    : cobertoPorBeneficios
                      ? valeCompra
                        ? 'CONFIRMAR PEDIDO COM VALE-COMPRA'
                        : 'CONFIRMAR PEDIDO GRATUITO'
                      : 'FAZER PEDIDO'}
                </button>
              </>
            )}

          </div>

          {/* Coluna Direita: Resumo do Pedido (sempre visível em todas as etapas) */}
          <div className="checkout-summary-col">
            <div className="checkout-items-list">
              {items.length === 0 ? (
                <div className="checkout-summary-item">
                  <div className="checkout-summary-thumb">
                    <span>🕊️</span>
                  </div>
                  <div className="checkout-summary-details">
                    <div className="checkout-summary-name">CAMISETA CEIA (Preto, PP)</div>
                    <div className="checkout-summary-qty">x 1</div>
                  </div>
                  <div className="checkout-summary-price">R$79,90</div>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={idx} className="checkout-summary-item">
                    <div className="checkout-summary-thumb">
                      {item.imagem ? (
                        <img src={item.imagem} alt={item.nome} />
                      ) : (
                        <span>🕊️</span>
                      )}
                    </div>
                    <div className="checkout-summary-details">
                      <div className="checkout-summary-name">
                        {item.nome} ({item.cor}, {item.tamanho})
                      </div>
                      <div className="checkout-summary-qty">x {item.quantidade}</div>
                    </div>
                    <div className="checkout-summary-price">
                      R${(Number(item.preco) * item.quantidade).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Linhas de Valores */}
            <div className="checkout-totals-block">
              <div className="checkout-total-line">
                <span>Subtotal dos produtos</span>
                <span>R${subtotalBase.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="checkout-total-line">
                <span>Custo de frete</span>
                <span>
                  {loadingFrete
                    ? 'Calculando...'
                    : freteValor > 0
                    ? `R$${freteValor.toFixed(2).replace('.', ',')}`
                    : 'Grátis (R$0,00)'}
                </span>
              </div>
              {descontoProdutoEfetivo > 0 && (
                <div className="checkout-total-line" style={{ color: '#1e8449', fontWeight: 700 }}>
                  <span>Desconto de Produto ({cupom?.codigo} · {Number(cupom?.percentual)}%)</span>
                  <span>− R${descontoProdutoEfetivo.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              {descontoFreteEfetivo > 0 && (
                <div className="checkout-total-line" style={{ color: '#1e8449', fontWeight: 700 }}>
                  <span>Desconto de Frete ({cupom?.codigo} · {Number(cupom?.percentual)}%)</span>
                  <span>− R${descontoFreteEfetivo.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              {abatimentoVale > 0 && (
                <div className="checkout-total-line" style={{ color: '#6b21a8', fontWeight: 700 }}>
                  <span>Vale-Compra ({valeCompra?.codigo})</span>
                  <span>− R${abatimentoVale.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              {valeCompra && saldoRestanteNoVale > 0 && (
                <div
                  style={{
                    background: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    fontSize: '11.5px',
                    color: '#5b21b6',
                    fontWeight: 600,
                    margin: '6px 0',
                    lineHeight: 1.4,
                  }}
                >
                  Saldo do vale: R${saldoDisponivelVale.toFixed(2).replace('.', ',')} · Abatido: R${abatimentoVale.toFixed(2).replace('.', ',')} ·{' '}
                  <strong>Restarão R${saldoRestanteNoVale.toFixed(2).replace('.', ',')} ativos</strong> para compras futuras.
                </div>
              )}
              <div className="checkout-total-line final">
                <span>Total a pagar em dinheiro</span>
                <span>R${totalFinal.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            {/* Cupom de desconto: lista de cupons disponíveis com aplicação automática */}
            <CupomSelector />
          </div>

        </div>
      </div>

      {/* ── Modal de Aviso / Erro no Cartão ── */}
      {modalAviso.aberto && (
        <div
          className="checkout-modal-overlay"
          onClick={fecharModalAviso}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="checkout-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="checkout-modal-close"
              onClick={fecharModalAviso}
              aria-label="Fechar"
            >
              ×
            </button>

            <div className={`checkout-modal-icon-wrap ${modalAviso.tipo === 'info' ? 'info' : 'alert'}`}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h3 className="checkout-modal-title">{modalAviso.titulo}</h3>
            <p className="checkout-modal-desc">{modalAviso.mensagem}</p>

            <div className="checkout-modal-actions">
              {modalAviso.sugestaoPix ? (
                <>
                  <button
                    type="button"
                    className="checkout-modal-btn-pix"
                    onClick={() => {
                      setMetodoPagamento('pix');
                      fecharModalAviso();
                      setTimeout(() => {
                        const el = document.querySelector('.checkout-payment-heading');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                  >
                    <IconPix /> Pagar via PIX (Aprovação Instantânea)
                  </button>

                  <button
                    type="button"
                    className="checkout-modal-btn-secondary"
                    onClick={fecharModalAviso}
                  >
                    Tentar outro cartão ou Crédito
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="checkout-modal-btn-primary"
                  onClick={fecharModalAviso}
                >
                  Entendi
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
