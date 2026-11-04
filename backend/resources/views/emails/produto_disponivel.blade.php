<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Produto disponível — Salv Sacra</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <tr>
            <td align="center" style="background-color: #111111; padding: 26px 20px;">
              <h1 style="margin: 0; color: #c4953a; font-size: 22px; letter-spacing: 3px; font-weight: 700; text-transform: uppercase;">SALV SACRA</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="margin: 0 0 12px; font-size: 20px; color: #111111;">Boa notícia, {{ $user->name ?? 'cliente' }}!</h2>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #444444;">
                A peça que você queria voltou ao estoque:
              </p>

              <div style="background-color: #fafafa; border: 1px solid #eeeeee; border-left: 4px solid #c4953a; border-radius: 6px; padding: 16px 20px; margin-bottom: 24px; font-size: 14px; line-height: 1.7;">
                <div style="font-size: 17px; font-weight: 700; color: #111111; margin-bottom: 6px;">{{ $variacao->produto->nome ?? 'Produto' }}</div>
                <div><strong>Tamanho:</strong> {{ $variacao->tamanho }}</div>
                @if($variacao->cor)
                  <div><strong>Cor:</strong> {{ $variacao->cor }}</div>
                @endif
                @if($variacao->modelo)
                  <div><strong>Modelo:</strong> {{ $variacao->modelo }}</div>
                @endif
              </div>

              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #555555;">
                As unidades são limitadas, garanta a sua antes que acabe novamente.
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="background-color: #111111; border-radius: 6px;">
                    <a href="{{ $produtoUrl }}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; letter-spacing: 1px; text-transform: uppercase;">
                      Ver produto
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color: #fafafa; padding: 18px 20px; font-size: 11px; color: #888888; border-top: 1px solid #eeeeee;">
              Você recebeu este e-mail porque pediu para ser avisado sobre esta peça. Este aviso é enviado uma única vez.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>

