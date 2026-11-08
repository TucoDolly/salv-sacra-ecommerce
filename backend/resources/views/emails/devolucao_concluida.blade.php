<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Devolução Concluída - Salv Sacra</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 15px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                    <tr>
                        <td align="center" style="background-color: #111111; padding: 26px 20px;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 22px; letter-spacing: 3px; font-weight: 700; text-transform: uppercase;">SALV SACRA</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 36px 32px;">
                            <div style="background-color: #f0fdf4; border: 1.5px solid #22c55e; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px; text-align: center;">
                                <h2 style="margin: 0 0 6px; font-size: 20px; font-weight: 800; color: #15803d;">
                                    ✓ Processo de Devolução Finalizado!
                                </h2>
                                <p style="margin: 0; font-size: 13px; color: #166534;">
                                    Pedido #{{ $devolucao->pedido_id }}
                                </p>
                            </div>

                            <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: #333;">
                                Olá, {{ $devolucao->user?->name ?? 'Cliente' }}! As peças devolvidas chegaram ao nosso centro de distribuição, foram conferidas e aprovadas com sucesso.
                            </p>

                            @if($devolucao->tipo_solicitacao === 'cupom' && !empty($devolucao->cupom_gerado_codigo))
                                <!-- Box do Cupom de Vale-Compras -->
                                <div style="background-color: #faf5ff; border: 2px dashed #9333ea; border-radius: 8px; padding: 22px; text-align: center; margin-bottom: 24px;">
                                    <span style="display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #7e22ce; font-weight: 700; margin-bottom: 8px;">
                                        SEU VALE-COMPRAS PARA UMA NOVA COMPRA:
                                    </span>
                                    <span style="font-family: monospace; font-size: 26px; font-weight: 800; letter-spacing: 2px; color: #6b21a8; background: #f3e8ff; padding: 8px 18px; border-radius: 6px; display: inline-block;">
                                        {{ $devolucao->cupom_gerado_codigo }}
                                    </span>
                                    <p style="margin: 12px 0 0; font-size: 14px; font-weight: 700; color: #111;">
                                        Crédito: R$ {{ number_format($devolucao->valor_estorno, 2, ',', '.') }}
                                    </p>
                                    <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">
                                        Aplique este código no campo de cupom no carrinho ou checkout da sua próxima compra.
                                    </p>
                                </div>
                            @else
                                <!-- Box de Estorno / Reembolso -->
                                <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 18px 20px; border-radius: 4px; margin-bottom: 24px;">
                                    <p style="margin: 0 0 6px; font-size: 14px; font-weight: 700; color: #111;">
                                        Reembolso Confirmado
                                    </p>
                                    <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.5;">
                                        O estorno no valor de <strong>R$ {{ number_format($devolucao->valor_estorno, 2, ',', '.') }}</strong> foi processado. Se pagou por PIX, o saldo é estornado na mesma conta bancária; se pagou no cartão de crédito, o valor aparecerá na sua fatura conforme os prazos da sua operadora.
                                    </p>
                                </div>
                            @endif

                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                                <tr>
                                    <td align="center" style="background-color: #111111; border-radius: 6px;">
                                        <a href="{{ $minhaContaUrl }}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; letter-spacing: 0.5px; text-transform: uppercase;">
                                            Ver Histórico na Loja
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="background-color: #fafafa; padding: 18px; border-top: 1px solid #eee;">
                            <p style="margin: 0; font-size: 12px; color: #999;">© {{ date('Y') }} Salv Sacra. Todos os direitos reservados.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

