import { useEffect, useState } from 'react';
import { getConfiguracoesAdmin, updateConfiguracoesAdmin } from '../../services/configuracaoService';
import { uploadArquivoImagem } from '../../services/uploadService';
import api from '../../services/api';
import bannerSaoJose from '../../assets/banner-sao-jose.jpg';
import bannerDesatadora from '../../assets/banner-desatadora.jpg';
import bannerPorVoce from '../../assets/banner-por-voce.jpg';
import '../../styles/admin.css';
import CuponsAdmin from './CuponsAdmin';

const DEFAULT_CARROSSEL_SLIDES = [
  {
    id: 1,
    tag: 'Camiseta Regular Fit',
    title: 'São José',
    cta: 'Saiba mais',
    image: '',
    tema: 'claro',
    produto_id: '',
  },
  {
    id: 2,
    tag: 'Camiseta Regular Fit',
    title: 'Desatadora',
    cta: 'Saiba mais',
    image: '',
    tema: 'escuro',
    produto_id: '',
  },
  {
    id: 3,
    tag: 'Camiseta Oversized',
    title: 'Por Você',
    cta: 'Saiba mais',
    image: '',
    tema: 'claro',
    produto_id: '',
  },
];

const FALLBACK_BANNER_IMGS = [bannerSaoJose, bannerDesatadora, bannerPorVoce];

export default function ConfiguracoesPage() {
  const [form, setForm] = useState({
    // Loja
    nome_loja: '',
    slogan_loja: '',

    // Frete & Avisos
    frete_gratis_minimo: '',
    cep_origem: '88702-280',
    melhor_envio_token: '',
    aviso_topo_texto: '',
    aviso_topo_ativo: '1',

    // PIX & Pagamentos
    mercadopago_access_token: '',
    mercadopago_public_key: '',
    cartao_gateway_modo: 'mercadopago',
    cartao_parcelas_max: '6',
    pix_chave: '',
    pix_beneficiario: '',
    pix_cidade: '',
    pix_desconto_pct: '',

    // Atendimento & Contato
    contato_email: '',
    contato_telefone: '',
    contato_whatsapp: '',
    contato_endereco: '',
    instagram_url: '',

    // Carrossel da Home (JSON)
    carrossel_slides: '',
  });

  const [slidesCarrossel, setSlidesCarrossel] = useState(DEFAULT_CARROSSEL_SLIDES);
  const [produtosLista, setProdutosLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState({ tipo: '', texto: '' });
  const [abaAtiva, setAbaAtiva] = useState('loja'); // 'loja' | 'carrossel' | 'frete' | 'pagamento' | 'cupons' | 'contato'

  useEffect(() => {
    carregarConfiguracoes();
    api.get('/produtos')
      .then((res) => setProdutosLista(res.data || []))
      .catch(() => setProdutosLista([]));
  }, []);

  const carregarConfiguracoes = async () => {
    setLoading(true);
    try {
      const { data } = await getConfiguracoesAdmin();
      if (data) {
        setForm((prev) => ({
          ...prev,
          ...data,
        }));
        if (data.carrossel_slides) {
          try {
            const parsed = JSON.parse(data.carrossel_slides);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSlidesCarrossel(parsed);
            }
          } catch {
            // mantém padrão
          }
        }
      }
    } catch {
      setFeedback({ tipo: 'erro', texto: 'Não foi possível carregar as configurações da loja.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSlideChange = (idx, campo, valor) => {
    setSlidesCarrossel((prev) => {
      const novo = [...prev];
      novo[idx] = { ...novo[idx], [campo]: valor };
      return novo;
    });
  };

  const handleAdicionarSlide = () => {
    setSlidesCarrossel((prev) => [
      ...prev,
      {
        id: Date.now(),
        tag: 'Nova Coleção',
        title: 'Título do Slide',
        cta: 'Saiba mais',
        image: '',
        tema: 'claro',
        produto_id: '',
      },
    ]);
  };

  const handleRemoverSlide = (idx) => {
    if (slidesCarrossel.length <= 1) {
      alert('O carrossel precisa ter pelo menos 1 slide.');
      return;
    }
    setSlidesCarrossel((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setFeedback({ tipo: '', texto: '' });

    try {
      const payload = {
        ...form,
        carrossel_slides: JSON.stringify(slidesCarrossel),
      };
      await updateConfiguracoesAdmin(payload);
      setFeedback({ tipo: 'sucesso', texto: 'Configurações atualizadas com sucesso!' });
      setTimeout(() => setFeedback({ tipo: '', texto: '' }), 4000);
    } catch {
      setFeedback({ tipo: 'erro', texto: 'Erro ao salvar as configurações.' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="admin-page" style={{ maxWidth: '1000px' }}>
      {/* ── Topo do Painel de Configurações ── */}
      <div className="admin-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="admin-title">Configurações da Loja</h1>
          <p style={{ color: '#777', fontSize: '14px', marginTop: '4px' }}>
            Personalize informações de contato, banner de frete grátis, chave PIX e dados gerais do e-commerce.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || salvando}
          className="admin-btn admin-btn-primary"
        >
          {salvando ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      {feedback.texto && (
        <div style={{
          padding: '14px 18px',
          borderRadius: '8px',
          marginBottom: '24px',
          fontWeight: 600,
          fontSize: '14px',
          background: feedback.tipo === 'sucesso' ? '#dcfce7' : '#fee2e2',
          color: feedback.tipo === 'sucesso' ? '#15803d' : '#b91c1c',
          border: `1px solid ${feedback.tipo === 'sucesso' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {feedback.texto}
        </div>
      )}

      {/* ── Abas de Navegação das Configurações ── */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e5e7eb',
        marginBottom: '28px',
      }}>
        {[
          { id: 'loja', label: 'Identidade da Loja' },
          { id: 'carrossel', label: 'Carrossel da Vitrine' },
          { id: 'frete', label: 'Frete & Banner de Topo' },
          { id: 'pagamento', label: 'Pagamentos & PIX' },
          { id: 'cupons', label: 'Cupons de Desconto' },
          { id: 'contato', label: 'Atendimento & Contato' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setAbaAtiva(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              fontWeight: 700,
              color: abaAtiva === tab.id ? '#111' : '#64748b',
              borderBottom: abaAtiva === tab.id ? '2px solid #111' : '2px solid transparent',
              marginBottom: '-2px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
          Carregando configurações...
        </div>
      ) : abaAtiva === 'cupons' ? (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eaeaea', padding: '32px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <CuponsAdmin />
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: '12px', border: '1px solid #eaeaea', padding: '32px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          {/* ════════ ABA 1: IDENTIDADE DA LOJA ════════ */}
          {abaAtiva === 'loja' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                  Nome da Loja
                </label>
                <input
                  type="text"
                  name="nome_loja"
                  value={form.nome_loja}
                  onChange={handleChange}
                  placeholder="Ex: Salv Sacra"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                  Slogan ou Frase Institucional
                </label>
                <input
                  type="text"
                  name="slogan_loja"
                  value={form.slogan_loja}
                  onChange={handleChange}
                  placeholder="Ex: Vestindo a Fé com Elegância"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>
          )}

          {/* ════════ ABA 2: FRETE & BANNER DE TOPO ════════ */}
          {abaAtiva === 'frete' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                    CEP de Origem da Loja (Centro de Distribuição)
                  </label>
                  <input
                    type="text"
                    name="cep_origem"
                    value={form.cep_origem || '88702-280'}
                    onChange={handleChange}
                    placeholder="Ex: 88702-280"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                  />
                  <span style={{ display: 'block', fontSize: '12px', color: '#888', marginTop: '6px' }}>
                    Utilizado como ponto de partida no cálculo do frete (Ex: Tubarão/SC).
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                    Valor Mínimo para Frete Grátis (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="frete_gratis_minimo"
                    value={form.frete_gratis_minimo}
                    onChange={handleChange}
                    placeholder="Ex: 500.00"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                  />
                  <span style={{ display: 'block', fontSize: '12px', color: '#888', marginTop: '6px' }}>
                    Pedidos iguais ou acima deste valor ganham envio econômico grátis.
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                  Token de API — Melhor Envio (Opcional para Cotação Oficial em Produção)
                </label>
                <input
                  type="password"
                  name="melhor_envio_token"
                  value={form.melhor_envio_token || ''}
                  onChange={handleChange}
                  placeholder="Cole aqui o seu Bearer Token do Melhor Envio (se vazio, usa a tabela oficial dos Correios)"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                />
                <span style={{ display: 'block', fontSize: '12px', color: '#888', marginTop: '6px' }}>
                  Quando preenchido, conecta em tempo real na API do Melhor Envio (filtrando para Correios PAC e SEDEX). Caso esteja vazio, o sistema calcula automaticamente pela distância real via ViaCEP + Tabela Oficial dos Correios.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                  Texto do Banner de Avisos no Topo do Site
                </label>
                <input
                  type="text"
                  name="aviso_topo_texto"
                  value={form.aviso_topo_texto}
                  onChange={handleChange}
                  placeholder="Ex: ✦ FRETE GRÁTIS PARA COMPRAS ACIMA DE R$500 ✦"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 600, color: '#333', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.aviso_topo_ativo === '1'}
                    onChange={(e) => setForm((prev) => ({ ...prev, aviso_topo_ativo: e.target.checked ? '1' : '0' }))}
                    style={{ width: '18px', height: '18px' }}
                  />
                  Exibir banner de aviso no topo da loja
                </label>
              </div>
            </div>
          )}

          {/* ════════ ABA 3: PAGAMENTOS & PIX ════════ */}
          {abaAtiva === 'pagamento' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ padding: '18px 20px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#111' }}>
                  Credenciais do Gateway — Mercado Pago (PIX, Cartão de Crédito e Débito)
                </h3>
                <p style={{ margin: '0 0 18px', fontSize: '12px', color: '#64748b' }}>
                  Obtenha suas chaves em <strong>Mercado Pago Developers → Suas integrações → Credenciais</strong>. A mesma conta processa PIX, Crédito e Débito.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                      Access Token — Mercado Pago (Chave Privada)
                    </label>
                    <input
                      type="password"
                      name="mercadopago_access_token"
                      value={form.mercadopago_access_token || ''}
                      onChange={handleChange}
                      placeholder="Ex: APP_USR-123456789... ou TEST-123456789..."
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', background: '#fff' }}
                    />
                    <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                      Usado no servidor para gerar o QR Code PIX e aprovar pagamentos por Cartão.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                      Public Key — Mercado Pago (Chave Pública)
                    </label>
                    <input
                      type="text"
                      name="mercadopago_public_key"
                      value={form.mercadopago_public_key || ''}
                      onChange={handleChange}
                      placeholder="Ex: APP_USR-987654321... ou TEST-987654321..."
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', background: '#fff' }}
                    />
                    <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                      Usada para criptografar e tokenizar Cartões de Crédito e Débito com segurança.
                    </span>
                  </div>
                </div>
              </div>

              {/* Configurações de Cartão de Crédito */}
              <div style={{ padding: '18px 20px', background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 700, color: '#111' }}>
                  Cartão de Crédito (Mercado Pago)
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                      Modo de Processamento do Cartão
                    </label>
                    <select
                      name="cartao_gateway_modo"
                      value={form.cartao_gateway_modo || 'mercadopago'}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', background: '#fff' }}
                    >
                      <option value="mercadopago">Produção — Mercado Pago API (Cobrança real no cartão)</option>
                      <option value="simulacao">Simulação / Sandbox (Aprovação automática para testes)</option>
                    </select>
                    <span style={{ display: 'block', fontSize: '12px', color: '#888', marginTop: '6px' }}>
                      No modo Produção (padrão), o cartão é validado, tokenizado e cobrado em tempo real via Mercado Pago. No modo Simulação, qualquer cartão válido é aprovado para testes.
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                      Parcelamento Máximo sem Juros (Cartão de Crédito)
                    </label>
                    <select
                      name="cartao_parcelas_max"
                      value={form.cartao_parcelas_max || '6'}
                      onChange={handleChange}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none', background: '#fff' }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <option key={n} value={String(n)}>
                          Até {n}x sem juros
                        </option>
                      ))}
                    </select>
                    <span style={{ display: 'block', fontSize: '12px', color: '#888', marginTop: '6px' }}>
                      Aceita cartões de crédito e cartões múltiplos (à vista em 1x ou parcelado sem juros).
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                    Chave PIX (Recebimento / Fallback EMV)
                  </label>
                  <input
                    type="text"
                    name="pix_chave"
                    value={form.pix_chave}
                    onChange={handleChange}
                    placeholder="E-mail, CPF/CNPJ ou Chave Aleatória"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                    Nome do Titular / Beneficiário PIX
                  </label>
                  <input
                    type="text"
                    name="pix_beneficiario"
                    value={form.pix_beneficiario}
                    onChange={handleChange}
                    placeholder="Ex: SALV SACRA ECOMMERCE"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                    Cidade do Titular
                  </label>
                  <input
                    type="text"
                    name="pix_cidade"
                    value={form.pix_cidade}
                    onChange={handleChange}
                    placeholder="Ex: Tubarão"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                    Desconto para Pagamento com PIX (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="pix_desconto_pct"
                    value={form.pix_desconto_pct}
                    onChange={handleChange}
                    placeholder="Ex: 5"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                  />
                  <span style={{ display: 'block', fontSize: '12px', color: '#888', marginTop: '6px' }}>
                    Desconto aplicado automaticamente na finalização de compra via PIX.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ════════ ABA 4: ATENDIMENTO & CONTATO ════════ */}
          {abaAtiva === 'carrossel' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111' }}>
                    Slides do Carrossel Principal (Página Inicial)
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#666' }}>
                    Configure a foto de fundo de cada slide, os textos exibidos e para qual camiseta o botão &quot;Saiba mais&quot; deve levar o cliente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAdicionarSlide}
                  style={{
                    background: '#f3f4f6',
                    color: '#111',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + ADICIONAR SLIDE
                </button>
              </div>

              {slidesCarrossel.map((slide, idx) => {
                const previewImg = slide.image?.trim() || FALLBACK_BANNER_IMGS[idx % FALLBACK_BANNER_IMGS.length];
                return (
                  <div
                    key={slide.id || idx}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '10px',
                      padding: '20px',
                      background: '#fafafa',
                      display: 'grid',
                      gridTemplateColumns: '220px 1fr',
                      gap: '20px',
                      alignItems: 'start',
                    }}
                  >
                    {/* Preview da Foto */}
                    <div>
                      <div
                        style={{
                          width: '100%',
                          height: '125px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: '#e5e7eb',
                          border: '1px solid #d1d5db',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src={previewImg}
                          alt={`Slide ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#333' }}>Slide #{idx + 1}</span>
                        {slidesCarrossel.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoverSlide(idx)}
                            style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Campos do Slide */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#333', marginBottom: '6px' }}>
                          Foto do Banner
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              borderRadius: '6px',
                              background: '#1e1e1e',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            📁 Escolher Foto do Computador
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                if (e.target.files?.[0]) {
                                  try {
                                    const url = await uploadArquivoImagem(e.target.files[0]);
                                    handleSlideChange(idx, 'image', url);
                                  } catch (err) {
                                    alert(err.response?.data?.message || 'Erro ao enviar a imagem.');
                                  }
                                }
                              }}
                              style={{ display: 'none' }}
                            />
                          </label>

                          {slide.image && (
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              Arquivo atual: <strong>{slide.image.split('/').pop()}</strong>
                            </span>
                          )}
                        </div>

                        <input
                          type="text"
                          value={slide.image || ''}
                          onChange={(e) => handleSlideChange(idx, 'image', e.target.value)}
                          placeholder="Ou cole a URL direta da imagem aqui (ou deixe vazio para foto padrão)"
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px', background: '#fff', color: '#555' }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#333', marginBottom: '6px' }}>
                            Título Principal
                          </label>
                          <input
                            type="text"
                            value={slide.title || ''}
                            onChange={(e) => handleSlideChange(idx, 'title', e.target.value)}
                            placeholder="Ex: São José"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', background: '#fff' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#333', marginBottom: '6px' }}>
                            Subtítulo / Tag Superior
                          </label>
                          <input
                            type="text"
                            value={slide.tag || ''}
                            onChange={(e) => handleSlideChange(idx, 'tag', e.target.value)}
                            placeholder="Ex: Camiseta Regular Fit"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', background: '#fff' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#333', marginBottom: '6px' }}>
                            Cor do Texto / Tema
                          </label>
                          <select
                            value={slide.tema || 'claro'}
                            onChange={(e) => handleSlideChange(idx, 'tema', e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', background: '#fff' }}
                          >
                            <option value="claro">Claro (Texto Branco)</option>
                            <option value="escuro">Escuro (Texto Escuro)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#333', marginBottom: '6px' }}>
                          Produto de destino do botão &quot;Saiba mais&quot;
                        </label>
                        <select
                          value={slide.produto_id || ''}
                          onChange={(e) => handleSlideChange(idx, 'produto_id', e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px', background: '#fff' }}
                        >
                          <option value="">Catálogo Geral de Camisetas (/produtos?categoria=camisetas)</option>
                          {produtosLista.map((prod) => (
                            <option key={prod.id} value={String(prod.id)}>
                              {prod.nome} — R$ {Number(prod.preco_base || 0).toFixed(2).replace('.', ',')}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {abaAtiva === 'contato' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                    E-mail Oficial de Atendimento
                  </label>
                  <input
                    type="email"
                    name="contato_email"
                    value={form.contato_email}
                    onChange={handleChange}
                    placeholder="Ex: salvsacra2@gmail.com"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                    Telefone de Contato
                  </label>
                  <input
                    type="text"
                    name="contato_telefone"
                    value={form.contato_telefone}
                    onChange={handleChange}
                    placeholder="Ex: (48) 99620-5153"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                    WhatsApp (somente números com DDD/DDI)
                  </label>
                  <input
                    type="text"
                    name="contato_whatsapp"
                    value={form.contato_whatsapp}
                    onChange={handleChange}
                    placeholder="Ex: 5548996205153"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                  />
                  <span style={{ display: 'block', fontSize: '12px', color: '#888', marginTop: '6px' }}>
                    Usado para o link direto de conversa do WhatsApp no rodapé.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                    Perfil do Instagram
                  </label>
                  <input
                    type="url"
                    name="instagram_url"
                    value={form.instagram_url}
                    onChange={handleChange}
                    placeholder="Ex: https://instagram.com/salvsacra"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                  Endereço Físico Exibido no Rodapé
                </label>
                <input
                  type="text"
                  name="contato_endereco"
                  value={form.contato_endereco}
                  onChange={handleChange}
                  placeholder="Ex: Rua Manoel Antunes Corrêa, 2171 - Bairro Oficinas, Tubarão - SC"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>
          )}

          {/* Botão de Rodapé do Formulário */}
          <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={salvando}
              className="admin-btn admin-btn-primary"
            >
              {salvando ? 'Salvando Alterações...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
