<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mensagem de Contato - Salv Sacra</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 15px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background-color: #111111; padding: 24px 20px;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 22px; letter-spacing: 2px; font-weight: 700; text-transform: uppercase;">SALV SACRA</h1>
                            <p style="margin: 6px 0 0; color: #aaaaaa; font-size: 13px;">Nova mensagem pelo formulário de contato</p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 32px;">
                            <div style="margin-bottom: 20px; border-bottom: 1px solid #eeeeee; padding-bottom: 16px;">
                                <p style="margin: 0 0 6px; font-size: 13px; color: #777777; text-transform: uppercase;">Remetente:</p>
                                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #111111;">{{ $dados['nome'] }}</p>
                            </div>

                            <div style="margin-bottom: 20px; border-bottom: 1px solid #eeeeee; padding-bottom: 16px;">
                                <p style="margin: 0 0 6px; font-size: 13px; color: #777777; text-transform: uppercase;">E-mail:</p>
                                <p style="margin: 0; font-size: 15px; color: #111111;">{{ $dados['email'] }}</p>
                            </div>

                            @if(!empty($dados['telefone']))
                            <div style="margin-bottom: 20px; border-bottom: 1px solid #eeeeee; padding-bottom: 16px;">
                                <p style="margin: 0 0 6px; font-size: 13px; color: #777777; text-transform: uppercase;">Telefone / WhatsApp:</p>
                                <p style="margin: 0; font-size: 15px; color: #111111;">{{ $dados['telefone'] }}</p>
                            </div>
                            @endif

                            <div style="margin-bottom: 24px;">
                                <p style="margin: 0 0 8px; font-size: 13px; color: #777777; text-transform: uppercase;">Mensagem:</p>
                                <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 16px; font-size: 14px; line-height: 1.6; color: #333333; white-space: pre-wrap;">{{ $dados['mensagem'] }}</div>
                            </div>

                            <p style="margin: 0; font-size: 12px; color: #888888; font-style: italic;">
                                Dica: Você pode responder diretamente a este e-mail para entrar em contato com o cliente.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color: #fafafa; padding: 16px; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0; font-size: 12px; color: #999999;">
                                © {{ date('Y') }} Salv Sacra Ecommerce.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

