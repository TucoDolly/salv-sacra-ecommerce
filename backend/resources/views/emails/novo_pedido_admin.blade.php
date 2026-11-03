<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Novo Pedido Recebido — Painel Salv Sacra</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #111111; padding: 26px 20px;">
              <h1 style="margin: 0; color: #c4953a; font-size: 22px; letter-spacing: 3px; font-weight: 700; text-transform: uppercase;">SALV SACRA</h1>
              <span style="color: #ffffff; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; display: block;">Notificação de Novo Pedido</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px;">
                <strong style="color: #166534; font-size: 15px;">🎉 Novo pedido recebido na loja!</strong>
                <p style="margin: 4px 0 0; color: #15803d; font-size: 13px;">Um cliente acabou de finalizar uma compra. Verifique os dados abaixo para preparar o envio.</p>
              </div>

              <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #111111;">
                Pedido #{{ $pedido->id }}
                <span style="font-size: 13px; font-weight: 500; color: #666666;"> · {{ $pedido->created_at ? $pedido->created_at->format('d/m/Y H:i') : now()->format('d/m/Y H:i') }}</span>
              </h2>

              <!-- Dados do Cliente -->
              <div style="background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
                <div style="font-weight: 700; text-transform: uppercase; color: #475569; font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid #eeeeee; padding-bottom: 4px;">
                  Dados do Cliente
                </div>
                <div><strong>Nome:</strong> {{ $pedido->user->name ?? 'Cliente' }}</div>
                <div><strong>E-mail:</strong> {{ $pedido->email_contato ?: ($pedido->user->email ?? 'Não informado') }}</div>
                @if($pedido->telefone)
                  <div><strong>Telefone / WhatsApp:</strong> {{ $pedido->telefone }}</div>
                @endif
              </div>

              <!-- Endereço de Entrega -->
              <div style="background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
                <div style="font-weight: 700; text-transform: uppercase; color: #475569; font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid #eeeeee; padding-bottom: 4px;">
                  Endereço de Entrega ({{ $pedido->tipo_frete ?? 'Envio' }})
                </div>
                <div>{{ $pedido->logradouro }}, {{ $pedido->numero }} {{ $pedido->complemento ? ' - ' . $pedido->complemento : '' }}</div>
                <div>{{ $pedido->bairro }} — {{ $pedido->cidade }}/{{ $pedido->estado }}</div>
                <div><strong>CEP:</strong> {{ $pedido->cep }}</div>
              </div>

              <!-- Itens Comprados -->
              <div style="background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
                <div style="font-weight: 700; text-transform: uppercase; color: #475569; font-size: 12px; margin-bottom: 10px; border-bottom: 1px solid #eeeeee; padding-bottom: 4px;">
                  Itens Comprados
                </div>
                @foreach($pedido->itens as $item)
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eeeeee; font-size: 13px;">
                    <div>
                      <strong>{{ $item->quantidade }}x</strong> 
                      {{ $item->variacao->produto->nome ?? $item->produto->nome ?? 'Produto' }}
                      @if($item->variacao)
                        <span style="color: #666666; font-size: 12px;">({{ $item->variacao->modelo ? $item->variacao->modelo . ', ' : '' }}{{ $item->variacao->cor ? $item->variacao->cor . ', ' : '' }}Tam {{ $item->variacao->tamanho }})</span>
                      @endif
                    </div>
                    <div style="font-weight: 600;">
                      R$ {{ number_format(($item->preco_unitario ?? 0) * $item->quantidade, 2, ',', '.') }}
                    </div>
                  </div>
                @endforeach

                <div style="margin-top: 12px; font-size: 13px; text-align: right; color: #555555;">
                  <div>Frete ({{ $pedido->tipo_frete ?? 'Padrão' }}): <strong>R$ {{ number_format($pedido->valor_frete ?? 0, 2, ',', '.') }}</strong></div>
                  @if(($pedido->valor_desconto_cupom ?? 0) > 0)
                    <div style="color: #15803d;">Cupom {{ $pedido->cupom_codigo }}: <strong>- R$ {{ number_format($pedido->valor_desconto_cupom, 2, ',', '.') }}</strong></div>
                  @endif
                  <div style="font-size: 17px; font-weight: 800; color: #111111; margin-top: 6px;">
                    Total: R$ {{ number_format($pedido->valor_total ?? 0, 2, ',', '.') }}
                  </div>
                  <div style="font-size: 12px; color: #777777; margin-top: 2px;">
                    Forma de pagamento: <strong>{{ strtoupper($pedido->metodo_pagamento ?? 'PIX') }}</strong> · Status: <strong>{{ $pedido->status }}</strong>
                  </div>
                </div>
              </div>

              <!-- CTA Admin Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="background-color: #111111; border-radius: 6px;">
                    <a href="{{ $adminUrl }}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; letter-spacing: 1px; text-transform: uppercase;">
                      Gerenciar Pedido no Painel
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #fafafa; padding: 18px 20px; font-size: 11px; color: #888888; border-top: 1px solid #eeeeee;">
              Salv Sacra — Notificação automática do sistema para o administrador.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>

