import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { listarEnderecos, obterUltimoEndereco } from '../services/contaService';
import { listarCuponsDisponiveis, listarMeusVales } from '../services/cupomService';

const CartContext = createContext({});

// Cache em memória das cotações já calculadas para resposta instantânea (0ms) sem flash de valores
const cacheCotacoesFrete = new Map();

const ehValeCompraObj = (b) => {
  if (!b) return false;
  const cod = String(b.codigo || '').toUpperCase();
  return (
    Boolean(b.eh_vale_compra) ||
    b.tipo === 'vale_compra' ||
    b.tipo === 'troca' ||
    cod.startsWith('VALE-') ||
    cod.startsWith('TROCA-')
  );
};

const arredondar2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

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

  const processarItemNoArray = (lista, item) => {
    const novos = [...lista];
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
    return novos;
  };

  const addItem = (item) => {
    setItems((prev) => {
      const atualizados = processarItemNoArray(prev, item);
      salvarCarrinho(atualizados);
      return atualizados;
    });
    setIsCartOpen(true); // Abre a gaveta automaticamente ao adicionar
  };

  const addMultipleItems = (lista) => {
    if (!Array.isArray(lista) || !lista.length) return;
    setItems((prev) => {
      let atualizados = [...prev];
      lista.forEach((item) => {
        atualizados = processarItemNoArray(atualizados, item);
      });
      salvarCarrinho(atualizados);
      return atualizados;
    });
    setIsCartOpen(true);
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
    try {
      localStorage.removeItem('@SalvSacra:carrinho');
    } catch {}
    setItems([]);
    window.dispatchEvent(new Event('cartUpdated'));
  };

  // Validação em tempo real do estoque do carrinho contra o backend
  const validarEstoqueCarrinho = useCallback(async (itensParaChecar = null) => {
    // SEMPRE obtém a lista atual real do localStorage se itensParaChecar não for fornecido explicitamente,
    // evitando closures antigas do React ressuscitarem itens após um clearCart()!
    let itens = itensParaChecar;
    if (itens === null) {
      try {
        itens = JSON.parse(localStorage.getItem('@SalvSacra:carrinho') || '[]');
      } catch {
        itens = [];
      }
    }
    if (!Array.isArray(itens) || itens.length === 0) {
      setItems((atual) => (atual.length > 0 ? [] : atual));
      return;
    }

    try {
      const payload = itens.map((item) => ({
        variacao_id: item.variacaoId || null,
        produto_id: item.produtoId || null,
        tamanho: item.tamanho || null,
        cor: item.cor || null,
        quantidade: item.quantidade || 1,
      }));

      const { data } = await api.post('/carrinho/verificar-estoque', { itens: payload });
      if (!data || !Array.isArray(data.itens)) return;

      // Confere se o carrinho não foi limpo enquanto a requisição HTTP trafegava
      const salvoAposReq = localStorage.getItem('@SalvSacra:carrinho');
      if (!salvoAposReq || salvoAposReq === '[]') {
        setItems([]);
        return;
      }

      let houveAlteracao = false;
      const atualizados = [];

      itens.forEach((item, idx) => {
        const info = data.itens[idx];
        if (!info) {
          atualizados.push(item);
          return;
        }

        // Se o estoque atual é 0 ou produto não disponível, o item DEVE SER REMOVIDO DO CARRINHO!
        if (!info.disponivel || info.estoque_atual <= 0) {
          houveAlteracao = true;
          return; // Remove completamente
        }

        // Se a quantidade no carrinho for maior que o estoque atual, ajusta para o limite máximo restante
        const novaQtd = Math.min(item.quantidade, info.estoque_atual);
        if (novaQtd !== item.quantidade || item.estoque !== info.estoque_atual) {
          houveAlteracao = true;
          atualizados.push({
            ...item,
            quantidade: novaQtd,
            estoque: info.estoque_atual,
            variacaoId: info.variacao_id || item.variacaoId,
          });
        } else {
          atualizados.push({
            ...item,
            estoque: info.estoque_atual,
            variacaoId: info.variacao_id || item.variacaoId,
          });
        }
      });

      if (houveAlteracao) {
        salvarCarrinho(atualizados);
      }
    } catch (err) {
      console.warn('Erro ao validar estoque do carrinho:', err);
    }
  }, []);

  // Executa validação de estoque na inicialização, ao focar na aba e quando pedidos forem concluídos
  useEffect(() => {
    validarEstoqueCarrinho();

    const handleFocus = () => {
      validarEstoqueCarrinho();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('salv-pedidos-atualizados', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('salv-pedidos-atualizados', handleFocus);
    };
  }, [validarEstoqueCarrinho]);

  const openCart = () => {
    validarEstoqueCarrinho();
    setIsCartOpen(true);
  };
  const closeCart = () => setIsCartOpen(false);

  const fretePreco = items.length > 0 ? (selectedShipping?.preco ?? 0) : 0;

  // ── Cupom promocional (1 por pedido: 'produto' OU 'frete') + Vale-Compra (combinável) ──
  const [cupom, setCupom] = useState(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem('@SalvSacra:cupom') || 'null');
      return salvo && !ehValeCompraObj(salvo) ? salvo : null;
    } catch {
      return null;
    }
  });

  const [valeCompra, setValeCompra] = useState(() => {
    try {
      const valeSalvo = JSON.parse(localStorage.getItem('@SalvSacra:vale_compra') || 'null');
      if (valeSalvo) return valeSalvo;
      const cupomAntigo = JSON.parse(localStorage.getItem('@SalvSacra:cupom') || 'null');
      if (cupomAntigo && ehValeCompraObj(cupomAntigo)) {
        localStorage.removeItem('@SalvSacra:cupom');
        localStorage.setItem('@SalvSacra:vale_compra', JSON.stringify(cupomAntigo));
        return cupomAntigo;
      }
      return null;
    } catch {
      return null;
    }
  });

  const aplicarValeCompra = useCallback((v) => {
    setValeCompra(v);
    try {
      if (v) localStorage.setItem('@SalvSacra:vale_compra', JSON.stringify(v));
      else localStorage.removeItem('@SalvSacra:vale_compra');
    } catch {}
  }, []);

  const removerValeCompra = useCallback(() => aplicarValeCompra(null), [aplicarValeCompra]);

  const aplicarCupom = useCallback((c) => {
    if (c && ehValeCompraObj(c)) {
      aplicarValeCompra(c);
      return;
    }
    setCupom(c);
    try {
      if (c) localStorage.setItem('@SalvSacra:cupom', JSON.stringify(c));
      else localStorage.removeItem('@SalvSacra:cupom');
    } catch {}
  }, [aplicarValeCompra]);

  const removerCupom = useCallback(() => aplicarCupom(null), [aplicarCupom]);

  const removerTodosBeneficios = useCallback(() => {
    setCupom(null);
    setValeCompra(null);
    try {
      localStorage.removeItem('@SalvSacra:cupom');
      localStorage.removeItem('@SalvSacra:vale_compra');
    } catch {}
  }, []);

  // Sincroniza cupom e vale-compra com a base ativa (atualiza saldo_atual e limpa benefícios inválidos/esgotados)
  const sincronizarBeneficios = useCallback(async () => {
    if (!cupom && !valeCompra) return;
    try {
      const { data: disponiveis } = await listarCuponsDisponiveis();
      const lista = Array.isArray(disponiveis) ? disponiveis : [];

      let meusVales = [];
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
      if (token && valeCompra) {
        try {
          const resVales = await listarMeusVales();
          meusVales = Array.isArray(resVales.data) ? resVales.data : [];
        } catch {
          meusVales = [];
        }
      }

      if (cupom) {
        const encontrado = lista.find((b) => Number(b.id) === Number(cupom.id) || b.codigo === cupom.codigo);
        if (encontrado) {
          if (encontrado.status && encontrado.status !== 'ativo') {
            aplicarCupom(null);
          } else {
            setCupom(encontrado);
            try { localStorage.setItem('@SalvSacra:cupom', JSON.stringify(encontrado)); } catch {}
          }
        }
      }

      if (valeCompra) {
        const encontradoVale =
          meusVales.find((v) => Number(v.id) === Number(valeCompra.id) || v.codigo === valeCompra.codigo) ||
          lista.find((v) => Number(v.id) === Number(valeCompra.id) || v.codigo === valeCompra.codigo);

        if (encontradoVale) {
          const saldoAtualizado = Number(encontradoVale.saldo_atual ?? encontradoVale.valor_fixo ?? 0);
          if ((encontradoVale.status && encontradoVale.status !== 'ativo') || !encontradoVale.ativo || saldoAtualizado <= 0) {
            aplicarValeCompra(null);
          } else {
            setValeCompra(encontradoVale);
            try { localStorage.setItem('@SalvSacra:vale_compra', JSON.stringify(encontradoVale)); } catch {}
          }
        }
      }
    } catch {}
  }, [cupom?.id, cupom?.codigo, valeCompra?.id, valeCompra?.codigo, aplicarCupom, aplicarValeCompra]);

  useEffect(() => {
    sincronizarBeneficios();
  }, [sincronizarBeneficios]);

  const calcularAbatimentoVale = (v, descontoPromo = 0) => {
    if (!v || items.length === 0) return 0;
    const minimo = Number(v.valor_minimo_pedido || 0);
    if (minimo > 0 && subtotal < minimo) return 0;

    const saldo = Number(v.saldo_atual ?? v.valor_inicial ?? v.valor_fixo ?? 0);
    if (saldo <= 0) return 0;

    const todosProdutos = v.todos_produtos !== false;
    const ids = (v.produto_ids || []).map(Number);
    const validos = todosProdutos ? items : items.filter((i) => ids.includes(Number(i.produtoId)));
    if (validos.length === 0) return 0;

    let teto = Math.max(0, arredondar2(subtotal + fretePreco - Number(descontoPromo || 0)));
    if (!todosProdutos) {
      const totalValidos = validos.reduce(
        (acc, i) => acc + Number(i.preco || 0) * (Number(i.quantidade) || 1),
        0
      );
      const tetoElegivel = Math.max(0, arredondar2(totalValidos + fretePreco - Number(descontoPromo || 0)));
      teto = Math.min(teto, tetoElegivel);
    }

    return arredondar2(Math.min(teto, saldo));
  };

  // Verifica se o benefício promocional vale para o carrinho e calcula o desconto
  const calcularDescontoCupom = (c) => {
    if (!c || items.length === 0) return 0;

    if (ehValeCompraObj(c)) {
      return calcularAbatimentoVale(c, 0);
    }

    const minimo = Number(c.valor_minimo_pedido || 0);
    if (minimo > 0 && subtotal < minimo) return 0;

    const todosProdutos = c.todos_produtos !== false;
    const ids = (c.produto_ids || []).map(Number);
    const validos = todosProdutos ? items : items.filter((i) => ids.includes(Number(i.produtoId)));
    if (validos.length === 0) return 0;

    // Cupom de frete: desconto percentual sobre o frete do pedido
    if (c.tipo === 'frete') {
      const pctFrete = Math.min(100, Math.max(0, Number(c.percentual ?? 100))) / 100;
      return arredondar2(Math.max(0, fretePreco) * pctFrete);
    }

    // Cupom de produto: desconto percentual sobre todos os produtos elegíveis do carrinho
    const totalValidos = validos.reduce(
      (acc, i) => acc + Number(i.preco || 0) * (Number(i.quantidade) || 1),
      0
    );
    const pct = Math.min(100, Math.max(0, Number(c.percentual || 0))) / 100;
    if (pct > 0) {
      return arredondar2(totalValidos * pct);
    }

    if (c.valor_fixo && Number(c.valor_fixo) > 0) {
      return arredondar2(Math.min(totalValidos, Number(c.valor_fixo)));
    }

    return 0;
  };

  const descontoCupom = cupom ? calcularDescontoCupom(cupom) : 0;
  const descontoProduto = cupom && cupom.tipo !== 'frete' ? descontoCupom : 0;
  const descontoFrete = cupom && cupom.tipo === 'frete' ? Math.min(fretePreco, descontoCupom) : 0;
  const freteEfetivo = arredondar2(Math.max(0, fretePreco - descontoFrete));
  const totalAposCupom = arredondar2(Math.max(0, (subtotal - descontoProduto) + freteEfetivo));

  const saldoDisponivelVale = valeCompra
    ? Math.max(0, Number(valeCompra.saldo_atual ?? valeCompra.valor_inicial ?? valeCompra.valor_fixo ?? 0))
    : 0;
  const descontoVale = valeCompra ? calcularAbatimentoVale(valeCompra, descontoCupom) : 0;
  const saldoRestanteVale = valeCompra
    ? Math.max(0, arredondar2(saldoDisponivelVale - descontoVale))
    : 0;

  const desconto = arredondar2(descontoCupom + descontoVale);
  const total = Math.max(0, arredondar2(totalAposCupom - descontoVale));
  const totalBoleto = total;

  return (
    <CartContext.Provider
      value={{
        items,
        isCartOpen,
        openCart,
        closeCart,
        addItem,
        addMultipleItems,
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
        valeCompra,
        aplicarCupom,
        removerCupom,
        aplicarValeCompra,
        removerValeCompra,
        removerTodosBeneficios,
        desconto,
        descontoCupom,
        descontoProduto,
        descontoFrete,
        freteEfetivo,
        totalAposCupom,
        descontoVale,
        saldoDisponivelVale,
        saldoRestanteVale,
        calcularDescontoCupom,
        calcularAbatimentoVale,
        sincronizarBeneficios,
        validarEstoqueCarrinho,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
