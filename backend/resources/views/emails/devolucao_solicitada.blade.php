<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Solicitação de Devolução - Salv Sacra</title>
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
                            <h2 style="margin: 0 0 14px; font-size: 20px; font-weight: 700; color: #111;">
                                Recebemos sua solicitação de devolução/troca
                            </h2>
                            <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #444;">
                                Olá, {{ $devolucao->user?->name ?? 'Cliente' }}! Registramos seu pedido de devolução referente ao <strong>Pedido #{{ $devolucao->pedido_id }}</strong>. Nossa equipe já está analisando as informações e responderá em até 2 dias úteis.
                            </p>

                            <div style="background-color: #f9fafb; border-left: 4px solid #d4ac0d; padding: 16px 20px; border-radius: 4px; margin-bottom: 24px;">
                                <p style="margin: 0 0 6px; font-size: 13px; color: #666;"><strong>Motivo:</strong> {{ $devolucao->motivo }}</p>
                                <p style="margin: 0 0 6px; font-size: 13px; color: #666;"><strong>Preferencia:</strong> {{ $devolucao->tipo_solicitacao === 'cupom' ? 'Vale-Compras (Troca por outra peça)' : 'Estorno / Reembolso integral' }}</p>
                                <p style="margin: 0; font-size: 13px; color: #666;"><strong>Valor Estimado:</strong> R$ {{ number_format($devolucao->valor_estorno, 2, ',', '.') }}</p>
                            </div>

                            <p style="margin: 0 0 24px; font-size: 13px; line-height: 1.6; color: #555;">
                                Assim que a solicitação for aprovada, você receberá um e-mail com a <strong>Autorização de Postagem Gratuita dos Correios</strong> para enviar o produto de volta sem nenhum custo.
                            </p>

                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                                <tr>
                                    <td align="center" style="background-color: #111111; border-radius: 6px;">
                                        <a href="{{ $minhaContaUrl }}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; letter-spacing: 0.5px; text-transform: uppercase;">
                                            Acompanhar Devolução
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

