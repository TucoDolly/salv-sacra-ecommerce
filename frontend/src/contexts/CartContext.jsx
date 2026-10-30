import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const CartContext = createContext({});

const OPCOES_PADRAO = [
  {
    id: 'pac',
    nome: 'Correios PAC',
    prazo: 'Chega em 2 dias úteis',
    preco: 10.90,
  },
  {
    id: 'sedex',
    nome: 'Correios SEDEX',
    prazo: 'Chega em 1 dia útil',
    preco: 12.47,
  },
  {
    id: 'jadlog',
    nome: 'Transportadora Jadlog Rápido',
    prazo: 'Chega em 2 dias úteis',
    preco: 14.90,
  },
];

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shippingOptions, setShippingOptions] = useState(OPCOES_PADRAO);
  const [selectedShipping, setSelectedShipping] = useState(OPCOES_PADRAO[1]); // SEDEX por padrão
  const [cep, setCep] = useState(() => localStorage.getItem('@SalvSacra:cep') || '88701-260');
  const [cidadeDestino, setCidadeDestino] = useState('');
  const [ufDestino, setUfDestino] = useState('');
  const [loadingFrete, setLoadingFrete] = useState(false);

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

  // Totais básicos para o cálculo de frete
  const subtotal = items.reduce((acc, item) => acc + (Number(item.preco) * Number(item.quantidade)), 0);
  const totalItens = items.reduce((acc, item) => acc + item.quantidade, 0);

  // Função para consultar a API real de frete
  const calcularFretePorCep = useCallback(async (cepAlvo, sub = subtotal, qtd = totalItens) => {
    const limpo = String(cepAlvo || '').replace(/\D/g, '');
    if (limpo.length !== 8) return null;

    setLoadingFrete(true);
    try {
      const { data } = await api.post('/frete/calcular', {
        cep: limpo,
        subtotal: sub > 0 ? sub : 79.90,
        quantidade: qtd > 0 ? qtd : 1,
      });

      if (data?.opcoes?.length) {
        setShippingOptions(data.opcoes);
        setCidadeDestino(data.cidade || '');
        setUfDestino(data.uf || '');

        // Mantém a mesma modalidade selecionada se existir, senão pega a primeira
        setSelectedShipping((atual) => {
          const mesma = data.opcoes.find((o) => o.id === atual?.id);
          return mesma || data.opcoes[0];
        });
      }
      return data;
    } catch (err) {
      console.warn('Erro ao calcular frete:', err.response?.data?.message || err.message);
      return null;
    } finally {
      setLoadingFrete(false);
    }
  }, [subtotal, totalItens]);

  // Recalcula automaticamente quando o CEP, subtotal ou quantidade de itens mudar
  useEffect(() => {
    const limpo = String(cep || '').replace(/\D/g, '');
    if (limpo.length === 8) {
      localStorage.setItem('@SalvSacra:cep', cep);
      calcularFretePorCep(limpo, subtotal, totalItens);
    }
  }, [cep, subtotal, totalItens, calcularFretePorCep]);

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

  const fretePreco = items.length > 0 ? (selectedShipping?.preco ?? 0) : 0;
  const total = subtotal + fretePreco;
  const totalBoleto = total * 0.95; // 5% no boleto

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
        shippingOptions,
        selectedShipping,
        setSelectedShipping,
        cep,
        setCep,
        cidadeDestino,
        ufDestino,
        loadingFrete,
        calcularFretePorCep,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
