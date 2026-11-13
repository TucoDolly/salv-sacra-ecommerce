<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Devolução Não Autorizada - Salv Sacra</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 15px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 590px; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
                    <tr>
                        <td align="center" style="background-color: #111111; padding: 26px 20px;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 22px; letter-spacing: 3px; font-weight: 700; text-transform: uppercase;">SALV SACRA</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 36px 32px;">
                            <div style="background-color: #fef2f2; border: 1.5px solid #f87171; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px; text-align: center;">
                                <h2 style="margin: 0 0 6px; font-size: 19px; font-weight: 800; color: #991b1b;">
                                    Solicitação de Devolução Não Aprovada
                                </h2>
                                <p style="margin: 0; font-size: 13px; color: #b91c1c;">
                                    Referente ao Pedido #{{ $devolucao->pedido_id }}
                                </p>
                            </div>

                            <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #333;">
                                Olá, <strong>{{ $devolucao->user?->name ?? 'Cliente' }}</strong>. Informamos que a sua solicitação de devolução/troca para o <strong>Pedido #{{ $devolucao->pedido_id }}</strong> foi analisada por nossa equipe e, no momento, <strong>não pôde ser aprovada</strong>.
                            </p>

                            <!-- Justificativa / Motivo da Recusa -->
                            <div style="background-color: #fafafa; border-left: 4px solid #dc2626; border-radius: 4px; padding: 16px 20px; margin-bottom: 24px;">
                                <span style="display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #7f1d1d; font-weight: 700; margin-bottom: 6px;">
                                    MOTIVO / JUSTIFICATIVA DA EQUIPE:
                                </span>
                                <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: #1f2937; white-space: pre-line;">
                                    {{ $devolucao->motivo_recusa ?: 'O produto não atendeu aos critérios de devolução ou está fora do prazo regulamentar.' }}
                                </p>
                            </div>

                            <!-- Botão WhatsApp para suporte -->
                            <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 18px 20px; text-align: center; margin-bottom: 24px;">
                                <span style="display: block; font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 6px;">
                                    💬 Precisa de esclarecimentos ou ajuda?
                                </span>
                                <p style="margin: 0 0 14px; font-size: 12px; color: #15803d; line-height: 1.5;">
                                    Nossa equipe de atendimento ao cliente está à disposição para analisar qualquer dúvida ou detalhe adicional pelo WhatsApp oficial da loja.
                                </p>
                                <a href="https://wa.me/5548996205153?text={{ urlencode('Olá, gostaria de falar sobre a solicitação de devolução do pedido #' . $devolucao->pedido_id) }}" target="_blank" style="background-color: #25d366; color: #ffffff; padding: 10px 22px; border-radius: 6px; font-size: 13px; font-weight: 700; text-decoration: none; display: inline-block;">
                                    Falar pelo WhatsApp: (48) 99620-5153
                                </a>
                            </div>

                            <div style="text-align: center; margin-top: 28px;">
                                <a href="{{ $minhaContaUrl }}" target="_blank" style="background-color: #111111; color: #ffffff; padding: 12px 28px; border-radius: 6px; font-size: 13px; font-weight: 700; text-decoration: none; display: inline-block;">
                                    Acessar Minha Conta &rarr;
                                </a>
                            </div>

                            <p style="margin: 32px 0 0; font-size: 12px; line-height: 1.6; color: #888888; text-align: center;">
                                Salv Sacra &mdash; Vista a sua fé com elegância e propósito.<br/>
                                Este é um e-mail transacional automático do seu pedido.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

