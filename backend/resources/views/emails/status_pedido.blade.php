<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Atualização do Pedido - Salv Sacra</title>
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
                            <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 600; color: #111111;">
                                Atualização do seu Pedido #{{ $pedido->id }}
                            </h2>
                            <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #444444;">
                                Olá, {{ $pedido->user?->name ?? 'Cliente' }}! O status do seu pedido foi atualizado para:
                            </p>

                            <!-- Status Box -->
                            <div style="background-color: #f8f9fa; border-left: 4px solid #111111; padding: 16px 20px; border-radius: 4px; margin-bottom: 24px;">
                                <p style="margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #777777;">Status Atual:</p>
                                <p style="margin: 4px 0 0; font-size: 20px; font-weight: 700; color: #111111;">{{ $pedido->status }}</p>
                                @if(!empty($pedido->codigo_rastreio))
                                    <p style="margin: 10px 0 0; font-size: 13px; color: #333333; padding-top: 10px; border-top: 1px solid #e9ecef;">
                                        📦 <strong>Código de Rastreio:</strong> <span style="font-family: monospace; background: #eeeeee; padding: 2px 6px; border-radius: 3px;">{{ $pedido->codigo_rastreio }}</span>
                                    </p>
                                @endif
                                @if(!empty($pedido->tipo_frete))
                                    <p style="margin: 6px 0 0; font-size: 12px; color: #666666;">
                                        Modalidade de envio: {{ $pedido->tipo_frete }}
                                    </p>
                                @endif
                            </div>

                            <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #555555;">
                                Você pode acompanhar todos os detalhes e a evolução da sua compra diretamente na sua área de cliente.
                            </p>

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
                                Total do pedido: <strong>R$ {{ number_format($pedido->total ?? $pedido->valor_total, 2, ',', '.') }}</strong><br>
                                Data da compra: {{ $pedido->created_at ? $pedido->created_at->format('d/m/Y H:i') : '-' }}
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color: #fafafa; padding: 20px; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0; font-size: 12px; color: #999999;">
                                © {{ date('Y') }} Salv Sacra. Todos os direitos reservados.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

