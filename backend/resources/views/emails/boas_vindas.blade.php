<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo(a) à Salv Sacra</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 15px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="background-color: #111111; padding: 30px 20px;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; letter-spacing: 3px; font-weight: 700; text-transform: uppercase;">SALV SACRA</h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 36px 32px;">
                            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111111;">
                                Olá, {{ $user->name }}! Seja bem-vindo(a).
                            </h2>
                            <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #444444;">
                                Sua conta na <strong>Salv Sacra</strong> foi criada com sucesso! Agora você já pode aproveitar todos os benefícios da nossa loja:
                            </p>

                            <ul style="margin: 0 0 28px; padding-left: 20px; font-size: 14px; line-height: 1.8; color: #555555;">
                                <li>Comprar suas camisetas e artigos com rapidez e total segurança;</li>
                                <li>Acompanhar o status dos seus pedidos em tempo real;</li>
                                <li>Gerenciar seus endereços de entrega e formas de pagamento;</li>
                                <li>Receber novidades e lançamentos exclusivos.</li>
                            </ul>

                            <!-- CTA Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 30px;">
                                <tr>
                                    <td align="center" style="background-color: #111111; border-radius: 6px;">
                                        <a href="{{ $storeUrl }}/produtos" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 1px; text-transform: uppercase;">
                                            Conhecer Coleção
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #888888; border-top: 1px solid #eeeeee; padding-top: 20px;">
                                Seu e-mail de acesso é: <strong>{{ $user->email }}</strong>.<br>
                                Se você não realizou este cadastro, entre em contato imediatamente com o nosso suporte.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td align="center" style="background-color: #fafafa; padding: 20px; border-top: 1px solid #eeeeee;">
                            <p style="margin: 0 0 4px; font-size: 12px; color: #888888;">
                                Dúvidas? Fale conosco pelo nosso suporte ou redes sociais.
                            </p>
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

