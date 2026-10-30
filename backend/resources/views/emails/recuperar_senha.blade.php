<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperação de Senha - Salv Sacra</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 15px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background-color: #111111; padding: 28px 20px;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 3px; font-weight: 700; text-transform: uppercase;">SALV SACRA</h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 36px 32px;">
                            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111111;">Redefinição de Senha</h2>
                            <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.6; color: #444444;">
                                Olá! Recebemos uma solicitação para redefinir a senha da sua conta vinculada a este e-mail.
                            </p>
                            <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.6; color: #444444;">
                                Para cadastrar uma nova senha, clique no botão seguro abaixo:
                            </p>

                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 30px;">
                                <tr>
                                    <td align="center" style="background-color: #111111; border-radius: 6px;">
                                        <a href="{{ $resetUrl }}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 1px; text-transform: uppercase;">
                                            Redefinir Minha Senha
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.5; color: #777777;">
                                Ou se preferir, copie e cole o link a seguir no seu navegador:
                            </p>
                            <p style="margin: 0 0 24px; font-size: 12px; line-height: 1.5; color: #555555; word-break: break-all; background-color: #f8f9fa; padding: 12px; border-radius: 4px; border: 1px solid #e9ecef;">
                                <a href="{{ $resetUrl }}" style="color: #111111; text-decoration: underline;">{{ $resetUrl }}</a>
                            </p>

                            <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #888888; border-top: 1px solid #eeeeee; padding-top: 20px;">
                                Se você não solicitou a alteração de senha, ignore este e-mail com segurança. Seu acesso continuará o mesmo. Este link expira em 60 minutos.
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

