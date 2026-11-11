import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { listarEnderecos, obterUltimoEndereco } from '../services/contaService';

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
      return localStorage.getItem('@SalvSacra:cep') || '';
    } catch {
      return '';
    }
  });
  const [cidadeDestino, setCidadeDestino] = useState('');
  const [ufDestino, setUfDestino] = useState('');
  const [loadingFrete, setLoadingFrete] = useState(false);
  const reqIdRef = useRef(0);

  // Busca endereço cadastrado ou do último pedido caso o CEP ainda não esteja preenchido
  useEffect(() => {
    if (!cep) {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (token) {
        listarEnderecos()
          .then(({ data }) => {
            if (Array.isArray(data) && data.length > 0 && data[0]?.cep) {
              const limpo = String(data[0].cep).replace(/\D/g, '');
              if (limpo.length === 8) {
                const formatado = `${limpo.slice(0, 5)}-${limpo.slice(5)}`;
                setCep(formatado);
                localStorage.setItem('@SalvSacra:cep', formatado);
                return;
              }
            }
            return obterUltimoEndereco().then((res) => {
              if (res?.data?.cep) {
                const limpo = String(res.data.cep).replace(/\D/g, '');
                if (limpo.length === 8) {
                  const formatado = `${limpo.slice(0, 5)}-${limpo.slice(5)}`;
                  setCep(formatado);
                  localStorage.setItem('@SalvSacra:cep', formatado);
                }
              }
            });
          })
          .catch(() => {});
      }
    }
  }, [cep]);

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

    const estoqueMax = item.estoque !== undefined ? Number(item.estoque) : 999;

    if (index >= 0) {
      const estoqueLimite = novos[index].estoque !== undefined ? Number(novos[index].estoque) : estoqueMax;
      const novaQtd = (novos[index].quantidade || 0) + (item.quantidade || 1);
      novos[index].quantidade = Math.min(estoqueLimite, novaQtd);
      if (item.estoque !== undefined) novos[index].estoque = Number(item.estoque);
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
        quantidade: Math.min(estoqueMax, item.quantidade || 1),
        estoque: item.estoque !== undefined ? Number(item.estoque) : undefined,
      });
    }

    salvarCarrinho(novos);
    setIsCartOpen(true); // Abre a gaveta automaticamente ao adicionar
  };

  const updateQuantity = (index, delta) => {
    const novos = [...items];
    if (!novos[index]) return;

    const item = novos[index];
    const estoqueMax = item.estoque !== undefined ? Number(item.estoque) : 999;
    const novaQtd = item.quantidade + delta;

    // Se estiver tentando aumentar além do estoque disponível, bloqueia a operação
    if (delta > 0 && novaQtd > estoqueMax) {
      return;
    }

    item.quantidade = novaQtd;
    if (item.quantidade <= 0) {
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

    // Cupom de frete: aplica ao valor do frete do carrinho inteiro
    if (c.tipo === 'frete') {
      const pctFrete = Math.min(100, Math.max(0, Number(c.percentual || 100))) / 100;
      return Math.round(fretePreco * pctFrete * 100) / 100;
    }

    // Cupom de produto: válido para apenas 1 produto (o item válido de maior valor)
    const maiorPreco = Math.max(...validos.map((i) => Number(i.preco || 0)));
    if (c.valor_fixo && Number(c.valor_fixo) > 0) {
      return Math.round(Math.min(maiorPreco, Number(c.valor_fixo)) * 100) / 100;
    }

    const pct = Math.min(100, Math.max(0, Number(c.percentual || 0))) / 100;
    return Math.round(maiorPreco * pct * 100) / 100;
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
