<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nova Solicitação de Devolução / Troca - Salv Sacra</title>
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
                            <p style="margin: 6px 0 0; color: #d4ac0d; font-size: 13px; letter-spacing: 1px; text-transform: uppercase; font-weight: 600;">Painel Administrativo</p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 36px 32px;">
                            <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 600; color: #111111;">
                                📦 Nova Solicitação de {{ $devolucao->tipo_solicitacao === 'cupom' ? 'Troca (Vale-Compras)' : 'Devolução (Estorno)' }}
                            </h2>
                            <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #444444;">
                                O cliente <strong>{{ $devolucao->user?->name ?? 'Cliente' }}</strong> abriu uma nova solicitação de devolução referente ao <strong>Pedido #{{ $devolucao->pedido_id }}</strong>.
                            </p>

                            <!-- Dados do Cliente e Solicitação -->
                            <div style="background-color: #f8f9fa; border-left: 4px solid #d4ac0d; padding: 18px 20px; border-radius: 4px; margin-bottom: 24px;">
                                <p style="margin: 0 0 8px; font-size: 14px; color: #222222;">
                                    <strong>Cliente:</strong> {{ $devolucao->user?->name ?? 'Não identificado' }} ({{ $devolucao->user?->email ?? '-' }})
                                </p>
                                @if(!empty($devolucao->user?->telefone))
                                    <p style="margin: 0 0 8px; font-size: 14px; color: #222222;">
                                        <strong>Telefone / WhatsApp:</strong> {{ $devolucao->user->telefone }}
                                    </p>
                                @endif
                                <p style="margin: 0 0 8px; font-size: 14px; color: #222222;">
                                    <strong>Tipo de Solicitação:</strong> {{ $devolucao->tipo_solicitacao === 'cupom' ? 'Vale-Compras (Troca por cupom)' : 'Estorno do Valor Pago' }}
                                </p>
                                <p style="margin: 0 0 8px; font-size: 14px; color: #222222;">
                                    <strong>Motivo Informado:</strong> {{ $devolucao->motivo }}
                                </p>
                                @if(!empty($devolucao->descricao))
                                    <p style="margin: 0 0 8px; font-size: 13px; color: #555555; background: #ffffff; padding: 10px; border-radius: 4px; border: 1px solid #e5e7eb;">
                                        <em>"{{ $devolucao->descricao }}"</em>
                                    </p>
                                @endif
                                <p style="margin: 0; font-size: 14px; color: #222222;">
                                    <strong>Valor da Solicitação:</strong> <span style="font-weight: 700; color: #111111;">R$ {{ number_format($devolucao->valor_estorno, 2, ',', '.') }}</span>
                                </p>
                            </div>

                            <!-- Botão CTA -->
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 28px;">
                                <tr>
                                    <td align="center" style="background-color: #111111; border-radius: 6px;">
                                        <a href="{{ $adminUrl }}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 1px; text-transform: uppercase;">
                                            Gerenciar no Painel Admin
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #888888; border-top: 1px solid #eeeeee; padding-top: 20px;">
                                Você pode aprovar ou recusar esta solicitação diretamente no painel de Devoluções e Trocas da Salv Sacra.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color: #fafafa; padding: 20px; font-size: 12px; color: #999999; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0;">© {{ date('Y') }} Salv Sacra — Notificação interna do sistema.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

