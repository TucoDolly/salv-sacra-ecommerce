<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Pedido Cancelado — Painel Salv Sacra</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #111111; padding: 26px 20px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; letter-spacing: 3px; font-weight: 700; text-transform: uppercase;">SALV SACRA</h1>
              <span style="color: #fca5a5; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; display: block;">Alerta de Cancelamento</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 14px 18px; margin-bottom: 20px;">
                <strong style="color: #b91c1c; font-size: 15px;">⚠️ Um pedido foi cancelado</strong>
                <p style="margin: 4px 0 0; color: #991b1b; font-size: 13px;">
                  O Pedido <strong>#{{ $pedido->id }}</strong> foi marcado como <strong>Cancelado</strong>. As peças foram devolvidas ao estoque do sistema e, caso tenha sido pago, o estorno financeiro foi solicitado.
                </p>
              </div>

              <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #111111;">
                Detalhes do Pedido #{{ $pedido->id }}
                <span style="font-size: 13px; font-weight: 500; color: #666666;"> · Data original: {{ $pedido->created_at ? $pedido->created_at->format('d/m/Y H:i') : now()->format('d/m/Y H:i') }}</span>
              </h2>

              <!-- Dados do Cliente -->
              <div style="background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 6px; padding: 16px; margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
                <div style="font-weight: 700; text-transform: uppercase; color: #475569; font-size: 12px; margin-bottom: 8px; border-bottom: 1px solid #eeeeee; padding-bottom: 4px;">
                  Cliente
                </div>
                <div><strong>Nome:</strong> {{ $pedido->user->name ?? 'Cliente' }}</div>
                <div><strong>E-mail:</strong> {{ $pedido->email_contato ?: ($pedido->user->email ?? 'Não informado') }}</div>
                @if($pedido->telefone)
                  <div><strong>Telefone / WhatsApp:</strong> {{ $pedido->telefone }}</div>
                @endif
              </div>

              <!-- Itens Cancelados -->
              <div style="background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
                <div style="font-weight: 700; text-transform: uppercase; color: #475569; font-size: 12px; margin-bottom: 10px; border-bottom: 1px solid #eeeeee; padding-bottom: 4px;">
                  Itens Cancelados (Estoque Restaurado)
                </div>
                @foreach($pedido->itens as $item)
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eeeeee; font-size: 13px;">
                    <div>
                      <strong>{{ $item->quantidade }}x</strong> 
                      {{ $item->variacao->produto->nome ?? $item->produto->nome ?? 'Produto' }}
                      @if($item->variacao)
                        <span style="color: #666666; font-size: 12px;">({{ $item->variacao->cor ? $item->variacao->cor . ', ' : '' }}Tam {{ $item->variacao->tamanho }})</span>
                      @endif
                    </div>
                    <div style="font-weight: 600;">
                      R$ {{ number_format(($item->preco_unitario ?? 0) * $item->quantidade, 2, ',', '.') }}
                    </div>
                  </div>
                @endforeach

                <div style="margin-top: 12px; font-size: 13px; text-align: right; color: #555555;">
                  <div style="font-size: 17px; font-weight: 800; color: #dc2626; margin-top: 6px;">
                    Total: R$ {{ number_format($pedido->valor_total ?? 0, 2, ',', '.') }}
                  </div>
                  <div style="font-size: 12px; color: #777777; margin-top: 2px;">
                    Forma de pagamento original: <strong>{{ strtoupper($pedido->metodo_pagamento ?? 'PIX') }}</strong>
                  </div>
                </div>
              </div>

              <!-- CTA Admin Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="background-color: #111111; border-radius: 6px;">
                    <a href="{{ $adminUrl }}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; letter-spacing: 1px; text-transform: uppercase;">
                      Ver no Painel de Pedidos
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #fafafa; padding: 18px 20px; border-top: 1px solid #eeeeee; font-size: 12px; color: #888888;">
              Salv Sacra — Notificação Administrativa Automática
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>

