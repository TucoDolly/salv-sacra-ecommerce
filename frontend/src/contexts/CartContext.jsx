import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../services/api';

const CartContext = createContext({});

// Cache em memória das cotações já calculadas para resposta instantânea (0ms) sem flash de valores
const cacheCotacoesFrete = new Map();

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('@SalvSacra:carrinho') || '[]');
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [cep, setCep] = useState(() => {
    try {
      const salvo = localStorage.getItem('@SalvSacra:cep');
      // Limpa qualquer resíduo legado do CEP fixo de testes
      if (!salvo || salvo === '88701-260') {
        localStorage.removeItem('@SalvSacra:cep');
        return '';
      }
      return salvo;
    } catch {
      return '';
    }
  });
  const [cidadeDestino, setCidadeDestino] = useState('');
  const [ufDestino, setUfDestino] = useState('');
  const [loadingFrete, setLoadingFrete] = useState(false);
  const reqIdRef = useRef(0);

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

    const qtdNormalizada = qtd > 0 ? qtd : 1;
    const subNormalizado = sub > 0 ? Number(sub.toFixed(2)) : 1.00;
    const chaveCache = `${limpo}_${qtdNormalizada}`;

    // Se já calculamos para este mesmo CEP e quantidade de itens, aplica imediatamente sem delay e sem flash!
    if (cacheCotacoesFrete.has(chaveCache)) {
      const cached = cacheCotacoesFrete.get(chaveCache);
      setShippingOptions(cached.opcoes);
      setCidadeDestino(cached.cidade || '');
      setUfDestino(cached.uf || '');
      setSelectedShipping((atual) => {
        const mesma = cached.opcoes.find((o) => o.id === atual?.id);
        return mesma || cached.opcoes[0];
      });
      setLoadingFrete(false);
      return cached;
    }

    const reqAtual = ++reqIdRef.current;
    // Limpa valores antigos enquanto calcula um novo CEP/quantidade para nunca exibir valor errado por 1 segundo
    setShippingOptions([]);
    setSelectedShipping(null);
    setLoadingFrete(true);

    try {
      const { data } = await api.post('/frete/calcular', {
        cep: limpo,
        subtotal: subNormalizado,
        quantidade: qtdNormalizada,
      });

      if (reqAtual !== reqIdRef.current) return data;

      if (data?.opcoes?.length) {
        cacheCotacoesFrete.set(chaveCache, data);
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
      if (reqAtual === reqIdRef.current) {
        console.warn('Erro ao calcular frete:', err.response?.data?.message || err.message);
      }
      return null;
    } finally {
      if (reqAtual === reqIdRef.current) {
        setLoadingFrete(false);
      }
    }
  }, [subtotal, totalItens]);

  // Recalcula automaticamente quando o CEP ou quantidade de itens mudar
  useEffect(() => {
    const limpo = String(cep || '').replace(/\D/g, '');
    if (limpo.length === 8) {
      localStorage.setItem('@SalvSacra:cep', cep);
      calcularFretePorCep(limpo, subtotal, totalItens);
    } else {
      // Se não há CEP informado, limpa as opções de frete e desmarca frete
      setShippingOptions([]);
      setSelectedShipping(null);
      setCidadeDestino('');
      setUfDestino('');
    }
  }, [cep, totalItens, calcularFretePorCep]);

  const addItem = (item) => {
    const novos = [...items];
    const modItem = item.modelo || 'Regular Fit';
    const index = novos.findIndex(
      (i) =>
        i.produtoId === item.produtoId &&
        i.tamanho === item.tamanho &&
        i.cor === item.cor &&
        (i.modelo || 'Regular Fit') === modItem
    );

    if (index >= 0) {
      novos[index].quantidade += item.quantidade || 1;
    } else {
      novos.push({
        produtoId: item.produtoId,
        variacaoId: item.variacaoId || null,
        nome: item.nome,
        preco: Number(item.preco || 79.9),
        imagem: item.imagem,
        modelo: modItem,
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

  // ── Cupom de desconto ──
  const [cupom, setCupom] = useState(() => {
    try { return JSON.parse(localStorage.getItem('@SalvSacra:cupom') || 'null'); } catch { return null; }
  });

  const aplicarCupom = (c) => {
    setCupom(c);
    if (c) localStorage.setItem('@SalvSacra:cupom', JSON.stringify(c));
    else localStorage.removeItem('@SalvSacra:cupom');
  };
  const removerCupom = () => aplicarCupom(null);

  // Verifica se o cupom vale para algum item do carrinho e calcula o desconto
  const calcularDescontoCupom = (c) => {
    if (!c || items.length === 0) return 0;
    const ids = (c.produto_ids || []).map(Number);
    const validos = c.todos_produtos ? items : items.filter((i) => ids.includes(Number(i.produtoId)));
    if (validos.length === 0) return 0;
    const pct = Math.min(100, Math.max(0, Number(c.percentual))) / 100;
    if (c.tipo === 'frete') return Math.round(fretePreco * pct * 100) / 100;
    const base = validos.reduce((acc, i) => acc + Number(i.preco) * Number(i.quantidade), 0);
    return Math.round(base * pct * 100) / 100;
  };

  const descontoCupom = calcularDescontoCupom(cupom);
  const total = Math.max(0, subtotal + fretePreco - descontoCupom);
  const totalBoleto = total;

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
        cupom,
        aplicarCupom,
        removerCupom,
        descontoCupom,
        calcularDescontoCupom,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
