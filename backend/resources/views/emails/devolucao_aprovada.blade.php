<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Devolução Aprovada - Salv Sacra</title>
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
                            <div style="background-color: #ecfdf5; border: 1.5px solid #10b981; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px; text-align: center;">
                                <h2 style="margin: 0 0 6px; font-size: 19px; font-weight: 800; color: #065f46;">
                                    ✓ Devolução Aprovada!
                                </h2>
                                <p style="margin: 0; font-size: 13px; color: #047857;">
                                    Referente ao Pedido #{{ $devolucao->pedido_id }}
                                </p>
                            </div>

                            <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #333;">
                                Olá, {{ $devolucao->user?->name ?? 'Cliente' }}! Sua solicitação de logística reversa foi autorizada. Apresente o código abaixo em qualquer agência própria ou franqueada dos Correios:
                            </p>

                            <!-- Código de Postagem Reversa -->
                            <div style="background-color: #f8fafc; border: 2px dashed #0284c7; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                                <span style="display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700; margin-bottom: 6px;">
                                    CÓDIGO DE AUTORIZAÇÃO DE POSTAGEM REVERSA (CORREIOS):
                                </span>
                                <span style="font-family: monospace; font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #0369a1; background: #e0f2fe; padding: 6px 14px; border-radius: 6px; display: inline-block;">
                                    {{ $devolucao->codigo_postagem_reversa ?: 'DISPONÍVEL NA ÁREA DO CLIENTE' }}
                                </span>
                                @if(!empty($devolucao->prazo_postagem))
                                    <p style="margin: 10px 0 0; font-size: 12px; color: #b45309; font-weight: 600;">
                                        ⏳ Validade do código: {{ $devolucao->prazo_postagem }}
                                    </p>
                                @endif
                            </div>

                            @if(!empty($devolucao->instrucoes_admin))
                                <div style="background-color: #fefce8; border-left: 4px solid #ca8a04; padding: 14px 18px; border-radius: 4px; margin-bottom: 24px;">
                                    <strong style="font-size: 13px; color: #854d0e;">Orientações do lojista:</strong>
                                    <p style="margin: 4px 0 0; font-size: 13px; color: #713f12; line-height: 1.5;">
                                        {{ $devolucao->instrucoes_admin }}
                                    </p>
                                </div>
                            @endif

                            <h3 style="margin: 0 0 10px; font-size: 14px; font-weight: 700; color: #111;">
                                Como preparar o seu pacote:
                            </h3>
                            <ul style="margin: 0 0 24px; padding-left: 20px; font-size: 13px; color: #555; line-height: 1.6;">
                                <li>Coloque as peças dobradas na embalagem original ou em caixa parda/pacote similar.</li>
                                <li>As peças devem conter as etiquetas afixadas e sem sinais de uso ou lavagem.</li>
                                <li>Informe o código de postagem reversa ao atendente dos Correios. <strong>Você não paga nada no balcão</strong>.</li>
                            </ul>

                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                                <tr>
                                    <td align="center" style="background-color: #111111; border-radius: 6px;">
                                        <a href="{{ $minhaContaUrl }}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; letter-spacing: 0.5px; text-transform: uppercase;">
                                            Ver Detalhes na Minha Conta
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

