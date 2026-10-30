import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import CupomSelector from './CupomSelector';
import '../styles/carrinho-drawer.css';
import '../styles/cupom.css';

// Ícones SVG inline
const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b3631f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconTruck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const IconRotate = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

export default function CarrinhoDrawer() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    items,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem,
    subtotal,
    total,
    totalBoleto,
    shippingOptions,
    selectedShipping,
    setSelectedShipping,
    cep,
    setCep,
    cidadeDestino,
    ufDestino,
    loadingFrete,
    descontoCupom,
  } = useCart();

  const [editandoCep, setEditandoCep] = useState(false);
  const [cepInput, setCepInput] = useState(cep);

  const handleSalvarCep = (e) => {
    e.preventDefault();
    const limpo = cepInput.replace(/\D/g, '');
    if (limpo.length === 8) {
      const formatado = `${limpo.slice(0, 5)}-${limpo.slice(5)}`;
      setCep(formatado);
      setEditandoCep(false);
    } else {
      alert('Digite um CEP válido com 8 dígitos.');
    }
  };

  return (
    <>
      {/* Overlay escuro */}
      <div
        className={`cart-drawer-overlay ${isCartOpen ? 'open' : ''}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Aba Lateral */}
      <aside
        className={`cart-drawer ${isCartOpen ? 'open' : ''}`}
        aria-label="Carrinho de Compras"
      >
        {/* Cabeçalho */}
        <div className="cart-header">
          <span className="cart-header-title">Carrinho de Compras</span>
          <button
            type="button"
            className="cart-close-btn"
            onClick={closeCart}
            aria-label="Fechar carrinho"
          >
            <IconClose />
          </button>
        </div>

        {/* Corpo com Itens e Frete */}
        <div className="cart-body">
          {items.length === 0 ? (
            <div className="cart-empty-state">
              <span>🛒</span>
              <p>Sua sacola de compras está vazia.</p>
              <button
                type="button"
                className="cart-change-cep-btn"
                style={{ marginTop: '12px' }}
                onClick={closeCart}
              >
                Explorar Coleção
              </button>
            </div>
          ) : (
            <>
              {/* Itens */}
              <div className="cart-items-list">
                {items.map((item, index) => {
                  const precoNum = Number(item.preco || 79.9);
                  const precoOriginal = (precoNum * 1.12).toFixed(2);
                  const precoTotal = (precoNum * item.quantidade).toFixed(2);

                  return (
                    <div key={`${item.produtoId}-${item.modelo || 'Regular Fit'}-${item.tamanho}-${item.cor}-${index}`} className="cart-item-row">
                      <div className="cart-item-thumb">
                        {item.imagem ? (
                          <img src={item.imagem} alt={item.nome} />
                        ) : (
                          <span style={{ fontSize: '20px' }}>🕊️</span>
                        )}
                      </div>

                      <div className="cart-item-info">
                        <div className="cart-item-header">
                          <span className="cart-item-name">
                            {item.nome}{' '}
                            <span className="cart-item-variation">
                              ({item.modelo ? `${item.modelo}, ` : ''}{item.cor}, {item.tamanho})
                            </span>
                          </span>
                          <button
                            type="button"
                            className="cart-item-remove-btn"
                            title="Remover produto"
                            onClick={() => removeItem(index)}
                          >
                            <IconTrash />
                          </button>
                        </div>

                        <div className="cart-item-bottom-row">
                          {/* Quantidade */}
                          <div className="cart-item-qty">
                            <button
                              type="button"
                              className="cart-qty-btn"
                              onClick={() => updateQuantity(index, -1)}
                            >
                              −
                            </button>
                            <span className="cart-qty-num">{item.quantidade}</span>
                            <button
                              type="button"
                              className="cart-qty-btn"
                              onClick={() => updateQuantity(index, 1)}
                            >
                              +
                            </button>
                          </div>

                          {/* Preços */}
                          <div className="cart-item-pricing">
                            <span className="cart-item-old-price">
                              <span className="cart-item-discount-tag">-11%</span>
                              R${precoOriginal}
                            </span>
                            <span className="cart-item-price">
                              R${precoTotal}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Subtotal sem frete */}
              <div className="cart-subtotal-bar">
                <span>Subtotal (sem frete) :</span>
                <span className="cart-subtotal-val">
                  {subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>

              {/* Seção de CEP */}
              <div className="cart-cep-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    Entregas para: <strong>{cep}</strong>
                    {cidadeDestino && <span style={{ color: '#666', fontSize: '12px' }}> ({cidadeDestino}/{ufDestino})</span>}
                  </span>
                  <button
                    type="button"
                    className="cart-change-cep-btn"
                    onClick={() => {
                      setCepInput(cep);
                      setEditandoCep(!editandoCep);
                    }}
                  >
                    {editandoCep ? 'CANCELAR' : 'ALTERAR CEP'}
                  </button>
                </div>

                {editandoCep && (
                  <form onSubmit={handleSalvarCep} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="text"
                      value={cepInput}
                      onChange={(e) => {
                        let v = e.target.value.replace(/\D/g, '').slice(0, 8);
                        if (v.length > 5) v = `${v.slice(0, 5)}-${v.slice(5)}`;
                        setCepInput(v);
                      }}
                      placeholder="00000-000"
                      style={{ flex: 1, padding: '8px 10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                      autoFocus
                    />
                    <button
                      type="submit"
                      style={{ background: '#111', color: '#fff', border: 'none', borderRadius: '4px', padding: '0 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      CALCULAR
                    </button>
                  </form>
                )}
              </div>

              {/* Alerta de Prioridade Laranja */}
              <div className="cart-priority-banner">
                <IconAlert />
                <span>
                  Escolha como receber sua encomenda. Pagamento aprovado, seu pedido entra em preparação com prioridade.
                </span>
              </div>

              {/* Envio a domicílio */}
              <div className="cart-shipping-section">
                <div className="cart-shipping-title">
                  <IconTruck />
                  <span>Envio a domicílio {loadingFrete && <small style={{ fontWeight: 400, color: '#888' }}>(calculando...)</small>}</span>
                </div>

                <div className="cart-shipping-options">
                  {shippingOptions.map((opt) => {
                    const isSelected = selectedShipping?.id === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`cart-shipping-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedShipping(opt)}
                      >
                        <div className="cart-shipping-left">
                          <div className="cart-shipping-radio-circle">
                            {isSelected && <div className="cart-shipping-radio-circle-inner" />}
                          </div>
                          <div className="cart-shipping-info">
                            <span className="cart-shipping-name">{opt.nome}</span>
                            <span className="cart-shipping-deadline">
                              <IconRotate /> {opt.prazo}
                            </span>
                          </div>
                        </div>
                        <span className="cart-shipping-price" style={{ color: opt.preco === 0 ? '#1e8449' : 'inherit' }}>
                          {opt.preco === 0 ? 'GRÁTIS' : `R$ ${Number(opt.preco).toFixed(2).replace('.', ',')}`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="cart-more-shipping-btn"
                  onClick={() => alert('Todas as opções disponíveis já estão visíveis.')}
                >
                  Ver mais opções de envio
                </button>

                <p className="cart-shipping-note">
                  O prazo de entrega <strong>não contabiliza feriados</strong>.
                </p>

                <CupomSelector />
              </div>
            </>
          )}
        </div>

        {/* Rodapé Fixo */}
        {items.length > 0 && (
          <div className="cart-footer">
            {descontoCupom > 0 && (
              <div className="cart-total-row" style={{ fontSize: '13px', color: '#1e8449', fontWeight: 700 }}>
                <span>Desconto do cupom:</span>
                <span>− {descontoCupom.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            )}
            <div className="cart-total-row">
              <span className="cart-total-label">Total:</span>
              <span className="cart-total-value">
                {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="cart-total-boleto">
              Ou {totalBoleto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} com Boleto
            </div>

            <button
              type="button"
              className="cart-checkout-btn"
              onClick={() => {
                closeCart();
                if (isAuthenticated) {
                  navigate('/checkout');
                } else {
                  navigate('/login', { state: { from: '/checkout' } });
                }
              }}
            >
              INICIAR COMPRA
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
