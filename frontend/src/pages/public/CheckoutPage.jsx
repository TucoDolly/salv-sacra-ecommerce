import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import logoImg from '../../assets/logo.webp';
import '../../styles/checkout.css';

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

const IconPix = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L4 12l8 10 8-10-8-10z" />
    <path d="M12 6L7 12l5 6 5-6-5-6z" />
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

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { items, subtotal, selectedShipping, setSelectedShipping, openCart, clearCart } = useCart();

  // Etapa atual do checkout: 'entrega' | 'pagamento'
  const [etapa, setEtapa] = useState('entrega');

  // Dados de contato e endereço
  const [email, setEmail] = useState(user?.email || 'tucopaes@gmail.com');
  const [nome, setNome] = useState(user?.name || 'Tuco Paes');
  const [telefone, setTelefone] = useState('(48) 99825-7778');
  const [endereco, setEndereco] = useState({
    cep: '88701-260',
    logradouro: 'Rua São José',
    numero: '387',
    complemento: '',
    bairro: 'Centro',
    cidade: 'Tubarão',
    estado: 'SC',
  });

  const [buscandoCep, setBuscandoCep] = useState(false);
  const [observacoes, setObservacoes] = useState('');

  // Opções de envio disponíveis
  const opcoesFrete = [
    {
      id: 'sedex',
      nome: 'Nuvem Envio Correios SEDEX',
      prazo: 'Chega terça-feira 12/05',
      preco: 12.47,
    },
    {
      id: 'jadlog',
      nome: 'Nuvem Envio - Jadlog Rápido',
      prazo: 'Chega segunda 18/05',
      preco: 19.74,
    },
  ];

  // Pagamento: 'cartao' | 'pix' | 'boleto'
  const [metodoPagamento, setMetodoPagamento] = useState('cartao');
  const [cartao, setCartao] = useState({
    numero: '',
    titular: '',
    validade: '',
    cvv: '',
  });

  const [loading, setLoading] = useState(false);
  const [pedidoConcluido, setPedidoConcluido] = useState(null);

  // Só usuários logados podem finalizar uma compra
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { state: { from: '/checkout' }, replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Cálculos de valor
  const freteAtual = selectedShipping || opcoesFrete[0];
  const freteValor = freteAtual.preco;
  const tipoFreteNome = freteAtual.nome;
  const totalBase = (subtotal || 79.9) + freteValor;
  const descontoBoletoPix = (metodoPagamento === 'pix' || metodoPagamento === 'boleto') ? totalBase * 0.05 : 0;
  const totalFinal = totalBase - descontoBoletoPix;

  // Busca automática do CEP via ViaCEP
  const handleCepBlur = async (e) => {
    const cepLimpo = e.target.value.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
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
      alert('Por favor, preencha os dados obrigatórios de entrega.');
      return;
    }
    setEtapa('pagamento');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalizarPedido = async () => {
    if (items.length === 0) {
      alert('Seu carrinho está vazio.');
      navigate('/');
      return;
    }

    setLoading(true);

    const payload = {
      email_contato: email,
      telefone: telefone,
      cep: endereco.cep,
      logradouro: endereco.logradouro,
      numero: endereco.numero,
      complemento: endereco.complemento,
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      estado: endereco.estado,
      tipo_frete: tipoFreteNome,
      valor_frete: freteValor,
      metodo_pagamento: metodoPagamento,
      observacoes: observacoes,
      itens: items.map((i) => ({
        produto_id: i.produtoId,
        variacao_id: i.variacaoId || null,
        quantidade: i.quantidade,
        preco: i.preco,
      })),
    };

    try {
      const res = await api.post('/pedidos', payload);
      setPedidoConcluido(res.data.pedido);
      clearCart();
    } catch (err) {
      console.error('Erro ao finalizar pedido:', err);
      if (err.response?.status === 401) {
        navigate('/login', { state: { from: '/checkout' } });
      } else {
        const errs = err.response?.data?.errors;
        alert(
          (errs && Object.values(errs)[0]?.[0]) ||
          err.response?.data?.message ||
          'Não foi possível finalizar o pedido. Tente novamente.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !isAuthenticated) return null;

  // Sucesso
  if (pedidoConcluido) {
    return (
      <div className="checkout-page">
        <header className="checkout-header">
          <div className="checkout-header-inner">
            <Link to="/" className="checkout-logo-link">
              <img src={logoImg} alt="Salv Sacra" className="checkout-logo-img" />
            </Link>
            <div className="checkout-safe-badge">
              <span className="checkout-safe-icon"><IconShieldCheck /></span>
              <span>Compra 100% Segura</span>
            </div>
          </div>
        </header>

        <div className="checkout-success-wrap">
          <div className="checkout-success-icon">✓</div>
          <h2>Pedido Realizado com Sucesso!</h2>
          <p style={{ marginTop: '8px', color: '#666' }}>
            Número do Pedido: <strong>#{pedidoConcluido.id}</strong>
          </p>
          <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
            Enviamos a confirmação para <strong>{pedidoConcluido.email_contato || email}</strong>
          </p>

          {metodoPagamento === 'pix' && (
            <div className="checkout-pix-box">
              <h4 style={{ color: '#c4953a', marginBottom: '8px' }}>Chave PIX Copia e Cola</h4>
              <code style={{ fontSize: '12px', background: '#fff', padding: '6px 12px', border: '1px solid #ddd', borderRadius: '4px', display: 'block', wordBreak: 'break-all' }}>
                00020126580014br.gov.bcb.pix0136salvsacra-pix-demo-{pedidoConcluido.id}5204000053039865802BR5925SALV SACRA ECOMMERCE6009TUBARAO62070503***6304E2D1
              </code>
              <p style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
                Abra seu banco e pague com desconto: <strong>R$ {totalFinal.toFixed(2).replace('.', ',')}</strong>
              </p>
            </div>
          )}

          {metodoPagamento === 'boleto' && (
            <div className="checkout-pix-box">
              <h4 style={{ color: '#c4953a', marginBottom: '8px' }}>Boleto Bancário Gerado</h4>
              <p style={{ fontSize: '12px', color: '#444' }}>Linha digitável: <strong>34191.79001 01043.510047 91020.150008 8 98450000009237</strong></p>
            </div>
          )}

          <div style={{ marginTop: '30px' }}>
            <Link to="/" className="checkout-submit-btn" style={{ textDecoration: 'none', textAlign: 'center', lineHeight: '52px' }}>
              Voltar para a Loja
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      {/* ── 1. Topo Seguro com Logo Proporcional ── */}
      <header className="checkout-header">
        <div className="checkout-header-inner">
          <Link to="/" className="checkout-logo-link">
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
                        value={telefone}
                        onChange={(e) => setTelefone(e.target.value)}
                        className="checkout-input"
                        placeholder="(48) 99999-9999"
                      />
                    </div>
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
                        placeholder="88701-260"
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
                        placeholder="Rua São José"
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
                        placeholder="387"
                      />
                    </div>
                    <div className="checkout-input-group">
                      <label>Complemento</label>
                      <input
                        type="text"
                        value={endereco.complemento}
                        onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })}
                        className="checkout-input"
                        placeholder="Apto 102"
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
                        placeholder="Centro"
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
                        placeholder="Tubarão"
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
                        placeholder="SC"
                      />
                    </div>
                  </div>

                  {/* Seleção do Tipo de Envio */}
                  <div style={{ marginTop: '10px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#555' }}>
                      Selecione a Modalidade de Envio:
                    </label>
                    <div className="checkout-shipping-select-list">
                      {opcoesFrete.map((opt) => {
                        const isSelected = freteAtual.id === opt.id;
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
                            <span className="shipping-price">
                              R${opt.preco.toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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

                {/* Formas de Pagamento Accordion */}
                <h2 className="checkout-payment-heading">Forma de pagamento</h2>

                <div className="checkout-payment-options">
                  {/* Cartão de Crédito */}
                  <div className={`checkout-payment-card ${metodoPagamento === 'cartao' ? 'selected' : ''}`}>
                    <div className="checkout-payment-header" onClick={() => setMetodoPagamento('cartao')}>
                      <div className="checkout-payment-left">
                        <IconCreditCard />
                        <span>Cartão de crédito</span>
                      </div>
                      <span className="checkout-payment-arrow">›</span>
                    </div>

                    {metodoPagamento === 'cartao' && (
                      <div className="checkout-payment-body">
                        <div className="checkout-card-form">
                          <div className="checkout-input-group">
                            <label>Número do Cartão</label>
                            <input
                              type="text"
                              placeholder="0000 0000 0000 0000"
                              maxLength="19"
                              value={cartao.numero}
                              onChange={(e) => setCartao({ ...cartao, numero: e.target.value })}
                              className="checkout-input"
                            />
                          </div>
                          <div className="checkout-input-group">
                            <label>Nome impresso no Cartão</label>
                            <input
                              type="text"
                              placeholder="Nome como no cartão"
                              value={cartao.titular}
                              onChange={(e) => setCartao({ ...cartao, titular: e.target.value })}
                              className="checkout-input"
                            />
                          </div>
                          <div className="checkout-input-row">
                            <div className="checkout-input-group">
                              <label>Validade</label>
                              <input
                                type="text"
                                placeholder="MM/AA"
                                maxLength="5"
                                value={cartao.validade}
                                onChange={(e) => setCartao({ ...cartao, validade: e.target.value })}
                                className="checkout-input"
                              />
                            </div>
                            <div className="checkout-input-group">
                              <label>CVV</label>
                              <input
                                type="password"
                                placeholder="123"
                                maxLength="4"
                                value={cartao.cvv}
                                onChange={(e) => setCartao({ ...cartao, cvv: e.target.value })}
                                className="checkout-input"
                              />
                            </div>
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
                        <span>Pix</span>
                      </div>
                      <div className="checkout-payment-right">
                        <span>Pague R${(totalBase * 0.95).toFixed(2).replace('.', ',')}</span>
                        <span className="checkout-payment-arrow">›</span>
                      </div>
                    </div>

                    {metodoPagamento === 'pix' && (
                      <div className="checkout-payment-body">
                        <p>Ao clicar em fazer pedido, você receberá a chave PIX e o QR Code com <strong>5% de desconto</strong> para pagamento imediato.</p>
                      </div>
                    )}
                  </div>

                  {/* Boleto Bancário */}
                  <div className={`checkout-payment-card ${metodoPagamento === 'boleto' ? 'selected' : ''}`}>
                    <div className="checkout-payment-header" onClick={() => setMetodoPagamento('boleto')}>
                      <div className="checkout-payment-left">
                        <IconBarcode />
                        <span>Boleto bancário</span>
                      </div>
                      <div className="checkout-payment-right">
                        <span>Pague R${(totalBase * 0.95).toFixed(2).replace('.', ',')}</span>
                        <span className="checkout-payment-arrow">›</span>
                      </div>
                    </div>

                    {metodoPagamento === 'boleto' && (
                      <div className="checkout-payment-body">
                        <p>O boleto será gerado com vencimento em até 3 dias úteis. Compensação em até 48 horas.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Salvar dados Nuvem */}
                <div className="checkout-save-data-card">
                  <div className="checkout-save-data-left">
                    <input type="checkbox" id="salvar-dados" defaultChecked />
                    <label htmlFor="salvar-dados">Salvar dados para <strong>comprar mais rápido</strong></label>
                  </div>
                  <div className="checkout-nuvem-tag">
                    <span>☁ nuvem</span>
                  </div>
                </div>

                <p style={{ fontSize: '11px', color: '#777', textAlign: 'center' }}>
                  Nas próximas compras enviaremos um código para: <strong>{telefone}</strong> · <button type="button" onClick={() => setEtapa('entrega')} style={{ background: 'none', border: 'none', color: '#1e1e1e', textDecoration: 'underline', cursor: 'pointer' }}>Alterar</button>
                </p>

                {/* Botão FAZER PEDIDO */}
                <button
                  type="button"
                  className="checkout-submit-btn"
                  disabled={loading}
                  onClick={handleFinalizarPedido}
                >
                  {loading ? 'PROCESSANDO...' : 'FAZER PEDIDO'}
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
                <span>Subtotal</span>
                <span>R${(subtotal || 79.9).toFixed(2).replace('.', ',')}</span>
              </div>
              <div className="checkout-total-line">
                <span>Custo de frete</span>
                <span>R${freteValor.toFixed(2).replace('.', ',')}</span>
              </div>
              {descontoBoletoPix > 0 && etapa === 'pagamento' && (
                <div className="checkout-total-line" style={{ color: '#c4953a', fontWeight: 'bold' }}>
                  <span>Desconto 5% (Pix/Boleto)</span>
                  <span>- R${descontoBoletoPix.toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="checkout-total-line final">
                <span>Total</span>
                <span>R${totalFinal.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            {/* Botão Adicionar Cupom */}
            <button
              type="button"
              className="checkout-coupon-btn"
              onClick={() => {
                const cupom = prompt('Digite seu cupom de desconto:');
                if (cupom) alert(`Cupom "${cupom}" aplicado com sucesso!`);
              }}
            >
              <span>🏷</span> Adicionar cupom de desconto
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
