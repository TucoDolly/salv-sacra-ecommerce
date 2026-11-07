/**
 * Utilitário para gerar e imprimir o Comprovante / Recibo oficial do Pedido
 * Abre uma janela formatada e pronta para impressão ou exportação em PDF.
 */

const formatarMoeda = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatarData = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatarMetodo = (m) => {
  if (!m) return 'PIX';
  const map = {
    pix: 'PIX (Transferência Instantânea)',
    cartao: 'Cartão de Crédito',
    cartao_credito: 'Cartão de Crédito',
    cartao_debito: 'Cartão de Débito',
    boleto: 'Boleto Bancário',
  };
  return map[m.toLowerCase()] || m.toUpperCase();
};

export function imprimirReciboPedido(pedido) {
  if (!pedido) return;

  const subtotalItens = (pedido.itens || []).reduce(
    (acc, it) => acc + Number(it.preco_unitario || 0) * Number(it.quantidade || 1),
    0
  );
  const frete = Number(pedido.valor_frete || 0);
  const total = Number(pedido.valor_total || pedido.total || subtotalItens + frete);
  const desconto = Math.max(0, subtotalItens + frete - total);

  const clienteNome = pedido.user?.name || pedido.nome_destinatario || 'Cliente Salv Sacra';
  const clienteEmail = pedido.email_contato || pedido.user?.email || '—';
  const clienteTel = pedido.telefone || pedido.user?.telefone || '—';
  const clienteCpf = pedido.cpf || pedido.user?.cpf || '—';

  const enderecoLinha1 = `${pedido.logradouro || ''}, ${pedido.numero || 'S/N'}${
    pedido.complemento ? ` (${pedido.complemento})` : ''
  }`;
  const enderecoLinha2 = `${pedido.bairro || ''} — ${pedido.cidade || ''}/${pedido.estado || ''} · CEP: ${
    pedido.cep || ''
  }`;

  const janela = window.open('', '_blank', 'width=850,height=900');
  if (!janela) {
    alert('Por favor, permita pop-ups no seu navegador para imprimir o comprovante.');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comprovante - Pedido #${pedido.id} | Salv Sacra</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      padding: 32px 20px;
      font-size: 13px;
      line-height: 1.5;
    }
    .recibo-container {
      max-width: 760px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px 40px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.04);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .marca h1 {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .marca p {
      font-size: 12px;
      color: #64748b;
    }
    .pedido-meta {
      text-align: right;
    }
    .pedido-meta .numero {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }
    .pedido-meta .data {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .status-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #f1f5f9;
      color: #334155;
    }
    .status-pago { background: #dcfce7; color: #15803d; }
    .status-separacao { background: #e0e7ff; color: #4338ca; }
    .status-enviado { background: #dbeafe; color: #1d4ed8; }
    .status-entregue { background: #ecfdf5; color: #047857; }
    .status-cancelado { background: #fee2e2; color: #b91c1c; }
    .status-pendente { background: #fef3c7; color: #b45309; }

    .secoes-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 28px;
    }
    .card-info {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px 18px;
    }
    .card-info h3 {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #475569;
      margin-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }
    .card-info p {
      margin-bottom: 4px;
      font-size: 12.5px;
      color: #334155;
    }
    .card-info strong {
      color: #0f172a;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      text-align: left;
      border-top: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
      color: #1e293b;
    }
    .td-num { text-align: center; }
    .td-valor { text-align: right; font-weight: 600; }

    .totais-container {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 28px;
    }
    .totais-tabela {
      width: 300px;
    }
    .totais-linha {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      font-size: 13px;
      color: #475569;
    }
    .totais-linha.destaque {
      border-top: 2px solid #0f172a;
      padding-top: 10px;
      margin-top: 6px;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }

    .rodape {
      border-top: 1px dashed #cbd5e1;
      padding-top: 18px;
      text-align: center;
      color: #64748b;
      font-size: 11.5px;
      line-height: 1.6;
    }

    .btn-bar {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .btn-imprimir {
      background: #0f172a;
      color: #fff;
      border: none;
      padding: 10px 24px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }

    @media print {
      body { background: #fff; padding: 0; }
      .recibo-container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .btn-bar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="btn-bar">
    <button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir / Salvar em PDF</button>
  </div>

  <div class="recibo-container">
    <div class="header">
      <div class="marca">
        <h1>SALV SACRA</h1>
        <p>Vestindo a Fé com Elegância</p>
        <p style="margin-top: 4px; font-size: 11px;">CNPJ: 54.899.825/0001-77 · Tubarão / SC</p>
        <p style="font-size: 11px;">suporte: salvsacra2@gmail.com · (48) 99620-5153</p>
      </div>
      <div class="pedido-meta">
        <div class="numero">PEDIDO #${pedido.id}</div>
        <div class="data">Realizado em: ${formatarData(pedido.data_pedido || pedido.created_at)}</div>
        <div>
          <span class="status-badge status-${(pedido.status || 'pendente').toLowerCase().replace(/\s+/g, '')}">
            ${pedido.status || 'Pendente'}
          </span>
        </div>
      </div>
    </div>

    <div class="secoes-grid">
      <div class="card-info">
        <h3>Dados do Cliente</h3>
        <p><strong>Nome:</strong> ${clienteNome}</p>
        <p><strong>E-mail:</strong> ${clienteEmail}</p>
        <p><strong>Telefone:</strong> ${clienteTel}</p>
        <p><strong>CPF:</strong> ${clienteCpf}</p>
      </div>

      <div class="card-info">
        <h3>Endereço de Entrega</h3>
        <p><strong>Destino:</strong> ${enderecoLinha1}</p>
        <p>${enderecoLinha2}</p>
        <p style="margin-top: 6px;">
          <strong>Modalidade:</strong> ${pedido.tipo_frete || 'Correios SEDEX'}
        </p>
        ${
          pedido.codigo_rastreio
            ? `<p><strong>Código de Rastreio:</strong> ${pedido.codigo_rastreio}</p>`
            : '<p><strong>Rastreio:</strong> Aguardando postagem</p>'
        }
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item / Produto</th>
          <th class="td-num">Qtd</th>
          <th class="td-valor">Unitário</th>
          <th class="td-valor">Total</th>
        </tr>
      </thead>
      <tbody>
        ${(pedido.itens || [])
          .map((i) => {
            const nomeProd = i.variacao?.produto?.nome || i.produto?.nome || 'Camiseta Salv Sacra';
            const detalheVar = i.variacao
              ? `Tamanho: ${i.variacao.tamanho || 'M'}${i.variacao.cor ? ` · Cor: ${i.variacao.cor}` : ''}`
              : '';
            const precoUnit = Number(i.preco_unitario || 0);
            const qtd = Number(i.quantidade || 1);
            return `
              <tr>
                <td>
                  <strong>${nomeProd}</strong>
                  ${detalheVar ? `<br><span style="font-size: 11px; color: #64748b;">${detalheVar}</span>` : ''}
                </td>
                <td class="td-num">${qtd}</td>
                <td class="td-valor">${formatarMoeda(precoUnit)}</td>
                <td class="td-valor">${formatarMoeda(precoUnit * qtd)}</td>
              </tr>
            `;
          })
          .join('')}
      </tbody>
    </table>

    <div class="totais-container">
      <div class="totais-tabela">
        <div class="totais-linha">
          <span>Subtotal dos Itens:</span>
          <strong>${formatarMoeda(subtotalItens)}</strong>
        </div>
        <div class="totais-linha">
          <span>Frete (${pedido.tipo_frete || 'Envio'}):</span>
          <span>${formatarMoeda(frete)}</span>
        </div>
        ${
          desconto > 0.01
            ? `
          <div class="totais-linha" style="color: #15803d;">
            <span>Desconto Aplicado:</span>
            <span>-${formatarMoeda(desconto)}</span>
          </div>
        `
            : ''
        }
        <div class="totais-linha destaque">
          <span>TOTAL:</span>
          <span>${formatarMoeda(total)}</span>
        </div>
        <div style="margin-top: 10px; font-size: 12px; color: #475569; text-align: right;">
          Forma: <strong>${formatarMetodo(pedido.metodo_pagamento)}</strong>
          ${pedido.pagamento_id ? `<br><span style="font-size: 10.5px; color: #94a3b8;">ID Transação: ${pedido.pagamento_id}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="rodape">
      <p>Comprovante gerado automaticamente pela loja online oficial <strong>Salv Sacra</strong>.</p>
      <p>Em caso de dúvidas sobre entrega, trocas ou devoluções, contate nosso suporte oficial informando o número do pedido <strong>#${pedido.id}</strong>.</p>
      <p style="margin-top: 4px; font-weight: 600;">© ${new Date().getFullYear()} Salv Sacra — Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`;

  janela.document.open();
  janela.document.write(html);
  janela.document.close();
}

