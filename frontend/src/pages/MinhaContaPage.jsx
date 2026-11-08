import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import MainLayout from '../layouts/MainLayout';
import api from '../services/api';
import { imprimirReciboPedido } from '../utils/imprimirRecibo';
import {
  alterarSenha,
  atualizarEndereco,
  atualizarPerfil,
  cancelarPedido,
  criarCartao,
  criarEndereco,
  excluirConta,
  excluirPedido,
  listarCartoes,
  listarEnderecos,
  listarPedidos,
  obterResumoConta,
  removerCartao,
  removerEndereco,
} from '../services/contaService';
import '../styles/auth.css';
import '../styles/minha-conta.css';

const BREADCRUMBS = [
  { label: 'Início', to: '/' },
  { label: 'Minha Conta' },
];

const TABS = [
  { id: 'resumo',     label: 'Resumo' },
  { id: 'pedidos',    label: 'Meus pedidos' },
  { id: 'favoritos',  label: 'Lista de desejos' },
  { id: 'dados',      label: 'Informações pessoais' },
  { id: 'enderecos',  label: 'Endereços' },
  { id: 'pagamentos', label: 'Formas de pagamento' },
  { id: 'senha',      label: 'Alterar senha' },
];

const moeda = (v) =>
  Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dataBR = (v) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');

const STATUS_CLASS = {
  Pendente: 'pendente',
  Pago: 'pago',
  'Em separação': 'em-separacao',
  'Em montagem': 'em-separacao',
  Enviado: 'enviado',
  'Em transporte': 'em-transporte',
  Entregue: 'entregue',
  Cancelado: 'cancelado',
};

// Gera uma previsão amigável de entrega (ex: 5 a 8 dias úteis a partir da data do pedido)
const calcularPrevisaoEntrega = (dataPedido, tipoFrete) => {
  const base = dataPedido ? new Date(dataPedido) : new Date();
  const diasMin = tipoFrete && tipoFrete.toLowerCase().includes('sedex') ? 2 : 5;
  const diasMax = tipoFrete && tipoFrete.toLowerCase().includes('sedex') ? 4 : 8;

  const d1 = new Date(base);
  d1.setDate(d1.getDate() + diasMin);
  const d2 = new Date(base);
  d2.setDate(d2.getDate() + diasMax);

  return `${d1.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} e ${d2.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
};

// Determina em qual etapa da linha do tempo o pedido se encontra
// 1: Pendente, 2: Pago, 3: Em separação, 4: Enviado, 5: Em transporte, 6: Entregue
const obterEtapaRastreio = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'entregue') return 6;
  if (s === 'em transporte') return 5;
  if (s === 'enviado') return 4;
  if (s === 'em separação' || s === 'em separacao' || s === 'em montagem') return 3;
  if (s === 'pago') return 2;
  if (s === 'pendente') return 1;
  return 0; // Cancelado
};

const primeiroErro = (err) => {
  const errs = err.response?.data?.errors;
  if (errs) return Object.values(errs)[0]?.[0];
  return err.response?.data?.message ?? 'Ocorreu um erro. Tente novamente.';
};

/* ───────────────────────── Resumo ───────────────────────── */
function Resumo({ user, pedidos, enderecos, cartoes, totalFavoritos, resumo, irPara, carregando }) {
  const ultimo = resumo?.ultimo_pedido !== undefined ? resumo.ultimo_pedido : pedidos?.[0];
  const numPedidos = resumo?.total_pedidos !== undefined ? resumo.total_pedidos : (pedidos?.length || 0);
  const numEnderecos = resumo?.total_enderecos !== undefined ? resumo.total_enderecos : (enderecos?.length || 0);
  const numCartoes = resumo?.total_cartoes !== undefined ? resumo.total_cartoes : (cartoes?.length || 0);
  const numFavoritos = totalFavoritos ?? resumo?.total_favoritos ?? 0;

  return (
    <>
      <h2 className="conta-section-title">Olá, {user.name.split(' ')[0]}!</h2>
      <p className="conta-section-sub">
        Aqui você acompanha seus pedidos e gerencia seus dados.
      </p>

      <div className="conta-cards">
        <button type="button" className="conta-card" onClick={() => irPara('pedidos')}>
          <span className="conta-card-num">{numPedidos}</span>
          <span className="conta-card-label">Pedidos realizados</span>
        </button>
        <button type="button" className="conta-card" onClick={() => irPara('enderecos')}>
          <span className="conta-card-num">{numEnderecos}</span>
          <span className="conta-card-label">Endereços salvos</span>
        </button>
        <button type="button" className="conta-card" onClick={() => irPara('pagamentos')}>
          <span className="conta-card-num">{numCartoes}</span>
          <span className="conta-card-label">Cartões salvos</span>
        </button>
        <button type="button" className="conta-card" onClick={() => irPara('dados')}>
          <span className="conta-card-num">✎</span>
          <span className="conta-card-label">Editar meus dados</span>
        </button>
      </div>

      <div className="conta-box">
        <h3>Último pedido</h3>
        {ultimo ? (
          <div className="conta-pedido-resumo">
            <div>
              <strong>Pedido #{ultimo.id}</strong>
              <span> · {dataBR(ultimo.data_pedido)}</span>
            </div>
            <div>
              <span className={`conta-status ${STATUS_CLASS[ultimo.status] ?? 'pendente'}`}>
                {ultimo.status}
              </span>
              <strong> {moeda(ultimo.valor_total)}</strong>
            </div>
          </div>
        ) : carregando ? (
          <div className="conta-skeleton-linha" />
        ) : (
          <p className="conta-vazio">
            Você ainda não fez nenhum pedido. <Link to="/produtos">Ver produtos</Link>
          </p>
        )}
      </div>
    </>
  );
}

/* ───────────────────────── Pedidos ───────────────────────── */
function Pedidos({ pedidos, pedidoSelecionadoInicial, autoAvaliar, recarregar, carregando }) {
  const pendenteMaisRecente = pedidos.find((p) => p.status === 'Pendente');
  const [aberto, setAberto] = useState(
    pedidoSelecionadoInicial ? Number(pedidoSelecionadoInicial) : (pendenteMaisRecente ? pendenteMaisRecente.id : null)
  );
  const [pixAbertoId, setPixAbertoId] = useState(pendenteMaisRecente ? pendenteMaisRecente.id : null);
  const [copiadoId, setCopiadoId] = useState(null);
  const [confirmandoId, setConfirmandoId] = useState(null);
  const [agoraMs, setAgoraMs] = useState(() => Date.now());
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [msgCancelamento, setMsgCancelamento] = useState({ tipo: '', texto: '', pedidoId: null });
  const { addItem, openCart } = useCart();
  const [produtoParaAvaliar, setProdutoParaAvaliar] = useState(null);
  const [formAvaliacao, setFormAvaliacao] = useState({ nota: 5, comentario: '' });
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false);
  const [msgAvaliacao, setMsgAvaliacao] = useState({ tipo: '', texto: '' });
  const [avaliadosIds, setAvaliadosIds] = useState([]);

  // Devoluções & Trocas (Logística Reversa)
  const [pedidoParaDevolucao, setPedidoParaDevolucao] = useState(null);
  const [itensDevolucaoSelecionados, setItensDevolucaoSelecionados] = useState({});
  const [motivoDevolucao, setMotivoDevolucao] = useState('Tamanho não serviu / Troca de tamanho');
  const [tipoDevolucao, setTipoDevolucao] = useState('cupom');
  const [descricaoDevolucao, setDescricaoDevolucao] = useState('');
  const [fotosDevolucao, setFotosDevolucao] = useState([]);
  const [fotosPreviews, setFotosPreviews] = useState([]);
  const [enviandoDevolucao, setEnviandoDevolucao] = useState(false);
  const [devolucaoSucessoMsg, setDevolucaoSucessoMsg] = useState('');

  // Modal customizado para avisos (substitui alerts do navegador)
  const [modalAviso, setModalAviso] = useState({ aberto: false, titulo: '', mensagem: '', icon: '✓' });

  const abrirModalDevolucao = (ped) => {
    setPedidoParaDevolucao(ped);
    const selecionadosInit = {};
    (ped.itens || []).forEach((it) => {
      selecionadosInit[it.id] = { selecionado: true, quantidade: it.quantidade || 1 };
    });
    setItensDevolucaoSelecionados(selecionadosInit);
    setMotivoDevolucao('Tamanho não serviu / Troca de tamanho');
    setTipoDevolucao('cupom');
    setDescricaoDevolucao('');
    setDevolucaoSucessoMsg('');
    fotosPreviews.forEach((url) => URL.revokeObjectURL(url));
    setFotosDevolucao([]);
    setFotosPreviews([]);
  };

  const handleAdicionarFotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const espacoRestante = 5 - fotosDevolucao.length;
    if (espacoRestante <= 0) {
      setModalAviso({
        aberto: true,
        titulo: 'Limite de fotos atingido',
        mensagem: 'Você pode anexar no máximo 5 fotos.',
        icon: '📷',
      });
      return;
    }

    const novosFiles = files.slice(0, espacoRestante);
    const novosPreviews = novosFiles.map((f) => URL.createObjectURL(f));

    setFotosDevolucao((prev) => [...prev, ...novosFiles]);
    setFotosPreviews((prev) => [...prev, ...novosPreviews]);
  };

  const handleRemoverFoto = (idx) => {
    URL.revokeObjectURL(fotosPreviews[idx]);
    setFotosDevolucao((prev) => prev.filter((_, i) => i !== idx));
    setFotosPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmeterDevolucao = async (e) => {
    e.preventDefault();
    if (!pedidoParaDevolucao) return;

    const itensPayload = Object.entries(itensDevolucaoSelecionados)
      .filter(([_, val]) => val.selecionado && val.quantidade > 0)
      .map(([itemId, val]) => ({
        item_id: Number(itemId),
        quantidade: Number(val.quantidade),
      }));

    if (itensPayload.length === 0) {
      setModalAviso({
        aberto: true,
        titulo: 'Atenção',
        mensagem: 'Selecione ao menos 1 item para devolução ou troca.',
        icon: '⚠️',
      });
      return;
    }

    setEnviandoDevolucao(true);
    try {
      const formData = new FormData();
      formData.append('tipo_solicitacao', tipoDevolucao);
      formData.append('motivo', motivoDevolucao);
      if (descricaoDevolucao) {
        formData.append('descricao', descricaoDevolucao);
      }
      itensPayload.forEach((it, idx) => {
        formData.append(`itens[${idx}][item_id]`, it.item_id);
        formData.append(`itens[${idx}][quantidade]`, it.quantidade);
      });
      fotosDevolucao.forEach((file) => {
        formData.append('fotos[]', file);
      });

      await api.post(`/pedidos/${pedidoParaDevolucao.id}/devolucoes`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setDevolucaoSucessoMsg('✓ Solicitação de devolução enviada com sucesso! Você receberá atualizações por e-mail.');
      setTimeout(() => {
        setPedidoParaDevolucao(null);
        recarregar();
      }, 1500);
    } catch (err) {
      setModalAviso({
        aberto: true,
        titulo: 'Erro na solicitação',
        mensagem: err.response?.data?.message || 'Erro ao solicitar devolução.',
        icon: '✕',
      });
    } finally {
      setEnviandoDevolucao(false);
    }
  };

  const handleComprarNovamente = (pedido) => {
    if (!pedido?.itens?.length) return;
    pedido.itens.forEach((it) => {
      const prod = it.variacao?.produto || it.produto;
      const fotoProd =
        (Array.isArray(prod?.imagens_vitrine) && prod.imagens_vitrine[0]) ||
        (Array.isArray(prod?.imagens) && prod.imagens[0]) ||
        prod?.imagem_url ||
        '';

      addItem({
        produtoId: it.variacao?.produto_id || it.produto_id || prod?.id,
        variacaoId: it.variacao_produto_id || it.variacao?.id,
        nome: prod?.nome || 'Camiseta Salv Sacra',
        preco: Number(it.preco_unitario || it.preco || prod?.preco_base || 0),
        imagem: fotoProd,
        modelo: prod?.modelo || 'Regular Fit',
        tamanho: it.variacao?.tamanho || 'M',
        cor: it.variacao?.cor || 'Padrão',
        quantidade: Number(it.quantidade) || 1,
      });
    });
    setMsgCancelamento({
      tipo: 'ok',
      texto: `Os itens do Pedido #${pedido.id} foram adicionados à sua sacola de compras!`,
      pedidoId: pedido.id,
    });
    openCart();
  };

  const handleSubmeterAvaliacao = async (e) => {
    e.preventDefault();
    if (!produtoParaAvaliar) return;
    if (!formAvaliacao.comentario || formAvaliacao.comentario.trim().length < 3) {
      setMsgAvaliacao({ tipo: 'erro', texto: 'Por favor, escreva um comentário com pelo menos 3 caracteres.' });
      return;
    }
    setEnviandoAvaliacao(true);
    setMsgAvaliacao({ tipo: '', texto: '' });
    try {
      await api.post(`/produtos/${produtoParaAvaliar.id}/avaliacoes`, {
        nota: Number(formAvaliacao.nota),
        comentario: formAvaliacao.comentario.trim(),
      });
      setAvaliadosIds((prev) => [...prev, produtoParaAvaliar.id]);
      setMsgAvaliacao({ tipo: 'ok', texto: 'Avaliação publicada com sucesso! Muito obrigado pelo feedback.' });
      setTimeout(() => {
        setProdutoParaAvaliar(null);
        setMsgAvaliacao({ tipo: '', texto: '' });
      }, 1800);
    } catch (err) {
      setMsgAvaliacao({
        tipo: 'erro',
        texto: err.response?.data?.message || 'Não foi possível enviar a avaliação. Tente novamente.',
      });
    } finally {
      setEnviandoAvaliacao(false);
    }
  };

  useEffect(() => {
    if (pedidoSelecionadoInicial) {
      setAberto(Number(pedidoSelecionadoInicial));
      setPixAbertoId(Number(pedidoSelecionadoInicial));

      if (autoAvaliar && pedidos.length) {
        const ped = pedidos.find((p) => p.id === Number(pedidoSelecionadoInicial));
        if (ped && ped.status === 'Entregue' && ped.itens?.length) {
          const itemParaAvaliar = ped.itens.find((i) => i.variacao?.produto && !avaliadosIds.includes(i.variacao.produto.id)) || ped.itens[0];
          if (itemParaAvaliar?.variacao?.produto) {
            setProdutoParaAvaliar(itemParaAvaliar.variacao.produto);
          }
        }
      }
    } else if (pendenteMaisRecente && aberto === null) {
      setAberto(pendenteMaisRecente.id);
      setPixAbertoId(pendenteMaisRecente.id);
    }
  }, [pedidoSelecionadoInicial, pendenteMaisRecente?.id, autoAvaliar, pedidos]);

  // Atualiza cronômetro regressivo de 30 minutos para pedidos Pendente e cancela automaticamente ao zerar
  useEffect(() => {
    const pendentes = pedidos.filter((p) => p.status === 'Pendente');
    if (pendentes.length === 0) return;

    const timer = setInterval(() => {
      const now = Date.now();
      setAgoraMs(now);

      pendentes.forEach((ped) => {
        const dtBase = new Date(ped.created_at || ped.data_pedido).getTime();
        const expiraEm = dtBase + 30 * 60 * 1000;
        if (now >= expiraEm) {
          cancelarPedido(ped.id)
            .then(() => {
              window.dispatchEvent(new Event('salv-pedidos-atualizados'));
              if (recarregar) recarregar();
            })
            .catch(() => {
              if (recarregar) recarregar();
            });
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pedidos, recarregar]);

  // Polling para detectar aprovação automática do PIX apenas para o pedido pendente que está sendo visualizado
  useEffect(() => {
    if (!pixAbertoId) return;
    const pedidoAberto = pedidos.find((p) => p.id === pixAbertoId && p.status === 'Pendente');
    if (!pedidoAberto) return;

    const poll = setInterval(async () => {
      try {
        const { data } = await api.get(`/pedidos/${pedidoAberto.id}`);
        if (data && data.status && data.status !== 'Pendente') {
          window.dispatchEvent(new Event('salv-pedidos-atualizados'));
          if (recarregar) recarregar();
        }
      } catch {}
    }, 6000);

    return () => clearInterval(poll);
  }, [pixAbertoId, pedidos, recarregar]);

  const handleConfirmarPagamentoPedido = async (pedidoId) => {
    setConfirmandoId(pedidoId);
    try {
      await api.post(`/pedidos/${pedidoId}/confirmar-pagamento`);
      setMsgCancelamento({
        tipo: 'ok',
        texto: `Pagamento do Pedido #${pedidoId} confirmado com sucesso!`,
        pedidoId,
      });
      window.dispatchEvent(new Event('salv-pedidos-atualizados'));
      if (recarregar) recarregar();
    } catch (err) {
      setMsgCancelamento({
        tipo: 'erro',
        texto: err.response?.data?.message || 'Não foi possível confirmar o pagamento no momento.',
        pedidoId,
      });
    } finally {
      setConfirmandoId(null);
    }
  };

  const confirmarCancelamento = async () => {
    if (!pedidoParaCancelar) return;
    setCancelando(true);
    setMsgCancelamento({ tipo: '', texto: '', pedidoId: null });
    try {
      const { data } = await cancelarPedido(pedidoParaCancelar.id);
      setMsgCancelamento({
        tipo: 'ok',
        texto: data.mensagem || `Pedido #${pedidoParaCancelar.id} cancelado com sucesso!`,
        pedidoId: pedidoParaCancelar.id,
      });
      setPedidoParaCancelar(null);
      window.dispatchEvent(new Event('salv-pedidos-atualizados'));
      if (recarregar) recarregar();
    } catch (err) {
      setMsgCancelamento({
        tipo: 'erro',
        texto: err.response?.data?.message || primeiroErro(err),
        pedidoId: pedidoParaCancelar.id,
      });
      setPedidoParaCancelar(null);
    } finally {
      setCancelando(false);
    }
  };

  if (!pedidos.length) {
    return (
      <>
        <h2 className="conta-section-title">Meus pedidos</h2>
        {carregando ? (
          <div style={{ padding: '24px 0', color: '#666', fontSize: '14px' }}>
            Carregando seus pedidos...
          </div>
        ) : (
          <p className="conta-vazio">
            Você ainda não fez nenhum pedido. <Link to="/produtos">Ver produtos</Link>
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <h2 className="conta-section-title">Meus pedidos</h2>

      {msgCancelamento.texto && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            background: msgCancelamento.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${msgCancelamento.tipo === 'ok' ? '#bbf7d0' : '#fecaca'}`,
            color: msgCancelamento.tipo === 'ok' ? '#166534' : '#991b1b',
          }}
        >
          {msgCancelamento.texto}
        </div>
      )}

      <div className="conta-lista">
        {pedidos.map((p) => {
          const isPendente = p.status === 'Pendente';
          const podeCancelar = ['Pendente', 'Pago', 'Em separação', 'Em montagem'].includes(p.status);
          const jaEnviadoOuEntregue = ['Enviado', 'Em transporte', 'Entregue'].includes(p.status);
          const itensResumo = (p.itens || [])
            .map((i) => `${i.quantidade}x ${i.variacao?.produto?.nome ?? 'Produto'} (${i.variacao?.tamanho || ''}/${i.variacao?.cor || ''})`)
            .join(', ');
          const linkWhatsappSuporte = `https://wa.me/5548996205153?text=${encodeURIComponent(
            `Olá! Gostaria de solicitar a devolução referente ao meu Pedido #${p.id} (${itensResumo}).`
          )}`;

          // Cálculo de tempo restante (30 min) para pedidos Pendente
          const dtBaseMs = new Date(p.created_at || p.data_pedido).getTime();
          const segundosRestantes = isPendente
            ? Math.max(0, Math.floor((dtBaseMs + 30 * 60 * 1000 - agoraMs) / 1000))
            : 0;
          const minFmt = String(Math.floor(segundosRestantes / 60)).padStart(2, '0');
          const secFmt = String(segundosRestantes % 60).padStart(2, '0');

          const codigoPixPedido =
            p.pix_copia_e_cola ||
            `00020126580014br.gov.bcb.pix0120salvsacra2@gmail.com5204000053039865405${Number(p.valor_total || 0).toFixed(2)}5802BR5910SALV SACRA6007TUBARAO62140510PEDIDO${String(p.id).padStart(4, '0')}6304B14F`;
          const qrCodeUrlPedido =
            p.pix_qr_code_base64 ||
            `https://api.qrserver.com/v1/create-qr-code/?size=210x210&margin=10&data=${encodeURIComponent(codigoPixPedido)}`;

          return (
          <div
            key={p.id}
            className="conta-box"
            style={isPendente ? { border: '1.5px solid #f59e0b', background: '#fffdf7' } : undefined}
          >
            <button
              type="button"
              className="conta-pedido-head"
              onClick={() => setAberto(aberto === p.id ? null : p.id)}
              aria-expanded={aberto === p.id}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <strong>Pedido #{p.id}</strong>
                <span className="conta-muted"> · {dataBR(p.data_pedido)}</span>
                {isPendente && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#fef3c7',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '999px',
                    }}
                  >
                    🔔 Pagamento Pendente ({minFmt}:{secFmt})
                  </span>
                )}
              </div>
              <div className="conta-pedido-right">
                <span className={`conta-status ${STATUS_CLASS[p.status] ?? 'pendente'}`}>
                  {p.status}
                </span>
                <strong>{moeda(p.valor_total)}</strong>
                <span className="conta-chevron">{aberto === p.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {aberto === p.id && (
              <div className="conta-pedido-detalhe">
                {/* ── Alerta e Área de Pagamento PIX para Pedido Pendente ── */}
                {isPendente && (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '10px',
                      padding: '16px 18px',
                      marginBottom: '18px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <strong style={{ color: '#92400e', fontSize: '14px', display: 'block' }}>
                          ⚠️ Aguardando Pagamento via PIX · Expira em {minFmt}:{secFmt}
                        </strong>
                        <span style={{ fontSize: '12px', color: '#78350f' }}>
                          Se o pagamento não for realizado dentro do prazo de 30 minutos, o pedido será cancelado automaticamente.
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setPixAbertoId(pixAbertoId === p.id ? null : p.id)}
                          style={{
                            background: '#111',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '9px 16px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {pixAbertoId === p.id ? 'Ocultar QR Code PIX' : '💠 Pagar Agora (Ver QR Code)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPedidoParaCancelar(p)}
                          style={{
                            background: '#fff',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            padding: '9px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ✕ Cancelar Pedido
                        </button>
                      </div>
                    </div>

                    {pixAbertoId === p.id && (
                      <div
                        style={{
                          marginTop: '16px',
                          paddingTop: '16px',
                          borderTop: '1px dashed #fcd34d',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '20px',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#fff',
                          borderRadius: '8px',
                          padding: '18px',
                        }}
                      >
                        <div
                          style={{
                            border: '2px solid #111',
                            borderRadius: '10px',
                            padding: '10px',
                            background: '#fff',
                          }}
                        >
                          <img
                            src={qrCodeUrlPedido}
                            alt={`QR Code PIX Pedido #${p.id}`}
                            style={{ width: '175px', height: '175px', display: 'block' }}
                          />
                        </div>

                        <div style={{ flex: '1 1 260px', maxWidth: '420px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', marginBottom: '6px' }}>
                            PIX Copia e Cola (Valor: {moeda(p.valor_total)})
                          </div>
                          <code
                            style={{
                              display: 'block',
                              fontSize: '11px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '10px',
                              wordBreak: 'break-all',
                              color: '#334155',
                              marginBottom: '10px',
                            }}
                          >
                            {codigoPixPedido}
                          </code>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(codigoPixPedido);
                                setCopiadoId(p.id);
                                setTimeout(() => setCopiadoId(null), 3000);
                              }}
                              style={{
                                flex: 1,
                                padding: '10px 14px',
                                background: copiadoId === p.id ? '#15803d' : '#111',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {copiadoId === p.id ? '✓ Código PIX Copiado!' : '📋 Copiar Código PIX'}
                            </button>
                            <button
                              type="button"
                              disabled={confirmandoId === p.id}
                              onClick={() => handleConfirmarPagamentoPedido(p.id)}
                              style={{
                                flex: 1,
                                padding: '10px 14px',
                                background: '#f0fdf4',
                                color: '#166534',
                                border: '1.5px solid #86efac',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {confirmandoId === p.id ? 'Verificando...' : '✓ Já realizei o pagamento'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Rastreamento e Linha do Tempo ── */}
                <div className="conta-rastreio-container">
                  <div className="conta-previsao-banner">
                    <div className="conta-previsao-left">
                      <span className="conta-previsao-icon">📦</span>
                      <div className="conta-previsao-text">
                        <strong>
                          {p.status === 'Cancelado'
                            ? 'Pedido Cancelado'
                            : `Previsão de entrega: ${calcularPrevisaoEntrega(p.data_pedido, p.tipo_frete)}`}
                        </strong>
                        <span>Modalidade de envio: {p.tipo_frete || 'Transportadora Padrão'}</span>
                      </div>
                    </div>
                    <div>
                      {p.codigo_rastreio ? (
                        <a
                          href={`https://rastreamento.correios.com.br/app/index.php?codigo=${encodeURIComponent(p.codigo_rastreio)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="conta-codigo-rastreio"
                          style={{
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                          title="Clique para rastrear a encomenda nos Correios"
                        >
                          📦 Rastreio: {p.codigo_rastreio} ↗
                        </a>
                      ) : (
                        <span className="conta-codigo-rastreio" title="Código de rastreamento">
                          {p.status === 'Cancelado' ? 'Envio cancelado' : 'Rastreio: Aguardando postagem'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stepper / Linha do Tempo (6 etapas: Pendente -> Entregue) */}
                  {p.status !== 'Cancelado' && (() => {
                    const etapaAtual = obterEtapaRastreio(p.status);
                    const steps = [
                      { num: 1, label: 'Pendente', sub: etapaAtual > 1 ? 'Concluído' : 'Aguardando pagamento' },
                      { num: 2, label: 'Pago', sub: etapaAtual >= 2 ? 'Confirmado' : 'Aguardando' },
                      { num: 3, label: 'Em separação', sub: etapaAtual > 3 ? 'Concluído' : (etapaAtual === 3 ? 'Separando peças' : 'Pendente') },
                      { num: 4, label: 'Enviado', sub: etapaAtual >= 4 ? 'Postado na agência' : 'Pendente' },
                      { num: 5, label: 'Em transporte', sub: etapaAtual >= 5 ? 'A caminho' : 'Pendente' },
                      { num: 6, label: 'Entregue', sub: etapaAtual >= 6 ? 'Pacote recebido' : 'Pendente' },
                    ];

                    return (
                      <div className="conta-timeline">
                        {steps.map((st) => {
                          const isCompleted = etapaAtual > st.num || (etapaAtual === 6 && st.num === 6);
                          const isActive = etapaAtual === st.num && etapaAtual !== 6;
                          return (
                            <div
                              key={st.num}
                              className={`conta-timeline-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                            >
                              <div className="conta-timeline-circle">
                                {isCompleted ? '✓' : st.num}
                              </div>
                              <span className="conta-timeline-label">{st.label}</span>
                              <span className="conta-timeline-sub">{st.sub}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <table className="conta-tabela">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th style={{ textAlign: 'center' }}>Qtd</th>
                      <th style={{ textAlign: 'right' }}>Preço</th>
                      {p.status === 'Entregue' && <th style={{ textAlign: 'center' }}>Avaliação</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {p.itens?.map((i) => {
                      const prodObj = i.variacao?.produto || { id: i.produto_id, nome: i.produto?.nome || 'Camiseta' };
                      const jaAvaliado = avaliadosIds.includes(prodObj.id);

                      return (
                        <tr key={i.id}>
                          <td>
                            <strong>{i.variacao?.produto?.nome ?? 'Produto'}</strong>
                            {i.variacao && (
                              <span className="conta-muted" style={{ display: 'block', fontSize: '12px' }}>
                                Tamanho: {i.variacao.tamanho}{i.variacao.cor ? ` · Cor: ${i.variacao.cor}` : ''}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>{i.quantidade}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{moeda(i.preco_unitario)}</td>
                          {p.status === 'Entregue' && (
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setProdutoParaAvaliar(prodObj);
                                  setFormAvaliacao({ nota: 5, titulo: '', comentario: '' });
                                  setMsgAvaliacao({ tipo: '', texto: '' });
                                }}
                                style={{
                                  background: jaAvaliado ? '#f0fdf4' : '#fef3c7',
                                  color: jaAvaliado ? '#166534' : '#92400e',
                                  border: `1px solid ${jaAvaliado ? '#86efac' : '#fde68a'}`,
                                  borderRadius: '6px',
                                  padding: '5px 11px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.2s ease',
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                                onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; }}
                                title="Deixe sua avaliação com estrelas sobre este produto"
                              >
                                {jaAvaliado ? '✓ Avaliado' : '⭐ Avaliar'}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="conta-pedido-info">
                  <p>
                    <strong>Pagamento:</strong>{' '}
                    {p.metodo_pagamento === 'cartao_credito'
                      ? 'CARTÃO DE CRÉDITO'
                      : p.metodo_pagamento === 'cartao_debito'
                      ? 'CARTÃO DE DÉBITO'
                      : p.metodo_pagamento?.toUpperCase()}
                  </p>
                  <p><strong>Frete ({p.tipo_frete}):</strong> {moeda(p.valor_frete)}</p>
                  <p>
                    <strong>Entrega:</strong> {p.logradouro}, {p.numero}
                    {p.complemento ? ` - ${p.complemento}` : ''} — {p.bairro}, {p.cidade}/{p.estado} · CEP {p.cep}
                  </p>
                </div>

                {/* ── Ação de Comprar Novamente ── */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginTop: '16px',
                    paddingTop: '14px',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleComprarNovamente(p)}
                    style={{
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 18px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#1e293b'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#0f172a'; }}
                    title="Adicionar todos os itens deste pedido ao carrinho para comprar novamente"
                  >
                    🛒 Comprar Novamente
                  </button>
                </div>

                {/* ── Ações do Pedido: Cancelamento ou Troca/Devolução ── */}
                {podeCancelar && (
                  <div
                    style={{
                      marginTop: '18px',
                      paddingTop: '16px',
                      borderTop: '1px solid #eee',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: '#666' }}>
                      {p.status === 'Pendente'
                        ? 'Deseja desistir desta compra antes de efetuar o pagamento?'
                        : 'Seu pedido ainda não foi despachado. Caso deseje cancelar, o estorno é feito automaticamente.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPedidoParaCancelar(p)}
                      style={{
                        background: '#fff',
                        color: '#dc2626',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#fef2f2';
                        e.currentTarget.style.borderColor = '#dc2626';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#fff';
                        e.currentTarget.style.borderColor = '#fca5a5';
                      }}
                    >
                      ✕ Cancelar Pedido
                    </button>
                  </div>
                )}

                {/* ── Seção de Logística Reversa & Devoluções Automatizadas ── */}
                {p.status === 'Entregue' && (
                  <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                    {p.devolucao ? (
                      /* Card com o Status Atual da Devolução */
                      <div
                        style={{
                          borderRadius: '8px',
                          padding: '16px 18px',
                          background:
                            p.devolucao.status === 'Concluida'
                              ? '#f0fdf4'
                              : p.devolucao.status === 'Aprovada'
                              ? '#f0f9ff'
                              : p.devolucao.status === 'Recusada'
                              ? '#fef2f2'
                              : '#fffbeb',
                          border: `1.5px solid ${
                            p.devolucao.status === 'Concluida'
                              ? '#86efac'
                              : p.devolucao.status === 'Aprovada'
                              ? '#7dd3fc'
                              : p.devolucao.status === 'Recusada'
                              ? '#fca5a5'
                              : '#fde047'
                          }`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#111' }}>
                            {p.devolucao.status === 'Pendente' && '🟡 Solicitação de Devolução em Análise'}
                            {p.devolucao.status === 'Aprovada' && '📦 Devolução Autorizada · Código de Postagem'}
                            {p.devolucao.status === 'Concluida' && '✓ Devolução Concluída'}
                            {p.devolucao.status === 'Recusada' && '✕ Devolução Não Aprovada'}
                          </span>
                          <span style={{ fontSize: '12px', color: '#666' }}>
                            Opção: <strong>{p.devolucao.tipo_solicitacao === 'cupom' ? 'Vale-Compras (Troca)' : 'Estorno / Reembolso'}</strong> &bull; R$ {Number(p.devolucao.valor_estorno).toFixed(2).replace('.', ',')}
                          </span>
                        </div>

                        {p.devolucao.status === 'Pendente' && (
                          <p style={{ margin: 0, fontSize: '13px', color: '#854d0e', lineHeight: 1.5 }}>
                            Sua solicitação foi registrada e está em análise pela nossa equipe. Em até 2 dias úteis, o seu código gratuito de postagem dos Correios será disponibilizado aqui e no seu e-mail.
                          </p>
                        )}

                        {p.devolucao.status === 'Aprovada' && (
                          <div>
                            <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#0369a1', lineHeight: 1.5 }}>
                              Leve as peças embaladas a qualquer agência dos Correios e apresente a autorização abaixo. <strong>A postagem é 100% gratuita para você</strong>:
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', background: '#fff', padding: '10px 14px', borderRadius: '6px', border: '1.5px dashed #0284c7', width: 'fit-content' }}>
                              <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#64748b' }}>CÓDIGO CORREIOS:</span>
                              <strong style={{ fontFamily: 'monospace', fontSize: '18px', color: '#0369a1', letterSpacing: '1px' }}>
                                {p.devolucao.codigo_postagem_reversa || 'CÓDIGO EM EMISSÃO'}
                              </strong>
                              {p.devolucao.codigo_postagem_reversa && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(p.devolucao.codigo_postagem_reversa);
                                    setModalAviso({
                                      aberto: true,
                                      titulo: 'Código de Postagem Copiado!',
                                      mensagem: 'O código de logística reversa foi copiado. Apresente-o em qualquer agência dos Correios para despacho gratuito.',
                                      icon: '📦',
                                    });
                                  }}
                                  style={{ background: '#0284c7', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Copiar
                                </button>
                              )}
                              <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 600 }}>
                                (Válido por {p.devolucao.prazo_postagem || '7 dias corridos'})
                              </span>
                            </div>
                            {p.devolucao.instrucoes_admin && (
                              <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#555' }}>
                                💡 <em>Instruções do lojista: {p.devolucao.instrucoes_admin}</em>
                              </p>
                            )}
                          </div>
                        )}

                        {p.devolucao.status === 'Concluida' && (
                          <div>
                            {p.devolucao.tipo_solicitacao === 'cupom' && p.devolucao.cupom_gerado_codigo ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', background: '#fff', padding: '10px 14px', borderRadius: '6px', border: '1.5px dashed #9333ea', width: 'fit-content' }}>
                                <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: '#7e22ce' }}>SEU VALE-COMPRAS:</span>
                                <strong style={{ fontFamily: 'monospace', fontSize: '18px', color: '#6b21a8', letterSpacing: '1px' }}>
                                  {p.devolucao.cupom_gerado_codigo}
                                </strong>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(p.devolucao.cupom_gerado_codigo);
                                    setModalAviso({
                                      aberto: true,
                                      titulo: 'Cupom Copiado com Sucesso!',
                                      mensagem: 'O código do seu Vale-Compras foi copiado. Cole no carrinho ou no checkout da sua próxima compra para resgatar seus créditos!',
                                      icon: '🎟️',
                                    });
                                  }}
                                  style={{ background: '#7e22ce', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Copiar Cupom
                                </button>
                                <span style={{ fontSize: '12px', color: '#15803d', fontWeight: 700 }}>
                                  (Crédito de R$ {Number(p.devolucao.valor_estorno).toFixed(2).replace('.', ',')})
                                </span>
                              </div>
                            ) : (
                              <p style={{ margin: 0, fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
                                O estorno no valor de <strong>R$ {Number(p.devolucao.valor_estorno).toFixed(2).replace('.', ',')}</strong> foi concluído com sucesso na mesma forma de pagamento da sua compra.
                              </p>
                            )}
                          </div>
                        )}

                        {p.devolucao.status === 'Recusada' && (
                          <div>
                            <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#991b1b', lineHeight: 1.5 }}>
                              Motivo da recusa: {p.devolucao.motivo_recusa || 'Não atendeu aos requisitos das políticas de devolução.'}
                            </p>
                            <button
                              type="button"
                              onClick={() => abrirModalDevolucao(p)}
                              style={{ background: '#111', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Nova Solicitação
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Botão para Iniciar a Solicitação */
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#666', maxWidth: '540px', lineHeight: 1.45 }}>
                          Precisa devolver alguma peça ou trocar o tamanho? Você tem até 7 dias corridos após o recebimento para solicitar a devolução ou vale-compras gratuito.
                        </span>
                        <button
                          type="button"
                          onClick={() => abrirModalDevolucao(p)}
                          style={{
                            background: '#111',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '9px 18px',
                            fontSize: '13px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          ↩ Solicitar Devolução / Troca
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Pacotes em trânsito */}
                {['Enviado', 'Em transporte'].includes(p.status) && (
                  <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #eee' }}>
                    <span style={{ fontSize: '13px', color: '#666' }}>
                      Como o pacote já foi despachado aos Correios, a opção de devolução ou troca estará disponível assim que a entrega for confirmada.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Modal de Confirmação de Cancelamento de Pedido */}
      {pedidoParaCancelar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px',
          }}
          onClick={() => !cancelando && setPedidoParaCancelar(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#b91c1c', margin: '0 0 12px 0' }}>
              Cancelar Pedido #{pedidoParaCancelar.id}?
            </h3>
            <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.6, margin: '0 0 16px 0' }}>
              Tem certeza de que deseja cancelar o <strong>Pedido #{pedidoParaCancelar.id}</strong> no valor de{' '}
              <strong>{moeda(pedidoParaCancelar.valor_total)}</strong>?
            </p>
            {['Pago', 'Em separação', 'Em montagem'].includes(pedidoParaCancelar.status) && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  color: '#334155',
                  lineHeight: 1.5,
                  marginBottom: '20px',
                }}
              >
                💳 <strong>Estorno Automático:</strong> Como o pagamento já foi aprovado via{' '}
                <strong>
                  {pedidoParaCancelar.metodo_pagamento === 'pix' ? 'PIX' : 'Cartão'}
                </strong>
                , o reembolso integral será processado automaticamente pelo Mercado Pago assim que você confirmar.
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="conta-btn-sec"
                onClick={() => setPedidoParaCancelar(null)}
                disabled={cancelando}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={confirmarCancelamento}
                disabled={cancelando}
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: cancelando ? 'not-allowed' : 'pointer',
                }}
              >
                {cancelando
                  ? (pedidoParaCancelar.status === 'Pendente' ? 'Cancelando...' : 'Cancelando e estornando...')
                  : 'Sim, cancelar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Avaliação Rápida de Produto ── */}
      {produtoParaAvaliar && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '20px',
          }}
          onClick={() => !enviandoAvaliacao && setProdutoParaAvaliar(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '28px 30px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#d97706',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    background: '#fef3c7',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  Compra Verificada
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '8px 0 2px 0' }}>
                  Avaliar Produto
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b' }}>
                  {produtoParaAvaliar.nome}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProdutoParaAvaliar(null)}
                disabled={enviandoAvaliacao}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {msgAvaliacao.texto && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: msgAvaliacao.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
                  color: msgAvaliacao.tipo === 'ok' ? '#166534' : '#991b1b',
                  border: `1px solid ${msgAvaliacao.tipo === 'ok' ? '#bbf7d0' : '#fecaca'}`,
                }}
              >
                {msgAvaliacao.texto}
              </div>
            )}

            <form onSubmit={handleSubmeterAvaliacao}>
              {/* Seletor de Estrelas */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Sua nota *
                </label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map((estrela) => (
                    <button
                      key={estrela}
                      type="button"
                      onClick={() => setFormAvaliacao((prev) => ({ ...prev, nota: estrela }))}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '30px',
                        lineHeight: 1,
                        color: estrela <= formAvaliacao.nota ? '#f59e0b' : '#cbd5e1',
                        padding: '2px',
                        transition: 'transform 0.15s ease',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.2)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                      title={`${estrela} estrela${estrela > 1 ? 's' : ''}`}
                    >
                      ★
                    </button>
                  ))}
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', marginLeft: '8px' }}>
                    {formAvaliacao.nota === 5
                      ? '5/5 · Excelente'
                      : formAvaliacao.nota === 4
                      ? '4/5 · Muito bom'
                      : formAvaliacao.nota === 3
                      ? '3/5 · Bom'
                      : formAvaliacao.nota === 2
                      ? '2/5 · Regular'
                      : '1/5 · Ruim'}
                  </span>
                </div>
              </div>

              {/* Comentário obrigatório */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Seu comentário *
                </label>
                <textarea
                  rows={4}
                  required
                  maxLength={1500}
                  value={formAvaliacao.comentario}
                  onChange={(e) => setFormAvaliacao((prev) => ({ ...prev, comentario: e.target.value }))}
                  placeholder="Conte para outros devotos o que achou da camiseta, qualidade da estampa e caimento..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setProdutoParaAvaliar(null)}
                  disabled={enviandoAvaliacao}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviandoAvaliacao}
                  style={{
                    background: '#0f172a',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 20px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: enviandoAvaliacao ? 'not-allowed' : 'pointer',
                    opacity: enviandoAvaliacao ? 0.7 : 1,
                  }}
                >
                  {enviandoAvaliacao ? 'Publicando...' : 'Publicar Avaliação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal de Solicitação de Devolução / Troca ── */}
      {pedidoParaDevolucao && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
            padding: '20px',
          }}
          onClick={() => !enviandoDevolucao && setPedidoParaDevolucao(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '14px',
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #eee', paddingBottom: '14px', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#888', fontWeight: 700 }}>
                  Logística Reversa Gratuita
                </span>
                <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '4px 0 0', color: '#111' }}>
                  Solicitar Devolução / Troca · Pedido #{pedidoParaDevolucao.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPedidoParaDevolucao(null)}
                disabled={enviandoDevolucao}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            </div>

            {devolucaoSucessoMsg && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, marginBottom: '18px' }}>
                {devolucaoSucessoMsg}
              </div>
            )}

            <form onSubmit={handleSubmeterDevolucao}>
              {/* 1. Seleção de Peças */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  1. Selecione as peças que deseja devolver ou trocar:
                </label>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  {(pedidoParaDevolucao.itens || []).map((it) => {
                    const itemState = itensDevolucaoSelecionados[it.id] || { selecionado: false, quantidade: 1 };
                    const prod = it.variacao?.produto || it.produto;
                    const nome = prod?.nome || 'Camiseta Salv Sacra';
                    const varInfo = [it.variacao?.tamanho, it.variacao?.cor].filter(Boolean).join(' / ');
                    const preco = Number(it.preco_unitario || 0);

                    return (
                      <div
                        key={it.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderBottom: '1px solid #f1f5f9',
                          background: itemState.selecionado ? '#f8fafc' : '#fff',
                        }}
                      >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={itemState.selecionado}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setItensDevolucaoSelecionados((prev) => ({
                                ...prev,
                                [it.id]: {
                                  selecionado: checked,
                                  quantidade: prev[it.id]?.quantidade || 1,
                                },
                              }));
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <div>
                            <strong style={{ fontSize: '13px', color: '#111' }}>{nome}</strong>
                            <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                              {varInfo ? `Variação: ${varInfo} · ` : ''}
                              {preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} un
                            </span>
                          </div>
                        </label>

                        {itemState.selecionado && it.quantidade > 1 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>Qtd:</span>
                            <select
                              value={itemState.quantidade}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setItensDevolucaoSelecionados((prev) => ({
                                  ...prev,
                                  [it.id]: { ...prev[it.id], quantidade: val },
                                }));
                              }}
                              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
                            >
                              {Array.from({ length: it.quantidade }, (_, i) => i + 1).map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Motivo */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.5px' }}>
                  2. Motivo da solicitação *
                </label>
                <select
                  value={motivoDevolucao}
                  onChange={(e) => setMotivoDevolucao(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                >
                  <option value="Tamanho não serviu / Troca de tamanho">Tamanho não serviu / Desejo trocar de tamanho</option>
                  <option value="Arrependimento de compra (7 dias CDC)">Arrependimento da compra (em até 7 dias corridos)</option>
                  <option value="Produto divergente do pedido">Produto divergente ou estampa trocada</option>
                  <option value="Defeito de fabricação">Defeito de fabricação ou costura</option>
                  <option value="Outro">Outro motivo</option>
                </select>
              </div>

              {/* 3. O que prefere (Vale-Compras vs Estorno) */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  3. Como prefere receber o ressarcimento? *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: tipoDevolucao === 'cupom' ? '1.5px solid #9333ea' : '1px solid #e2e8f0',
                      background: tipoDevolucao === 'cupom' ? '#faf5ff' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="tipo_devolucao"
                      value="cupom"
                      checked={tipoDevolucao === 'cupom'}
                      onChange={() => setTipoDevolucao('cupom')}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <strong style={{ fontSize: '13px', color: '#111' }}>
                        🎟️ Vale-Compras / Troca (Recomendado)
                      </strong>
                      <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                        Receba um cupom de 100% do valor para adquirir outro tamanho ou modelo imediatamente sem taxas de envio.
                      </span>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: tipoDevolucao === 'reembolso' ? '1.5px solid #0284c7' : '1px solid #e2e8f0',
                      background: tipoDevolucao === 'reembolso' ? '#f0f9ff' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="tipo_devolucao"
                      value="reembolso"
                      checked={tipoDevolucao === 'reembolso'}
                      onChange={() => setTipoDevolucao('reembolso')}
                      style={{ marginTop: '2px' }}
                    />
                    <div>
                      <strong style={{ fontSize: '13px', color: '#111' }}>
                        💳 Estorno / Reembolso Integral
                      </strong>
                      <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>
                        Ressarcimento na mesma forma de pagamento utilizada (estorno na fatura do cartão ou PIX).
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 4. Comentários adicionais */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', marginBottom: '6px', letterSpacing: '0.5px' }}>
                  4. Detalhes ou observações (opcional)
                </label>
                <textarea
                  rows={2}
                  value={descricaoDevolucao}
                  onChange={(e) => setDescricaoDevolucao(e.target.value)}
                  placeholder="Ex: Gostaria de trocar pela numeração G ou relatar detalhes sobre o produto..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* 5. Fotos do Produto / Defeito */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#475569', letterSpacing: '0.5px' }}>
                    5. Fotos do produto ou defeito (opcional)
                  </label>
                  <span style={{ fontSize: '11px', color: '#888' }}>
                    {fotosDevolucao.length}/5 fotos
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                  Caso a peça tenha vindo com defeito, avaria ou seja diferente do pedido, anexe fotos nítidas para agilizar a conferência.
                </p>

                {/* Previews das fotos selecionadas */}
                {fotosPreviews.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    {fotosPreviews.map((src, idx) => (
                      <div
                        key={idx}
                        style={{
                          position: 'relative',
                          width: '74px',
                          height: '74px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid #cbd5e1',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        }}
                      >
                        <img src={src} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={() => handleRemoverFoto(idx)}
                          style={{
                            position: 'absolute',
                            top: '3px',
                            right: '3px',
                            background: 'rgba(0, 0, 0, 0.7)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            cursor: 'pointer',
                            lineHeight: 1,
                          }}
                          title="Remover foto"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {fotosDevolucao.length < 5 && (
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '9px 14px',
                      borderRadius: '8px',
                      border: '1.5px dashed #cbd5e1',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#334155',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.background = '#f1f5f9'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                  >
                    <span>📷 Anexar Fotos do Produto</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      multiple
                      onChange={handleAdicionarFotos}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPedidoParaDevolucao(null)}
                  disabled={enviandoDevolucao}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviandoDevolucao}
                  style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: enviandoDevolucao ? 'not-allowed' : 'pointer' }}
                >
                  {enviandoDevolucao ? 'Enviando Solicitação...' : 'Confirmar e Solicitar Devolução'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal de Aviso Elegante (Substitui alerts nativos do navegador) ── */}
      {modalAviso.aberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1400,
            padding: '20px',
          }}
          onClick={() => setModalAviso({ aberto: false, titulo: '', mensagem: '', icon: '✓' })}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '14px',
              padding: '28px 24px',
              maxWidth: '420px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                margin: '0 auto 16px',
              }}
            >
              {modalAviso.icon || '✓'}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
              {modalAviso.titulo}
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              {modalAviso.mensagem}
            </p>
            <button
              type="button"
              onClick={() => setModalAviso({ aberto: false, titulo: '', mensagem: '', icon: '✓' })}
              style={{
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.15s ease',
              }}
            >
              OK, Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ───────────────────── Informações pessoais ───────────────────── */
function DadosPessoais({ user, onSalvo, onExcluirConta, excluindoConta }) {
  const [form, setForm] = useState({
    name: user.name ?? '',
    email: user.email ?? '',
    telefone: user.telefone ?? '',
    cpf: user.cpf ?? '',
    data_nascimento: user.data_nascimento ?? '',
  });
  const [msg, setMsg] = useState({ tipo: '', texto: '' });
  const [salvando, setSalvando] = useState(false);

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ tipo: '', texto: '' });
    setSalvando(true);
    try {
      const { data } = await atualizarPerfil(form);
      onSalvo(data.user);
      setMsg({ tipo: 'ok', texto: data.message });
    } catch (err) {
      setMsg({ tipo: 'erro', texto: primeiroErro(err) });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <h2 className="conta-section-title">Informações pessoais</h2>
      <form className="auth-form conta-form" onSubmit={submit}>
        {msg.texto && (
          <p className={msg.tipo === 'ok' ? 'conta-ok' : 'auth-error'}>{msg.texto}</p>
        )}
        <div className="auth-field">
          <label htmlFor="c-name">Nome completo</label>
          <input id="c-name" name="name" value={form.name} onChange={change} required />
        </div>
        <div className="auth-field">
          <label htmlFor="c-email">E-mail</label>
          <input id="c-email" type="email" name="email" value={form.email} onChange={change} required />
        </div>
        <div className="conta-grid-2">
          <div className="auth-field">
            <label htmlFor="c-tel">Telefone</label>
            <input id="c-tel" name="telefone" placeholder="(48) 99999-9999" value={form.telefone} onChange={change} />
          </div>
          <div className="auth-field">
            <label htmlFor="c-cpf">CPF</label>
            <input id="c-cpf" name="cpf" placeholder="000.000.000-00" value={form.cpf} onChange={change} />
          </div>
        </div>
        <div className="auth-field">
          <label htmlFor="c-nasc">Data de nascimento</label>
          <input id="c-nasc" type="date" name="data_nascimento" value={form.data_nascimento} onChange={change} />
        </div>
        <button type="submit" className="auth-btn" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>

      {/* Zona de Exclusão da Conta */}
      <div
        className="conta-box"
        style={{
          marginTop: '32px',
          border: '1px solid #fecaca',
          background: '#fef2f2',
          padding: '20px',
          borderRadius: '10px',
        }}
      >
        <h3 style={{ color: '#b91c1c', margin: '0 0 8px 0', fontSize: '16px' }}>
          Excluir minha conta
        </h3>
        <p style={{ color: '#7f1d1d', fontSize: '13px', margin: '0 0 16px 0', lineHeight: 1.5 }}>
          Ao excluir sua conta, todos os seus dados pessoais, endereços, cartões salvos e histórico de compras serão apagados permanentemente. Esta ação não pode ser desfeita.
        </p>
        <button
          type="button"
          onClick={onExcluirConta}
          disabled={excluindoConta}
          style={{
            background: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '10px 18px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: excluindoConta ? 'not-allowed' : 'pointer',
          }}
        >
          {excluindoConta ? 'Excluindo conta...' : 'Excluir minha conta permanentemente'}
        </button>
      </div>
    </>
  );
}

/* ───────────────────────── Endereços ───────────────────────── */
const ENDERECO_VAZIO = {
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
};

function Enderecos({ enderecos, recarregar }) {
  const [form, setForm] = useState(null); // null = fechado
  const [editId, setEditId] = useState(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const novo = () => { setEditId(null); setForm(ENDERECO_VAZIO); setErro(''); };
  const editar = (end) => {
    setEditId(end.id);
    setForm({
      cep: end.cep, logradouro: end.logradouro, numero: end.numero,
      complemento: end.complemento ?? '', bairro: end.bairro, cidade: end.cidade, estado: end.estado,
    });
    setErro('');
  };

  const buscarCep = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setForm((f) => ({
          ...f,
          logradouro: d.logradouro || f.logradouro,
          bairro: d.bairro || f.bairro,
          cidade: d.localidade || f.cidade,
          estado: d.uf || f.estado,
        }));
      }
    } catch { /* silencioso: usuário preenche manualmente */ }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      if (editId) await atualizarEndereco(editId, form);
      else await criarEndereco(form);
      setForm(null);
      await recarregar();
    } catch (err) {
      setErro(primeiroErro(err));
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (id) => {
    if (!window.confirm('Remover este endereço?')) return;
    await removerEndereco(id);
    recarregar();
  };

  return (
    <>
      <div className="conta-head-row">
        <h2 className="conta-section-title">Endereços</h2>
        {!form && (
          <button type="button" className="conta-btn-sec" onClick={novo}>+ Novo endereço</button>
        )}
      </div>

      {form && (
        <form className="auth-form conta-box conta-form" onSubmit={submit}>
          <h3>{editId ? 'Editar endereço' : 'Novo endereço'}</h3>
          {erro && <p className="auth-error">{erro}</p>}
          <div className="conta-grid-2">
            <div className="auth-field">
              <label htmlFor="e-cep">CEP</label>
              <input id="e-cep" name="cep" value={form.cep} onChange={change} onBlur={buscarCep} required />
            </div>
            <div className="auth-field">
              <label htmlFor="e-uf">Estado (UF)</label>
              <input id="e-uf" name="estado" maxLength={2} value={form.estado} onChange={change} required />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="e-log">Rua / Avenida</label>
            <input id="e-log" name="logradouro" value={form.logradouro} onChange={change} required />
          </div>
          <div className="conta-grid-2">
            <div className="auth-field">
              <label htmlFor="e-num">Número</label>
              <input id="e-num" name="numero" value={form.numero} onChange={change} required />
            </div>
            <div className="auth-field">
              <label htmlFor="e-comp">Complemento</label>
              <input id="e-comp" name="complemento" value={form.complemento} onChange={change} />
            </div>
          </div>
          <div className="conta-grid-2">
            <div className="auth-field">
              <label htmlFor="e-bai">Bairro</label>
              <input id="e-bai" name="bairro" value={form.bairro} onChange={change} required />
            </div>
            <div className="auth-field">
              <label htmlFor="e-cid">Cidade</label>
              <input id="e-cid" name="cidade" value={form.cidade} onChange={change} required />
            </div>
          </div>
          <div className="conta-actions">
            <button type="submit" className="auth-btn" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar endereço'}
            </button>
            <button type="button" className="conta-btn-sec" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {!enderecos.length && !form && (
        <p className="conta-vazio">Você ainda não cadastrou nenhum endereço.</p>
      )}

      <div className="conta-lista">
        {enderecos.map((end) => (
          <div key={end.id} className="conta-box conta-endereco">
            <div>
              <strong>{end.logradouro}, {end.numero}</strong>
              {end.complemento && <span> — {end.complemento}</span>}
              <p className="conta-muted">
                {end.bairro} · {end.cidade}/{end.estado} · CEP {end.cep}
              </p>
            </div>
            <div className="conta-actions">
              <button type="button" className="conta-link" onClick={() => editar(end)}>Editar</button>
              <button type="button" className="conta-link perigo" onClick={() => remover(end.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ───────────────────── Formas de Pagamento ───────────────────── */
const CARTAO_VAZIO = {
  tipo: 'credito',
  titular: '',
  numero: '',
  validade: '',
};

function FormasPagamento({ cartoes, recarregar }) {
  const [form, setForm] = useState(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Formatação amigável do número do cartão (grupos de 4 dígitos)
  const handleNumeroChange = (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 16);
    v = v.replace(/(\d{4})/g, '$1 ').trim();
    setForm((f) => ({ ...f, numero: v }));
  };

  // Formatação amigável da validade (MM/AA)
  const handleValidadeChange = (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) {
      v = `${v.slice(0, 2)}/${v.slice(2)}`;
    }
    setForm((f) => ({ ...f, validade: v }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      await criarCartao({
        tipo: form.tipo,
        titular: form.titular,
        numero: form.numero.replace(/\s+/g, ''),
        validade: form.validade,
      });
      setForm(null);
      await recarregar();
    } catch (err) {
      setErro(primeiroErro(err));
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (id) => {
    if (!window.confirm('Deseja remover este cartão salvo?')) return;
    await removerCartao(id);
    recarregar();
  };

  return (
    <>
      <div className="conta-head-row">
        <div>
          <h2 className="conta-section-title">Formas de pagamento</h2>
          <p className="conta-section-sub">
            Gerencie seus cartões salvos para agilizar suas compras com total segurança.
          </p>
        </div>
        {!form && (
          <button type="button" className="conta-btn-sec" onClick={() => { setForm(CARTAO_VAZIO); setErro(''); }}>
            + Novo cartão
          </button>
        )}
      </div>

      {form && (
        <form className="auth-form conta-box conta-form" onSubmit={submit}>
          <h3>Novo Cartão de Crédito</h3>
          {erro && <p className="auth-error">{erro}</p>}

          <div className="auth-field">
            <label htmlFor="card-titular">Nome impresso no Cartão</label>
            <input
              id="card-titular"
              name="titular"
              placeholder="Ex: JOAO S SILVA"
              value={form.titular}
              onChange={change}
              required
            />
          </div>

          <div className="conta-grid-2">
            <div className="auth-field">
              <label htmlFor="card-num">Número do Cartão</label>
              <input
                id="card-num"
                name="numero"
                placeholder="0000 0000 0000 0000"
                value={form.numero}
                onChange={handleNumeroChange}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="card-val">Validade (MM/AA)</label>
              <input
                id="card-val"
                name="validade"
                placeholder="MM/AA"
                maxLength={5}
                value={form.validade}
                onChange={handleValidadeChange}
                required
              />
            </div>
          </div>

          <div className="conta-payment-info-box" style={{ marginTop: '4px', marginBottom: '14px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <div className="conta-payment-info-text">
              <strong>Segurança Garantida:</strong> Por normas de segurança e privacidade bancária, não solicitamos nem armazenamos o código de segurança (CVV). O CVV será solicitado apenas no momento exato em que você for fechar a compra.
            </div>
          </div>

          <div className="conta-actions">
            <button type="submit" className="auth-btn" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar cartão'}
            </button>
            <button type="button" className="conta-btn-sec" onClick={() => setForm(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {!cartoes.length && !form && (
        <p className="conta-vazio">Você ainda não tem nenhum cartão salvo.</p>
      )}

      <div className="conta-lista">
        {cartoes.map((card) => (
          <div key={card.id} className="conta-box conta-cartao-item">
            <div className="conta-cartao-left">
              <div className="conta-cartao-icon">
                {card.bandeira || 'CARD'}
              </div>
              <div className="conta-cartao-detalhes">
                <strong>
                  •••• •••• •••• {card.ultimos_digitos}
                  <span className="conta-cartao-tag">Crédito</span>
                </strong>
                <p className="conta-muted" style={{ margin: '2px 0 0' }}>
                  {card.titular} · Validade: {card.validade}
                </p>
              </div>
            </div>
            <div className="conta-actions">
              <button
                type="button"
                className="conta-link perigo"
                onClick={() => remover(card.id)}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Orientações sobre Pix e Boleto */}
      <div className="conta-payment-info-box">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <div className="conta-payment-info-text">
          <strong>Sobre Pix e Boleto Bancário:</strong> O Pix e o Boleto não exigem cadastro prévio de dados nesta tela. Eles geram QR Codes, chave copia-e-cola e código de barras exclusivos automaticamente na conclusão de cada pedido com total segurança e praticidade.
        </div>
      </div>
    </>
  );
}

/* ───────────────────────── Senha ───────────────────────── */
function Senha() {
  const vazio = { senha_atual: '', password: '', password_confirmation: '' };
  const [form, setForm] = useState(vazio);
  const [msg, setMsg] = useState({ tipo: '', texto: '' });
  const [salvando, setSalvando] = useState(false);

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setMsg({ tipo: '', texto: '' });
    setSalvando(true);
    try {
      const { data } = await alterarSenha(form);
      setForm(vazio);
      setMsg({ tipo: 'ok', texto: data.message });
    } catch (err) {
      setMsg({ tipo: 'erro', texto: primeiroErro(err) });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <h2 className="conta-section-title">Alterar senha</h2>
      <form className="auth-form conta-form" onSubmit={submit}>
        {msg.texto && (
          <p className={msg.tipo === 'ok' ? 'conta-ok' : 'auth-error'}>{msg.texto}</p>
        )}
        <div className="auth-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="s-atual">Senha atual</label>
            <Link
              to="/esqueci-minha-senha"
              style={{ fontSize: '13px', color: '#111111', textDecoration: 'underline', marginBottom: '6px' }}
            >
              Esqueceu a senha atual?
            </Link>
          </div>
          <input
            id="s-atual"
            type="password"
            name="senha_atual"
            placeholder="Digite sua senha atual"
            value={form.senha_atual}
            onChange={change}
            required
          />
        </div>
        <div className="auth-field">
          <label htmlFor="s-nova">Nova senha</label>
          <input
            id="s-nova"
            type="password"
            name="password"
            placeholder="Mínimo de 8 caracteres"
            value={form.password}
            onChange={change}
            required
          />
        </div>
        <div className="auth-field">
          <label htmlFor="s-conf">Confirmar nova senha</label>
          <input
            id="s-conf"
            type="password"
            name="password_confirmation"
            placeholder="Repita a nova senha"
            value={form.password_confirmation}
            onChange={change}
            required
          />
        </div>
        <button type="submit" className="auth-btn" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Alterar senha'}
        </button>
      </form>
    </>
  );
}

/* ───────────────────────── Lista de Desejos (Favoritos) ───────────────────────── */
function Favoritos({ favoritos, onRemover, carregando }) {
  return (
    <>
      <h2 className="conta-section-title">Lista de desejos</h2>
      <p className="conta-section-sub">
        Suas peças favoritas salvas para comprar quando quiser.
      </p>

      {carregando ? (
        <div className="conta-box">
          <p className="conta-vazio">Carregando sua lista de desejos...</p>
        </div>
      ) : !favoritos || favoritos.length === 0 ? (
        <div className="conta-box" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px', color: '#dc2626' }}>♡</div>
          <p className="conta-vazio" style={{ marginBottom: '14px' }}>
            Você ainda não salvou nenhuma peça na sua lista de desejos.
          </p>
          <Link to="/produtos" className="conta-link">
            Explorar catálogo de camisetas →
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: '18px',
          }}
        >
          {favoritos.map((prod) => {
            const vitrine = Array.isArray(prod.imagens_vitrine) && prod.imagens_vitrine.length > 0
              ? prod.imagens_vitrine
              : Array.isArray(prod.imagens) && prod.imagens.length > 0
              ? prod.imagens
              : [];
            const foto = vitrine[0] || prod.imagem_url;

            return (
              <div
                key={prod.id}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <Link
                  to={`/produto/${prod.id}`}
                  style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                >
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '3 / 4',
                      background: '#f4f4f4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {foto ? (
                      <img
                        src={foto}
                        alt={prod.nome}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ fontSize: '32px' }}>🕊️</span>
                    )}
                  </div>
                  <div style={{ padding: '14px 14px 10px' }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#111',
                        textTransform: 'uppercase',
                        marginBottom: '4px',
                      }}
                    >
                      {prod.nome}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#222' }}>
                      {moeda(prod.preco_base)}
                    </div>
                  </div>
                </Link>

                <div
                  style={{
                    padding: '0 14px 14px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                  }}
                >
                  <Link
                    to={`/produto/${prod.id}`}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      background: '#1e1e1e',
                      color: '#fff',
                      textDecoration: 'none',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Ver peça
                  </Link>
                  <button
                    type="button"
                    onClick={() => onRemover(prod)}
                    title="Remover da lista de desejos"
                    style={{
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      padding: '7px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ───────────────────────── Página ───────────────────────── */
export default function MinhaContaPage() {
  const { user, isAuthenticated, loading, signOut, updateUser, setSession } = useAuth();
  const { favoritosProdutos, totalFavoritos, toggleFavorite, loadingWishlist, carregarFavoritos } = useWishlist();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlAba = searchParams.get('aba');
  const urlPedido = searchParams.get('pedido');
  const urlEmail = searchParams.get('email');
  const urlAvaliar = searchParams.get('avaliar');

  const [aba, setAba] = useState(() => (urlAba && TABS.some((t) => t.id === urlAba) ? urlAba : 'resumo'));
  const [pedidos, setPedidos] = useState(() => {
    try {
      const salvo = localStorage.getItem('minha_conta_pedidos');
      return salvo ? JSON.parse(salvo) : [];
    } catch {
      return [];
    }
  });
  const [carregandoPedidos, setCarregandoPedidos] = useState(() => {
    try {
      return !localStorage.getItem('minha_conta_pedidos');
    } catch {
      return true;
    }
  });
  const [enderecos, setEnderecos] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [excluindoConta, setExcluindoConta] = useState(false);
  const [modalExcluirConta, setModalExcluirConta] = useState(false);

  // Se o link do e-mail veio para outra conta e a conta atual não bate, desloga para que o usuário logue na conta correta
  useEffect(() => {
    if (isAuthenticated && urlEmail && user?.email && urlEmail.toLowerCase() !== user.email.toLowerCase()) {
      signOut().then(() => {
        navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      });
    }
  }, [isAuthenticated, urlEmail, user, signOut, navigate]);

  // Se a URL mudar de aba (ex: vindo de um link externo /minha-conta?aba=pedidos)
  useEffect(() => {
    if (urlAba && TABS.some((t) => t.id === urlAba)) {
      setAba(urlAba);
    }
  }, [urlAba]);

  // Lê do cache local imediatamente para os números já aparecerem na tela no milissegundo 0
  const [resumo, setResumo] = useState(() => {
    try {
      const salvo = localStorage.getItem('minha_conta_resumo');
      return salvo ? JSON.parse(salvo) : null;
    } catch {
      return null;
    }
  });
  const [carregandoDados, setCarregandoDados] = useState(!resumo);

  const carregarPedidos = useCallback(
    () =>
      listarPedidos()
        .then(({ data }) => {
          setPedidos(data);
          try {
            localStorage.setItem('minha_conta_pedidos', JSON.stringify(data));
          } catch {}
        })
        .catch(() => {})
        .finally(() => setCarregandoPedidos(false)),
    [],
  );
  const carregarEnderecos = useCallback(
    () => listarEnderecos().then(({ data }) => setEnderecos(data)).catch(() => {}),
    [],
  );
  const carregarCartoes = useCallback(
    () => listarCartoes().then(({ data }) => setCartoes(data)).catch(() => {}),
    [],
  );

  const carregarResumo = useCallback(() => {
    return obterResumoConta()
      .then(({ data }) => {
        setResumo(data);
        localStorage.setItem('minha_conta_resumo', JSON.stringify(data));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      // 1. Atualiza imediatamente o resumo leve com os contadores
      carregarResumo().finally(() => setCarregandoDados(false));

      // 2. Busca os dados completos para as abas secundárias
      carregarPedidos();
      carregarEnderecos();
      carregarCartoes();
    }
  }, [isAuthenticated, carregarResumo, carregarPedidos, carregarEnderecos, carregarCartoes]);

  useEffect(() => {
    const handleAtualizados = () => {
      carregarPedidos();
      carregarResumo();
    };
    window.addEventListener('salv-pedidos-atualizados', handleAtualizados);
    return () => window.removeEventListener('salv-pedidos-atualizados', handleAtualizados);
  }, [carregarPedidos, carregarResumo]);

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const sair = async () => {
    localStorage.removeItem('minha_conta_resumo');
    localStorage.removeItem('minha_conta_pedidos');
    await signOut();
    navigate('/');
  };

  const abrirConfirmacaoExclusao = () => {
    setModalExcluirConta(true);
  };

  const confirmarExclusaoConta = async () => {
    setExcluindoConta(true);
    try {
      await excluirConta();
      localStorage.removeItem('sanctum_token');
      localStorage.removeItem('minha_conta_resumo');
      localStorage.removeItem('minha_conta_pedidos');
      localStorage.removeItem('@SalvSacra:carrinho');
      localStorage.removeItem('@SalvSacra:cupom');
      // Limpa a sessão diretamente sem chamar signOut() na API (pois a conta e tokens foram excluídos)
      setSession('', null);
      navigate('/login');
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('sanctum_token');
        setSession('', null);
        navigate('/login');
        return;
      }
      alert(primeiroErro(err));
    } finally {
      setExcluindoConta(false);
      setModalExcluirConta(false);
    }
  };

  return (
    <MainLayout breadcrumbs={BREADCRUMBS}>
      <div className="conta-page">
        <h1 className="auth-title">Minha conta</h1>

        <div className="conta-layout">
          <aside className="conta-menu" aria-label="Menu da conta">
            {TABS.map((t) => {
              const qtdPendente = pedidos.filter((p) => p.status === 'Pendente').length || Number(resumo?.pedidos_pendentes || 0);
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`conta-menu-item ${aba === t.id ? 'ativo' : ''}`}
                  onClick={() => setAba(t.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span>{t.label}</span>
                  {t.id === 'pedidos' && qtdPendente > 0 && (
                    <span
                      style={{
                        background: '#dc2626',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '1px 7px',
                        borderRadius: '999px',
                        lineHeight: '16px',
                      }}
                      title="Você possui pedido pendente aguardando pagamento"
                    >
                      !
                    </span>
                  )}
                </button>
              );
            })}
            <button type="button" className="conta-menu-item sair" onClick={sair}>
              Sair
            </button>
            <button
              type="button"
              className="conta-menu-item sair"
              style={{ color: '#dc2626', marginTop: '4px' }}
              onClick={abrirConfirmacaoExclusao}
              disabled={excluindoConta}
            >
              {excluindoConta ? 'Excluindo...' : 'Excluir conta'}
            </button>
          </aside>

          <section className="conta-content">
            {aba === 'resumo' && (
              <Resumo
                user={user}
                pedidos={pedidos}
                enderecos={enderecos}
                cartoes={cartoes}
                totalFavoritos={totalFavoritos}
                resumo={resumo}
                irPara={setAba}
                carregando={carregandoDados}
              />
            )}
            {aba === 'pedidos' && (
              <Pedidos
                pedidos={pedidos}
                pedidoSelecionadoInicial={urlPedido}
                autoAvaliar={urlAvaliar === '1' || urlAvaliar === 'true'}
                carregando={carregandoPedidos}
                recarregar={() => {
                  carregarPedidos();
                  carregarResumo();
                }}
              />
            )}
            {aba === 'favoritos' && (
              <Favoritos
                favoritos={favoritosProdutos}
                carregando={loadingWishlist}
                onRemover={async (prod) => {
                  await toggleFavorite(prod);
                  carregarResumo();
                }}
              />
            )}
            {aba === 'dados' && (
              <DadosPessoais
                user={user}
                onSalvo={updateUser}
                onExcluirConta={abrirConfirmacaoExclusao}
                excluindoConta={excluindoConta}
              />
            )}
            {aba === 'enderecos' && (
              <Enderecos
                enderecos={enderecos}
                recarregar={() => {
                  carregarEnderecos();
                  carregarResumo();
                }}
              />
            )}
            {aba === 'pagamentos' && (
              <FormasPagamento
                cartoes={cartoes}
                recarregar={() => {
                  carregarCartoes();
                  carregarResumo();
                }}
              />
            )}
            {aba === 'senha' && <Senha />}
          </section>
        </div>

        {/* Modal de confirmação de exclusão da conta (sem alerta de localhost) */}
        {modalExcluirConta && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1200,
              padding: '20px',
            }}
            onClick={() => !excluindoConta && setModalExcluirConta(false)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '28px',
                maxWidth: '460px',
                width: '100%',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#b91c1c', margin: '0 0 12px 0' }}>
                Confirmar exclusão de conta
              </h3>
              <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                Tem certeza de que deseja excluir sua conta mesmo? Todos os seus dados pessoais, endereços, cartões salvos e histórico de compras serão apagados permanentemente e não poderão ser recuperados.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="conta-btn-sec"
                  onClick={() => setModalExcluirConta(false)}
                  disabled={excluindoConta}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarExclusaoConta}
                  disabled={excluindoConta}
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: excluindoConta ? 'not-allowed' : 'pointer',
                  }}
                >
                  {excluindoConta ? 'Excluindo...' : 'Sim, excluir minha conta'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
