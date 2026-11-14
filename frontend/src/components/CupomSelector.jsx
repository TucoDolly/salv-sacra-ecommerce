import { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import {
  listarCuponsDisponiveis,
  listarMeusVales,
  validarBeneficiosCheckout,
} from '../services/cupomService';
import LoadingSpinner from './LoadingSpinner';

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ehVale = (b) => {
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

/**
 * Seletor combinado de benefícios:
 * Permite aplicar simultaneamente até 1 Cupom Promocional (produto OU frete) + 1 Vale-Compra.
 */
export default function CupomSelector() {
  const { isAuthenticated } = useAuth();
  const {
    items,
    selectedShipping,
    cupom,
    valeCompra,
    aplicarCupom,
    removerCupom,
    aplicarValeCompra,
    removerValeCompra,
    descontoCupom,
    descontoVale,
    saldoDisponivelVale,
    saldoRestanteVale,
    calcularDescontoCupom,
    calcularAbatimentoVale,
  } = useCart();

  const [aberto, setAberto] = useState(false);
  const [promocionais, setPromocionais] = useState([]);
  const [valesDisponiveis, setValesDisponiveis] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [codigoManual, setCodigoManual] = useState('');
  const [validandoCodigo, setValidandoCodigo] = useState(false);

  const carregarBeneficios = async () => {
    setCarregando(true);
    setErro('');
    try {
      const promises = [listarCuponsDisponiveis()];
      if (isAuthenticated) {
        promises.push(listarMeusVales().catch(() => ({ data: [] })));
      }
      const [resPublicos, resVales] = await Promise.all(promises);
      const lista = Array.isArray(resPublicos?.data) ? resPublicos.data : [];

      const promos = lista.filter((b) => !ehVale(b));
      const valesPublicos = lista.filter((b) => ehVale(b));
      const valesConta = Array.isArray(resVales?.data)
        ? resVales.data.filter(
            (v) => v.ativo && v.status === 'ativo' && Number(v.saldo_atual ?? v.valor_fixo ?? 0) > 0
          )
        : [];

      const mapaVales = new Map();
      [...valesPublicos, ...valesConta].forEach((v) => {
        mapaVales.set(v.codigo, v);
      });

      setPromocionais(promos);
      setValesDisponiveis(Array.from(mapaVales.values()));
    } catch {
      setErro('Não foi possível carregar os cupons e vales-compra.');
    } finally {
      setCarregando(false);
    }
  };

  const toggleLista = () => {
    if (aberto) {
      setAberto(false);
      return;
    }
    setAberto(true);
    carregarBeneficios();
  };

  const handleAplicarCodigoManual = async (e) => {
    e.preventDefault();
    const codigo = codigoManual.trim().toUpperCase();
    if (!codigo) return;

    setValidandoCodigo(true);
    setErro('');
    try {
      const itensPayload = items.map((i) => ({
        produto_id: i.produtoId,
        preco: Number(i.preco || 0),
        quantidade: Number(i.quantidade || 1),
      }));

      // Verifica primeiro com os benefícios atuais para manter combinação (1 promo + 1 vale)
      const freteVal = Number(selectedShipping?.preco || 0);
      const payloadTeste = {
        codigo,
        cupom_codigo: cupom?.codigo || undefined,
        vale_compra_codigo: valeCompra?.codigo || undefined,
        valor_frete: freteVal,
        itens: itensPayload,
      };

      // Descobre se já está na lista carregada para saber em qual slot testar
      const conhecido = [...promocionais, ...valesDisponiveis].find(
        (b) => String(b.codigo).toUpperCase() === codigo
      );
      if (conhecido) {
        if (ehVale(conhecido)) {
          payloadTeste.vale_compra_codigo = codigo;
          delete payloadTeste.codigo;
        } else {
          payloadTeste.cupom_codigo = codigo;
          delete payloadTeste.codigo;
        }
      } else if (codigo.startsWith('VALE-') || codigo.startsWith('TROCA-')) {
        payloadTeste.vale_compra_codigo = codigo;
        delete payloadTeste.codigo;
      } else {
        payloadTeste.cupom_codigo = codigo;
        delete payloadTeste.codigo;
      }

      const { data } = await validarBeneficiosCheckout(payloadTeste);
      if (data?.vale_compra && ehVale(data.vale_compra) && payloadTeste.vale_compra_codigo === codigo) {
        aplicarValeCompra(data.vale_compra);
      } else if (data?.cupom && payloadTeste.cupom_codigo === codigo) {
        aplicarCupom(data.cupom);
      } else if (data?.vale_compra) {
        aplicarValeCompra(data.vale_compra);
      } else if (data?.cupom) {
        aplicarCupom(data.cupom);
      }
      setCodigoManual('');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {})[0]?.[0] ||
        'Código inválido ou não aplicável ao carrinho atual.';
      setErro(msg);
    } finally {
      setValidandoCodigo(false);
    }
  };

  return (
    <div className="cupom-selector">
      {(cupom || valeCompra) && (
        <div className="cupom-aplicados-stack">
          {cupom && (
            <div className="cupom-aplicado">
              <div className="cupom-aplicado-detalhes">
                <strong>🏷 {cupom.codigo}</strong>
                <span>
                  {cupom.tipo === 'frete'
                    ? `${Number(cupom.percentual)}% OFF no frete`
                    : `${Number(cupom.percentual)}% OFF em produtos`}
                  {descontoCupom > 0
                    ? ` · −${moeda(descontoCupom)}`
                    : cupom.tipo === 'frete'
                      ? ' · informe o CEP/frete para aplicar'
                      : ' · não se aplica aos itens atuais'}
                </span>
              </div>
              <button type="button" onClick={removerCupom}>Remover</button>
            </div>
          )}

          {valeCompra && (
            <div className="cupom-aplicado vale">
              <div className="cupom-aplicado-detalhes">
                <strong>🎟 {valeCompra.codigo} (Vale-Compra)</strong>
                <span>
                  Saldo do vale: {moeda(saldoDisponivelVale)}
                  {descontoVale > 0 ? ` · Abatendo −${moeda(descontoVale)} neste pedido` : ''}
                </span>
                {saldoRestanteVale > 0 && (
                  <div className="cupom-saldo-parcial-badge">
                    Restarão {moeda(saldoRestanteVale)} de saldo ativo neste vale para próximas compras
                  </div>
                )}
              </div>
              <button type="button" onClick={removerValeCompra}>Remover</button>
            </div>
          )}
        </div>
      )}

      <button type="button" className="cupom-toggle-btn" onClick={toggleLista}>
        <span>{cupom || valeCompra ? '🎟' : '🏷'}</span>
        {aberto
          ? 'Fechar cupons e vales-compra'
          : cupom && valeCompra
            ? 'Trocar cupom ou vale-compra'
            : cupom
              ? 'Combinar com um Vale-Compra (ou trocar cupom)'
              : valeCompra
                ? 'Combinar com um Cupom Promocional (ou trocar vale)'
                : 'Adicionar cupom de desconto ou vale-compra'}
      </button>

      {aberto && (
        <div className="cupom-painel-selecao">
          <form className="cupom-manual-form" onSubmit={handleAplicarCodigoManual}>
            <input
              type="text"
              placeholder="Digite o código do cupom ou vale..."
              value={codigoManual}
              onChange={(e) => setCodigoManual(e.target.value.toUpperCase())}
            />
            <button type="submit" disabled={validandoCodigo || !codigoManual.trim()}>
              {validandoCodigo ? '...' : 'Aplicar'}
            </button>
          </form>

          {erro && <p className="cupom-msg erro">{erro}</p>}

          {carregando ? (
            <div style={{ padding: '12px' }}><LoadingSpinner size="sm" /></div>
          ) : (
            <div className="cupom-lista">
              {/* Seção de Vales-Compra do Cliente */}
              {valesDisponiveis.length > 0 && (
                <>
                  <div className="cupom-secao-titulo">
                    <span>Meus Vales-Compra</span>
                    <small style={{ fontWeight: 600, color: '#6b21a8' }}>Combinável com 1 cupom</small>
                  </div>
                  {valesDisponiveis.map((v) => {
                    const abatimento = calcularAbatimentoVale(v, descontoCupom);
                    const saldoTotal = Number(v.saldo_atual ?? v.valor_inicial ?? v.valor_fixo ?? 0);
                    const restante = Math.max(0, Number((saldoTotal - abatimento).toFixed(2)));
                    const valido = saldoTotal > 0 && abatimento > 0;
                    const selecionado = valeCompra?.codigo === v.codigo;
                    return (
                      <button
                        key={`vale-${v.id || v.codigo}`}
                        type="button"
                        className={`cupom-item vale ${valido ? '' : 'invalido'} ${selecionado ? 'selecionado' : ''}`}
                        disabled={!valido}
                        onClick={() => {
                          aplicarValeCompra(v);
                          setAberto(false);
                        }}
                      >
                        <div className="cupom-item-info">
                          <strong>🎟 {v.codigo}</strong>
                          <span>
                            Saldo disponível: {moeda(saldoTotal)}
                            {restante > 0 && valido ? ` (restarão ${moeda(restante)})` : ''}
                          </span>
                          {v.condicoes_utilizacao && <small>{v.condicoes_utilizacao}</small>}
                        </div>
                        <span className="cupom-item-valor">
                          {selecionado ? 'Aplicado' : valido ? `−${moeda(abatimento)}` : 'Não aplicável'}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}

              {/* Seção de Cupons Promocionais */}
              <div className="cupom-secao-titulo">
                <span>Cupons Promocionais</span>
                <small style={{ fontWeight: 600, color: '#777' }}>1 por pedido (Produto ou Frete)</small>
              </div>
              {promocionais.length === 0 ? (
                <p className="cupom-msg">Nenhum cupom promocional disponível no momento.</p>
              ) : (
                promocionais.map((c) => {
                  const desconto = calcularDescontoCupom(c);
                  const ehFrete = c.tipo === 'frete';
                  const valido = desconto > 0 || (ehFrete && items.length > 0 && !selectedShipping);
                  const selecionado = cupom?.codigo === c.codigo;
                  return (
                    <button
                      key={`promo-${c.id || c.codigo}`}
                      type="button"
                      className={`cupom-item ${valido ? '' : 'invalido'} ${selecionado ? 'selecionado' : ''}`}
                      disabled={!valido}
                      onClick={() => {
                        aplicarCupom(c);
                        setAberto(false);
                      }}
                    >
                      <div className="cupom-item-info">
                        <strong>🏷 {c.codigo}</strong>
                        <span>
                          {ehFrete
                            ? `${Number(c.percentual)}% OFF no frete`
                            : `${Number(c.percentual)}% OFF nos produtos`}
                          {!c.todos_produtos && ' (peças selecionadas)'}
                        </span>
                        {c.descricao && <small>{c.descricao}</small>}
                        {Number(c.valor_minimo_pedido || 0) > 0 && (
                          <small>Pedido mínimo: {moeda(c.valor_minimo_pedido)}</small>
                        )}
                      </div>
                      <span className="cupom-item-valor">
                        {selecionado
                          ? 'Aplicado'
                          : desconto > 0
                            ? `−${moeda(desconto)}`
                            : ehFrete && !selectedShipping
                              ? 'Aplicar'
                              : 'Não aplicável'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


