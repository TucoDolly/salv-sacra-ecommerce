import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext({});

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState({
    id: 'sedex',
    nome: 'Nuvem Envio Correios SEDEX',
    prazo: 'Chega quarta 20/05',
    preco: 12.47,
  });
  const [cep, setCep] = useState('88701-260');

  // Carregar do localStorage ao iniciar
  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem('@SalvSacra:carrinho') || '[]');
      setItems(salvo);
    } catch {
      setItems([]);
    }
  }, []);

  // Salvar no localStorage sempre que items mudar
  const salvarCarrinho = (novosItens) => {
    setItems(novosItens);
    try {
      localStorage.setItem('@SalvSacra:carrinho', JSON.stringify(novosItens));
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (e) {
      console.error('Erro ao salvar carrinho:', e);
    }
  };

  const addItem = (item) => {
    const novos = [...items];
    const index = novos.findIndex(
      (i) => i.produtoId === item.produtoId && i.tamanho === item.tamanho && i.cor === item.cor
    );

    if (index >= 0) {
      novos[index].quantidade += item.quantidade || 1;
    } else {
      novos.push({
        produtoId: item.produtoId,
        nome: item.nome,
        preco: Number(item.preco || 79.9),
        imagem: item.imagem,
        tamanho: item.tamanho || 'M',
        cor: item.cor || 'Preto',
        quantidade: item.quantidade || 1,
      });
    }

    salvarCarrinho(novos);
    setIsCartOpen(true); // Abre a gaveta automaticamente ao adicionar
  };

  const updateQuantity = (index, delta) => {
    const novos = [...items];
    if (!novos[index]) return;

    novos[index].quantidade += delta;
    if (novos[index].quantidade <= 0) {
      novos.splice(index, 1);
    }
    salvarCarrinho(novos);
  };

  const removeItem = (index) => {
    const novos = [...items];
    novos.splice(index, 1);
    salvarCarrinho(novos);
  };

  const clearCart = () => {
    salvarCarrinho([]);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  // Totais
  const subtotal = items.reduce((acc, item) => acc + (Number(item.preco) * Number(item.quantidade)), 0);
  const fretePreco = items.length > 0 ? (selectedShipping?.preco || 0) : 0;
  const total = subtotal + fretePreco;
  const totalBoleto = (total * 0.95); // 5% no boleto
  const totalItens = items.reduce((acc, item) => acc + item.quantidade, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        isCartOpen,
        openCart,
        closeCart,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        subtotal,
        total,
        totalBoleto,
        totalItens,
        selectedShipping,
        setSelectedShipping,
        cep,
        setCep,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
