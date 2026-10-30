import { useEffect, useState } from 'react';
import { getConfiguracoesAdmin, updateConfiguracoesAdmin } from '../../services/configuracaoService';
import '../../styles/admin.css';
import CuponsAdmin from './CuponsAdmin';

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
  });

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState({ tipo: '', texto: '' });
  const [abaAtiva, setAbaAtiva] = useState('loja'); // 'loja' | 'frete' | 'pagamento' | 'contato'

  useEffect(() => {
    carregarConfiguracoes();
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
      }
    } catch {
      setFeedback({ tipo: 'erro', texto: 'Não foi possível carregar as configurações da loja.' });
    } finally {
      setLoading(false);
    }
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
      await updateConfiguracoesAdmin(form);
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
                  placeholder="Cole aqui o seu Bearer Token do Melhor Envio (se vazio, usa a tabela nacional Correios/Jadlog)"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                />
                <span style={{ display: 'block', fontSize: '12px', color: '#888', marginTop: '6px' }}>
                  Quando preenchido, conecta em tempo real na API do Melhor Envio. Caso esteja vazio, o sistema calcula automaticamente pela distância real via ViaCEP + Tabela Tarifária Correios/Jadlog.
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                  Token de API — Mercado Pago (Access Token)
                </label>
                <input
                  type="password"
                  name="mercadopago_access_token"
                  value={form.mercadopago_access_token || ''}
                  onChange={handleChange}
                  placeholder="Ex: APP_USR-123456789... ou TEST-123456789..."
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '14px', outline: 'none' }}
                />
                <span style={{ display: 'block', fontSize: '12px', color: '#888', marginTop: '6px' }}>
                  Gera o QR Code PIX dinâmico e confirma o pagamento automaticamente via Mercado Pago. Você pode usar um token seu para testes e depois substituir pelo token da conta definitiva.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#333', marginBottom: '8px' }}>
                    Chave PIX
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
                    Nome do Titular / Beneficiário
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
                  placeholder="Ex: Rua Manoel Antunes Corrêa, 2171"
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
