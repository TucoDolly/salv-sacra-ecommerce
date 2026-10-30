<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Pedido Confirmado — Salv Sacra</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td align="center" style="background-color: #111111; padding: 28px 20px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 3px; font-weight: 700; text-transform: uppercase;">SALV SACRA</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <h2 style="margin: 0 0 14px; font-size: 20px; font-weight: 600; color: #111111;">
                Obrigado pelo seu pedido, {{ $pedido->user->name ?? 'Cliente' }}!
              </h2>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #444444;">
                Seu pedido <strong>#{{ $pedido->id }}</strong> foi recebido com sucesso e já está registrado no nosso sistema.
              </p>

              <!-- Order Summary Box -->
              <div style="background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                <div style="font-weight: 700; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #333333;">Itens do Pedido</div>
                @foreach($pedido->itens as $item)
                  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eeeeee; font-size: 14px;">
                    <div>
                      <strong>{{ $item->quantidade }}x</strong> 
                      {{ $item->variacao->produto->nome ?? $item->produto->nome ?? 'Produto' }}
                      @if($item->variacao)
                        <span style="color: #777777; font-size: 12px;">({{ $item->variacao->tamanho ?? '' }} {{ $item->variacao->cor ? '- '.$item->variacao->cor : '' }})</span>
                      @endif
                    </div>
                    <div style="font-weight: 600;">
                      R$ {{ number_format(($item->preco_unitario ?? $item->subtotal ?? 0) * $item->quantidade, 2, ',', '.') }}
                    </div>
                  </div>
                @endforeach
                <div style="font-size: 16px; font-weight: 700; color: #111111; text-align: right; margin-top: 14px;">
                  Total: R$ {{ number_format($pedido->total ?? $pedido->valor_total ?? 0, 2, ',', '.') }}
                </div>
              </div>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 28px;">
                <tr>
                  <td align="center" style="background-color: #111111; border-radius: 6px;">
                    <a href="{{ $minhaContaUrl }}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 1px; text-transform: uppercase;">
                      Acompanhar Pedido
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #888888; border-top: 1px solid #eeeeee; padding-top: 20px;">
                Status atual: <strong>{{ $pedido->status }}</strong><br>
                Forma de pagamento: <strong>{{ strtoupper($pedido->metodo_pagamento ?? 'PIX') }}</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: #fafafa; padding: 20px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; font-size: 12px; color: #999999;">
                © {{ date('Y') }} Salv Sacra. Vestindo a Fé com Elegância.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
