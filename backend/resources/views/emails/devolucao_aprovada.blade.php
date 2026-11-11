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
                <table role="presentation" width="100%" style="max-width: 590px; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
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
                                Olá, <strong>{{ $devolucao->user?->name ?? 'Cliente' }}</strong>! Sua solicitação de logística reversa foi autorizada pela nossa equipe. Apresente o código abaixo em qualquer agência própria ou conveniada dos Correios:
                            </p>

                            <!-- Código de Postagem Reversa -->
                            <div style="background-color: #f8fafc; border: 2px dashed #0284c7; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 22px;">
                                <span style="display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700; margin-bottom: 6px;">
                                    CÓDIGO DE AUTORIZAÇÃO DE POSTAGEM REVERSA (RASTREIO) (CORREIOS):
                                </span>
                                <span style="font-family: monospace; font-size: 24px; font-weight: 800; letter-spacing: 2px; color: #0369a1; background: #e0f2fe; padding: 6px 16px; border-radius: 6px; display: inline-block;">
                                    {{ $devolucao->codigo_postagem_reversa ?: 'DISPONÍVEL NA ÁREA DO CLIENTE' }}
                                </span>
                                @if(!empty($devolucao->codigo_postagem_reversa))
                                    <div style="margin-top: 14px;">
                                        <a href="https://rastreamento.correios.com.br/app/index.php?codigo={{ urlencode($devolucao->codigo_postagem_reversa) }}" target="_blank" style="background-color: #0284c7; color: #ffffff; padding: 8px 18px; border-radius: 6px; font-size: 13px; font-weight: 700; text-decoration: none; display: inline-block;">
                                            Acompanhar Rastreio nos Correios &rarr;
                                        </a>
                                    </div>
                                @endif
                                <p style="margin: 10px 0 0; font-size: 12px; color: #b45309; font-weight: 700;">
                                    🚩 Atenção: Este código de logística reversa tem validade de {{ $devolucao->prazo_postagem ?: '7 dias corridos' }} a partir da data de emissão.
                                </p>
                            </div>

                            <!-- Declaração de Conteúdo (se houver) -->
                            @if(!empty($devolucao->declaracao_conteudo_url))
                                <div style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 16px 18px; margin-bottom: 24px; text-align: center;">
                                    <span style="font-size: 13px; font-weight: 700; color: #166534; display: block; margin-bottom: 6px;">
                                        📄 Declaração de Conteúdo Pronta para Impressão
                                    </span>
                                    <p style="margin: 0 0 12px; font-size: 12px; color: #15803d; line-height: 1.4;">
                                        O arquivo da declaração de conteúdo está anexado a este e-mail. Você também pode visualizá-lo ou baixá-lo diretamente pelo link abaixo:
                                    </p>
                                    <a href="{{ $devolucao->declaracao_conteudo_url }}" target="_blank" style="display: inline-block; background-color: #166534; color: #ffffff; text-decoration: none; padding: 9px 18px; border-radius: 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;">
                                        Baixar Declaração de Conteúdo ↗
                                    </a>
                                </div>
                            @endif

                            @if(!empty($devolucao->instrucoes_admin))
                                <div style="background-color: #fefce8; border-left: 4px solid #ca8a04; padding: 14px 18px; border-radius: 4px; margin-bottom: 24px;">
                                    <strong style="font-size: 13px; color: #854d0e;">Orientações da Salv Sacra:</strong>
                                    <p style="margin: 4px 0 0; font-size: 13px; color: #713f12; line-height: 1.5;">
                                        {{ $devolucao->instrucoes_admin }}
                                    </p>
                                </div>
                            @endif

                            <!-- Instruções Passo a Passo Adaptadas -->
                            <div style="background-color: #fafafa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                                <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 800; color: #111;">
                                    👉 O que você precisa fazer (Passo a Passo):
                                </h3>
                                <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #374151; line-height: 1.7;">
                                    <li style="margin-bottom: 8px;">
                                        <strong>Reembalar o pacote:</strong> Utilize preferencialmente a embalagem original ou um pacote com dimensões similares às informadas na logística reversa. <strong>Atenção:</strong> retire ou cubra totalmente a etiqueta antiga de envio para não causar confusão ou erro de leitura nos Correios.
                                    </li>
                                    <li style="margin-bottom: 8px;">
                                        <strong>Declaração de Conteúdo:</strong> Imprima a declaração de conteúdo (em anexo neste e-mail) e fixe-a na parte externa da embalagem ou entregue diretamente ao atendente da agência.
                                    </li>
                                    <li style="margin-bottom: 8px;">
                                        <strong>Comparecer à agência dos Correios:</strong> Leve o pacote pronto para envio até qualquer agência dos Correios e informe o <strong>Código de Postagem Reversa (rastreio)</strong> durante o atendimento. <em>O envio é 100% gratuito para você!</em>
                                    </li>
                                    <li>
                                        <strong>Acompanhamento e Liberação:</strong> O pacote seguirá o fluxo normal de postagem e seguirá para o nosso endereço. Assim que recebido e verificado, liberaremos o seu <strong>{{ $devolucao->tipo_solicitacao === 'cupom' ? 'Vale-Compras para nova compra' : 'Estorno / Reembolso integral' }}</strong>.
                                    </li>
                                </ol>
                            </div>

                            <!-- Botão Minha Conta -->
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto 24px auto;">
                                <tr>
                                    <td align="center" style="background-color: #111111; border-radius: 6px;">
                                        <a href="{{ $minhaContaUrl }}" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 13px; font-weight: 700; color: #ffffff; text-decoration: none; letter-spacing: 0.5px; text-transform: uppercase;">
                                            Ver Detalhes na Minha Conta
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Seção de Suporte WhatsApp -->
                            <div style="background-color: #f0fdf4; border: 1.5px dashed #22c55e; border-radius: 8px; padding: 18px; text-align: center;">
                                <p style="margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #166534;">
                                    💬 Ficou com alguma dúvida sobre a postagem ou processo de devolução?
                                </p>
                                <p style="margin: 0 0 14px; font-size: 12px; color: #15803d; line-height: 1.5;">
                                    Nossa equipe está à disposição para te auxiliar em todas as etapas através do nosso canal oficial no WhatsApp.
                                </p>
                                <a href="https://wa.me/5548996205153?text={{ urlencode('Olá! Gostaria de tirar uma dúvida sobre a devolução do meu Pedido #' . $devolucao->pedido_id) }}" target="_blank" style="display: inline-block; background-color: #25d366; color: #ffffff; text-decoration: none; padding: 11px 22px; border-radius: 6px; font-size: 13px; font-weight: 800; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(37,211,102,0.35);">
                                    Fale Conosco no WhatsApp (48) 99620-5153
                                </a>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="background-color: #fafafa; padding: 18px; border-top: 1px solid #eee;">
                            <p style="margin: 0; font-size: 12px; color: #999;">© {{ date('Y') }} Salv Sacra. Vista a sua fé com elegância e propósito.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
