import { useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { listarCuponsDisponiveis } from '../services/cupomService';

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Botão "Adicionar cupom" que abre a lista de cupons disponíveis.
 * Ao clicar em um cupom, ele é aplicado automaticamente no carrinho.
 */
export default function CupomSelector() {
  const { cupom, aplicarCupom, removerCupom, descontoCupom, calcularDescontoCupom } = useCart();
  const [aberto, setAberto] = useState(false);
  const [cupons, setCupons] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const abrirLista = async () => {
    if (aberto) { setAberto(false); return; }
    setAberto(true);
    setCarregando(true);
    setErro('');
    try {
      const { data } = await listarCuponsDisponiveis();
      setCupons(data || []);
    } catch {
      setErro('Não foi possível carregar os cupons.');
    } finally {
      setCarregando(false);
    }
  };

  if (cupom) {
    return (
      <div className="cupom-aplicado">
        <div>
          <strong>🏷 {cupom.codigo}</strong>
          <span>
            {Number(cupom.percentual)}% OFF {cupom.tipo === 'frete' ? 'no frete' : 'nas peças'}
            {descontoCupom > 0 ? ` · −${moeda(descontoCupom)}` : ' · não se aplica aos itens atuais'}
          </span>
        </div>
        <button type="button" onClick={removerCupom}>Remover</button>
      </div>
    );
  }

  return (
    <div className="cupom-selector">
      <button type="button" className="cupom-toggle-btn" onClick={abrirLista}>
        <span>🏷</span> {aberto ? 'Fechar cupons' : 'Adicionar cupom de desconto'}
      </button>

      {aberto && (
        <div className="cupom-lista">
          {carregando && <p className="cupom-msg">Carregando cupons...</p>}
          {erro && <p className="cupom-msg erro">{erro}</p>}
          {!carregando && !erro && cupons.length === 0 && (
            <p className="cupom-msg">Nenhum cupom disponível no momento.</p>
          )}
          {cupons.map((c) => {
            const desconto = calcularDescontoCupom(c);
            const valido = desconto > 0;
            return (
              <button
                key={c.id}
                type="button"
                className={`cupom-item ${valido ? '' : 'invalido'}`}
                disabled={!valido}
                onClick={() => { aplicarCupom(c); setAberto(false); }}
              >
                <div className="cupom-item-info">
                  <strong>{c.codigo}</strong>
                  <span>
                    {Number(c.percentual)}% OFF {c.tipo === 'frete' ? 'no frete' : 'nas peças'}
                    {!c.todos_produtos && ' (peças selecionadas)'}
                  </span>
                  {c.descricao && <small>{c.descricao}</small>}
                </div>
                <span className="cupom-item-valor">
                  {valido ? `−${moeda(desconto)}` : 'Não aplicável'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

