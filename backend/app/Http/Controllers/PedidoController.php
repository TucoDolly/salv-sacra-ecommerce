<?php

namespace App\Http\Controllers;

use App\Models\Configuracao;
use App\Models\ItemPedido;
use App\Models\Pedido;
use App\Models\Variacao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use App\Services\RastreioService;
use Carbon\Carbon;

class PedidoController extends Controller
{
    /**
     * Calcula o CRC16-CCITT (0xFFFF) padrão EMVCo do Banco Central para payload PIX.
     */
    private function calcularCrc16Pix(string $payload): string
    {
        $crc = 0xFFFF;
        $len = strlen($payload);
        for ($i = 0; $i < $len; $i++) {
            $crc ^= (ord($payload[$i]) << 8);
            for ($j = 0; $j < 8; $j++) {
                if (($crc & 0x8000) !== 0) {
                    $crc = (($crc << 1) ^ 0x1021) & 0xFFFF;
                } else {
                    $crc = ($crc << 1) & 0xFFFF;
                }
            }
        }
        return strtoupper(str_pad(dechex($crc), 4, '0', STR_PAD_LEFT));
    }

    /**
     * Validação matemática do CPF pelo algoritmo dos dígitos verificadores (Módulo 11).
     */
    private function validarCpf(string $cpf): bool
    {
        $d = preg_replace('/\D/', '', $cpf);
        if (strlen($d) !== 11 || preg_match('/^(\d)\1{10}$/', $d)) {
            return false;
        }
        for ($t = 9; $t < 11; $t++) {
            for ($dSum = 0, $c = 0; $c < $t; $c++) {
                $dSum += (int) $d[$c] * (($t + 1) - $c);
            }
            $dSum = ((10 * $dSum) % 11) % 10;
            if ((int) $d[$c] !== $dSum) {
                return false;
            }
        }
        return true;
    }

    /**
     * Formata um campo TLV (Tag-Length-Value) do padrão BRCode EMVCo.
     */
    private function emvField(string $id, string $valor): string
    {
        $tamanho = str_pad((string) strlen($valor), 2, '0', STR_PAD_LEFT);
        return $id . $tamanho . $valor;
    }

    /**
     * Gera o payload PIX Copia e Cola válido segundo o padrão EMVCo do Banco Central.
     */
    private function gerarPixBrCode(Pedido $pedido): string
    {
        $chave = Configuracao::where('chave', 'pix_chave')->value('valor') ?: 'salvsacra2@gmail.com';
        $beneficiario = Configuracao::where('chave', 'pix_beneficiario')->value('valor') ?: 'SALV SACRA';
        $cidade = Configuracao::where('chave', 'pix_cidade')->value('valor') ?: 'TUBARAO';

        $beneficiarioLimpo = substr(preg_replace('/[^A-Z0-9 ]/', '', strtoupper(Str::ascii($beneficiario))), 0, 25) ?: 'SALV SACRA';
        $cidadeLimpa = substr(preg_replace('/[^A-Z0-9 ]/', '', strtoupper(Str::ascii($cidade))), 0, 15) ?: 'TUBARAO';
        $valorFormatado = number_format((float) $pedido->valor_total, 2, '.', '');
        $txid = 'PEDIDO' . str_pad((string) $pedido->id, 6, '0', STR_PAD_LEFT);

        $gui = $this->emvField('00', 'br.gov.bcb.pix');
        $chaveField = $this->emvField('01', trim($chave));
        $merchantAccount = $this->emvField('26', $gui . $chaveField);

        $additionalData = $this->emvField('62', $this->emvField('05', $txid));

        $payloadSemCrc =
            $this->emvField('00', '01') .
            $merchantAccount .
            $this->emvField('52', '0000') .
            $this->emvField('53', '986') .
            $this->emvField('54', $valorFormatado) .
            $this->emvField('58', 'BR') .
            $this->emvField('59', $beneficiarioLimpo) .
            $this->emvField('60', $cidadeLimpa) .
            $additionalData .
            '6304';

        return $payloadSemCrc . $this->calcularCrc16Pix($payloadSemCrc);
    }

    /**
     * Integra com a API oficial do Mercado Pago (/v1/payments) para criar cobrança PIX.
     * Caso não haja token configurado ou a API retorne erro, gera o BRCode EMV padrão como fallback.
     */
    private function processarPagamentoPix(Pedido $pedido, $user): void
    {
        $mpToken = Configuracao::where('chave', 'mercadopago_access_token')->value('valor')
            ?: env('MERCADOPAGO_ACCESS_TOKEN');

        if (! empty($mpToken)) {
            try {
                $partesNome = explode(' ', trim($user->name ?: 'Cliente Salv Sacra'), 2);
                $primeiroNome = $partesNome[0] ?? 'Cliente';
                $sobrenome = $partesNome[1] ?? 'Salv Sacra';

                $payloadMp = [
                    'transaction_amount' => round((float) $pedido->valor_total, 2),
                    'description'        => "Pedido #{$pedido->id} - Salv Sacra",
                    'payment_method_id'  => 'pix',
                    'date_of_expiration' => now()->addMinutes(30)->format('Y-m-d\TH:i:s.000P'),
                    'external_reference' => (string) $pedido->id,
                    'payer'              => [
                        'email'      => $pedido->email_contato ?: $user->email,
                        'first_name' => $primeiroNome,
                        'last_name'  => $sobrenome,
                    ],
                ];

                if (! empty($user->cpf)) {
                    $cpfLimpo = preg_replace('/\D/', '', $user->cpf);
                    if (strlen($cpfLimpo) === 11) {
                        $payloadMp['payer']['identification'] = [
                            'type'   => 'CPF',
                            'number' => $cpfLimpo,
                        ];
                    }
                }

                $response = Http::withoutVerifying()
                    ->withHeaders([
                        'Authorization'     => 'Bearer ' . trim($mpToken),
                        'X-Idempotency-Key' => 'pedido-pix-' . $pedido->id . '-' . Str::uuid(),
                        'Content-Type'      => 'application/json',
                    ])->timeout(12)->post('https://api.mercadopago.com/v1/payments', $payloadMp);

                if ($response->successful()) {
                    $dados = $response->json();
                    $txData = $dados['point_of_interaction']['transaction_data'] ?? [];
                    $qrCode = $txData['qr_code'] ?? null;
                    $qrCodeBase64 = $txData['qr_code_base64'] ?? null;

                    if ($qrCode) {
                        $pedido->update([
                            'pagamento_id'       => (string) ($dados['id'] ?? ''),
                            'pix_copia_e_cola'   => $qrCode,
                            'pix_qr_code_base64' => $qrCodeBase64 ? 'data:image/png;base64,' . $qrCodeBase64 : null,
                        ]);
                        return;
                    }
                } else {
                    \Illuminate\Support\Facades\Log::warning('Aviso Mercado Pago PIX: ' . $response->body());
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Erro ao comunicar com Mercado Pago: ' . $e->getMessage());
            }
        }

        // Fallback: gera código PIX EMVCo oficial com os dados cadastrados na loja
        $brCode = $this->gerarPixBrCode($pedido);
        $pedido->update([
            'pix_copia_e_cola' => $brCode,
        ]);
    }

    /**
     * Identifica o payment_method_id do Mercado Pago a partir do número do cartão.
     */
    private function identificarPaymentMethodMp(string $numeroLimpo): string
    {
        if (preg_match('/^(636368|438935|504175|451416|636297|5067|4576|4011)/', $numeroLimpo)) {
            return 'elo';
        }
        if (preg_match('/^(34|37)/', $numeroLimpo)) {
            return 'amex';
        }
        if (preg_match('/^(606282|3841)/', $numeroLimpo)) {
            return 'hipercard';
        }
        if (preg_match('/^(5[1-5]|2[2-7])/', $numeroLimpo)) {
            return 'master';
        }

        return 'visa';
    }

    /**
     * Traduz códigos de erro do Mercado Pago para mensagens claras e amigáveis em português.
     */
    private function traduzirErroMercadoPago(?string $statusDetail, ?string $rawMessage): string
    {
        $map = [
            'cc_rejected_bad_filled_card_number'   => 'Número do cartão inválido.',
            'cc_rejected_bad_filled_date'          => 'Data de validade do cartão incorreta.',
            'cc_rejected_bad_filled_security_code' => 'Código de segurança (CVV) inválido. Verifique os 3 dígitos no verso do cartão.',
            'cc_rejected_bad_filled_other'         => 'Dados do cartão incorretos. Revise as informações digitadas.',
            'cc_rejected_insufficient_amount'      => 'Saldo ou limite insuficiente no cartão.',
            'cc_rejected_call_for_authorize'       => 'O banco solicitou autorização prévia. Autorize compras na internet no aplicativo do seu banco ou entre em contato com ele.',
            'cc_rejected_card_type_not_allowed'    => 'Este tipo de cartão não é aceito para compras online. Para débito de conta poupança/corrente, utilize pagamento via PIX ou a função Crédito.',
            'cc_rejected_high_risk'                => 'A transação não foi aprovada pelas políticas de segurança do banco emissor.',
            'cc_rejected_duplicated_payment'       => 'Um pagamento com mesmo valor e dados já foi processado recentemente.',
        ];

        if ($statusDetail && isset($map[$statusDetail])) {
            return $map[$statusDetail];
        }

        if ($statusDetail === 'cc_rejected_high_risk') {
            return 'Transação não autorizada pelas políticas de segurança antifraude do emissor. Lembre-se: o Mercado Pago proíbe o uso de cartões da mesma conta/CPF que recebe os pagamentos da loja. Para compras com saldo próprio, utilize o PIX.';
        }

        if ($rawMessage && (str_contains(strtolower($rawMessage), 'invalid transaction_amount') || str_contains(strtolower($rawMessage), 'amount'))) {
            return 'O valor mínimo para pagamentos com cartão no Mercado Pago é de R$ 1,00. Ajuste o valor da compra ou utilize o PIX.';
        }

        if ($rawMessage && (str_contains($rawMessage, 'collector') || str_contains(strtolower($rawMessage), 'same payer') || str_contains(strtolower($rawMessage), 'self'))) {
            return 'Você não pode utilizar um cartão da mesma conta Mercado Pago que recebe as vendas (regra antifraude de autopagamento). Utilize um cartão de outro banco/CPF ou realize os testes no Modo Simulação no painel Admin.';
        }

        if ($rawMessage === 'not_result_by_params') {
            return 'Método de pagamento não autorizado para este cartão pelo emissor. Se estiver usando cartão de débito físico/poupança, utilize o PIX (aprovação imediata) ou pague na função Crédito à vista.';
        }

        return $rawMessage
            ? "A operadora não aprovou a transação ({$rawMessage}). Verifique os dados ou utilize o PIX."
            : 'A operadora recusou o pagamento. Verifique se o cartão está liberado para compras online ou tente via PIX.';
    }

    /**
     * Processa pagamento via Cartão de Crédito ou Débito (Mercado Pago API /v1/card_tokens + /v1/payments ou Modo Simulação).
     */
    private function processarPagamentoCartao(Pedido $pedido, array $dadosCartao, $user): array
    {
        $modo = Configuracao::where('chave', 'cartao_gateway_modo')->value('valor') ?: 'mercadopago';
        $mpToken = Configuracao::where('chave', 'mercadopago_access_token')->value('valor')
            ?: env('MERCADOPAGO_ACCESS_TOKEN');
        $mpPublicKey = Configuracao::where('chave', 'mercadopago_public_key')->value('valor')
            ?: env('MERCADOPAGO_PUBLIC_KEY');

        $numeroLimpo = preg_replace('/\D/', '', $dadosCartao['numero'] ?? '');
        $cvvLimpo = preg_replace('/\D/', '', $dadosCartao['cvv'] ?? '');
        $valLimpa = preg_replace('/\D/', '', $dadosCartao['validade'] ?? '');
        $cpfLimpo = preg_replace('/\D/', '', ($dadosCartao['cpf'] ?? '') ?: ($user->cpf ?? ''));
        $titular = trim($dadosCartao['titular'] ?? $user->name ?? 'CLIENTE SALV SACRA');
        $tipo = ($dadosCartao['tipo'] ?? 'credito') === 'debito' ? 'debito' : 'credito';
        $parcelas = $tipo === 'debito' ? 1 : max(1, (int) ($dadosCartao['parcelas'] ?? 1));

        // No Mercado Pago, cada parcela exige no mínimo R$ 5,00. Se o valor total for pequeno (ex: R$ 1,00), ajusta para 1x à vista.
        if ($parcelas > 1 && ((float) $pedido->valor_total / $parcelas) < 5.00) {
            $parcelas = max(1, (int) floor((float) $pedido->valor_total / 5.00));
        }

        // Modo padrão: Produção Real via API do Mercado Pago
        if ($modo === 'mercadopago' && ! empty($mpToken)) {
            if ((float) $pedido->valor_total < 1.00) {
                return [
                    'aprovado' => false,
                    'mensagem' => 'O valor mínimo para processamento com Cartão de Crédito é de R$ 1,00. Para valores menores, selecione a opção PIX.',
                ];
            }

            if (strlen($numeroLimpo) < 13 || str_contains($dadosCartao['numero'] ?? '', '*')) {
                return [
                    'aprovado' => false,
                    'mensagem' => 'Para processar o pagamento real, selecione "+ Usar outro cartão" e informe a numeração completa do cartão.',
                ];
            }

            if (strlen($valLimpa) < 4) {
                return [
                    'aprovado' => false,
                    'mensagem' => 'Informe a data de validade completa do cartão (MM/AA).',
                ];
            }

            try {
                $mesVal = (int) substr($valLimpa, 0, 2);
                $anoVal = (int) substr($valLimpa, 2);
                if ($anoVal < 100) {
                    $anoVal += 2000;
                }

                $urlToken = 'https://api.mercadopago.com/v1/card_tokens';
                if (! empty($mpPublicKey)) {
                    $urlToken .= '?public_key=' . urlencode(trim($mpPublicKey));
                }

                $payloadToken = [
                    'card_number'      => $numeroLimpo,
                    'expiration_month' => $mesVal,
                    'expiration_year'  => $anoVal,
                    'security_code'    => $cvvLimpo,
                    'cardholder'       => [
                        'name' => $titular,
                    ],
                ];

                if (strlen($cpfLimpo) === 11) {
                    $payloadToken['cardholder']['identification'] = [
                        'type'   => 'CPF',
                        'number' => $cpfLimpo,
                    ];
                }

                $respToken = Http::withoutVerifying()
                    ->withHeaders([
                        'Authorization' => 'Bearer ' . trim($mpToken),
                        'Content-Type'  => 'application/json',
                    ])->timeout(10)->post($urlToken, $payloadToken);

                if (! $respToken->successful() || ! $respToken->json('id')) {
                    \Illuminate\Support\Facades\Log::warning('Aviso Tokenização Cartão MP: ' . $respToken->body());
                    return [
                        'aprovado' => false,
                        'mensagem' => 'Não foi possível validar os dados do cartão no Mercado Pago. Verifique o número do cartão, validade, CVV e CPF do titular.',
                    ];
                }

                $cardTokenId = $respToken->json('id');
                $partesNome = explode(' ', trim($user->name ?: $titular), 2);
                $primeiroNome = $partesNome[0] ?? 'Cliente';
                $sobrenome = $partesNome[1] ?? 'Salv Sacra';

                $payloadMp = [
                    'transaction_amount' => round((float) $pedido->valor_total, 2),
                    'token'              => $cardTokenId,
                    'description'        => "Pedido #{$pedido->id} - Salv Sacra",
                    'installments'       => $parcelas,
                    'payment_method_id'  => $this->identificarPaymentMethodMp($numeroLimpo),
                    'external_reference' => (string) $pedido->id,
                    'payer'              => [
                        'email'      => $pedido->email_contato ?: $user->email,
                        'first_name' => $primeiroNome,
                        'last_name'  => $sobrenome,
                    ],
                ];

                if (strlen($cpfLimpo) === 11) {
                    $payloadMp['payer']['identification'] = [
                        'type'   => 'CPF',
                        'number' => $cpfLimpo,
                    ];
                }

                $respPay = Http::withoutVerifying()
                    ->withHeaders([
                        'Authorization'     => 'Bearer ' . trim($mpToken),
                        'X-Idempotency-Key' => 'pedido-card-' . $pedido->id . '-' . Str::uuid(),
                        'Content-Type'      => 'application/json',
                    ])->timeout(12)->post('https://api.mercadopago.com/v1/payments', $payloadMp);

                if ($respPay->successful()) {
                    $dadosPay = $respPay->json();
                    $statusMp = $dadosPay['status'] ?? '';

                    if ($statusMp === 'rejected' || $statusMp === 'cancelled') {
                        return [
                            'aprovado' => false,
                            'mensagem' => $this->traduzirErroMercadoPago($dadosPay['status_detail'] ?? null, $dadosPay['message'] ?? null),
                        ];
                    }

                    $pedido->update([
                        'pagamento_id' => (string) ($dadosPay['id'] ?? ''),
                        'status'       => $statusMp === 'in_process' ? 'Pendente' : 'Pago',
                    ]);

                    return ['aprovado' => true];
                }

                \Illuminate\Support\Facades\Log::warning('Aviso Mercado Pago Cartão: ' . $respPay->body());
                return [
                    'aprovado' => false,
                    'mensagem' => $this->traduzirErroMercadoPago(null, $respPay->json('message') ?: null),
                ];
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Erro ao processar cartão no Mercado Pago: ' . $e->getMessage());
                return [
                    'aprovado' => false,
                    'mensagem' => 'Erro de comunicação com o Mercado Pago ao processar o cartão. Tente novamente.',
                ];
            }
        }

        // Modo Simulação / Sandbox (quando selecionado manualmente pelo Admin)
        $pedido->update([
            'pagamento_id' => 'CARD-' . strtoupper(Str::random(10)),
            'status'       => 'Pago',
        ]);

        return ['aprovado' => true];
    }
    /**
     * Criar um novo pedido com seus itens.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email_contato'      => ['required', 'email'],
            'telefone'           => ['nullable', 'string', 'max:30'],
            'cpf'                => ['nullable', 'string', 'max:20'],
            'cep'                => ['required', 'string', 'max:20'],
            'logradouro'         => ['required', 'string', 'max:255'],
            'numero'             => ['required', 'string', 'max:50'],
            'complemento'        => ['nullable', 'string', 'max:255'],
            'bairro'             => ['required', 'string', 'max:150'],
            'cidade'             => ['required', 'string', 'max:150'],
            'estado'             => ['required', 'string', 'max:2'],
            'tipo_frete'         => ['nullable', 'string', 'max:100'],
            'valor_frete'        => ['required', 'numeric', 'min:0'],
            'metodo_pagamento'   => ['required', 'in:cartao,pix,cartao_credito,cartao_debito'],
            'observacoes'        => ['nullable', 'string'],
            'cupom_codigo'       => ['nullable', 'string', 'max:50'],
            'cartao_dados'       => ['nullable', 'array'],
            'salvar_cartao'      => ['nullable', 'boolean'],
            'itens'              => ['required', 'array', 'min:1'],
            'itens.*.variacao_id'=> ['nullable', 'integer', 'exists:variacaos,id'],
            'itens.*.produto_id' => ['required', 'integer', 'exists:produtos,id'],
            'itens.*.quantidade' => ['required', 'integer', 'min:1'],
            'itens.*.preco'      => ['required', 'numeric', 'min:0'],
        ]);

        // A rota exige auth:sanctum, então sempre há um usuário logado
        $user = $request->user();
        $userId = $user->id;

        // 1. Cancela automaticamente pedidos pendentes que já expiraram (mais de 30 minutos)
        $this->cancelarPedidosPendentesExpirados($userId);

        // 2. Verifica se o cliente ainda possui um pedido pendente em aberto (dentro do prazo de 30 min)
        $pedidoPendenteAtivo = Pedido::where('user_id', $userId)
            ->where('status', 'Pendente')
            ->latest('id')
            ->first();

        if ($pedidoPendenteAtivo) {
            return response()->json([
                'message'            => "Você já possui um pedido pendente em aberto (Pedido #{$pedidoPendenteAtivo->id}). Conclua o pagamento ou cancele-o na aba 'Meus Pedidos' antes de iniciar outra compra.",
                'pedido_pendente_id' => $pedidoPendenteAtivo->id,
            ], 422);
        }

        // Salva/atualiza o CPF no cadastro do cliente para futuras compras e envios
        if (! empty($validated['cpf'])) {
            $cpfLimpo = preg_replace('/\D/', '', $validated['cpf']);
            if ($this->validarCpf($cpfLimpo)) {
                try {
                    $user->update(['cpf' => $cpfLimpo]);
                } catch (\Throwable $e) {
                    \Log::warning('Erro ao salvar CPF do usuário no pedido: ' . $e->getMessage());
                }
            }
        }

        $pedido = DB::transaction(function () use ($validated, $userId) {
            $subtotal = collect($validated['itens'])->sum(function ($item) {
                return $item['preco'] * $item['quantidade'];
            });

            $valorTotal = $subtotal + $validated['valor_frete'];

            // Cupom de desconto (recalculado no servidor para evitar fraude)
            $cupomCodigo = null;
            $descontoCupom = 0.0;
            if (! empty($validated['cupom_codigo'])) {
                $cupom = \App\Models\Cupom::where('codigo', strtoupper(trim($validated['cupom_codigo'])))
                    ->where('ativo', true)->first();
                if ($cupom) {
                    $descontoCupom = $cupom->calcularDesconto($validated['itens'], (float) $validated['valor_frete']);
                    if ($descontoCupom > 0) {
                        $cupomCodigo = $cupom->codigo;
                        $valorTotal = max(0, $valorTotal - $descontoCupom);
                    }
                }
            }

            $ehCartao = in_array($validated['metodo_pagamento'], ['cartao', 'cartao_credito', 'cartao_debito'], true);
            $statusInicial = $ehCartao ? 'Pago' : 'Pendente';

            $pedido = Pedido::create([
                'user_id'          => $userId,
                'email_contato'    => $validated['email_contato'],
                'telefone'         => $validated['telefone'],
                'data_pedido'      => now(),
                'status'           => $statusInicial,
                'metodo_pagamento' => $validated['metodo_pagamento'],
                'tipo_frete'       => $validated['tipo_frete'] ?? 'SEDEX',
                'observacoes'      => $validated['observacoes'],
                'cep'              => $validated['cep'],
                'logradouro'       => $validated['logradouro'],
                'numero'           => $validated['numero'],
                'complemento'      => $validated['complemento'],
                'bairro'           => $validated['bairro'],
                'cidade'           => $validated['cidade'],
                'estado'           => strtoupper($validated['estado']),
                'valor_frete'      => $validated['valor_frete'],
                'valor_total'      => $valorTotal,
                'cupom_codigo'     => $cupomCodigo,
                'valor_desconto_cupom' => $descontoCupom,
            ]);

            foreach ($validated['itens'] as $item) {
                $variacaoId = $item['variacao_id'] ?? null;

                if (!$variacaoId) {
                    // Busca ou cria uma variação padrão para vincular
                    $variacao = Variacao::where('produto_id', $item['produto_id'])->first();
                    if (!$variacao) {
                        $variacao = Variacao::create([
                            'produto_id' => $item['produto_id'],
                            'tamanho'    => 'M',
                            'cor'        => 'Padrão',
                            'estoque'    => 10,
                        ]);
                    }
                    $variacaoId = $variacao->id;
                } else {
                    $variacao = Variacao::with('produto')->lockForUpdate()->find($variacaoId);
                }

                if (!$variacao) {
                    abort(422, "A variação selecionada para o produto #{$item['produto_id']} não foi encontrada.");
                }

                $qtdSolicitada = (int) $item['quantidade'];
                if ($variacao->estoque < $qtdSolicitada) {
                    $prodNome = $variacao->produto?->nome ?? 'Produto';
                    $detalhes = trim(($variacao->tamanho ?? '') . ' / ' . ($variacao->cor ?? ''), ' /');
                    abort(422, "Estoque insuficiente para \"{$prodNome}\" ({$detalhes}). Restam apenas {$variacao->estoque} unidade(s) disponível(is). Por favor, ajuste a quantidade no seu carrinho.");
                }

                // Dá baixa automática imediata no estoque do produto
                $variacao->decrement('estoque', $qtdSolicitada);

                ItemPedido::create([
                    'pedido_id'            => $pedido->id,
                    'variacao_produto_id'  => $variacaoId,
                    'quantidade'           => $qtdSolicitada,
                    'preco_unitario'       => $item['preco'],
                ]);
            }

            return $pedido;
        });

        // Sincroniza notificações de estoque baixo para o admin caso algum item tenha ficado crítico (<= 3)
        \App\Services\NotificacaoService::sincronizarEstoqueBaixo();

        // Se o pagamento for PIX, gera cobrança via Mercado Pago (ou BRCode oficial EMVCo)
        if ($pedido->metodo_pagamento === 'pix') {
            $this->processarPagamentoPix($pedido, $request->user());
            $pedido->refresh();
        } elseif (in_array($pedido->metodo_pagamento, ['cartao', 'cartao_credito', 'cartao_debito'], true)) {
            $dadosCartao = $request->input('cartao_dados', []);
            if (is_array($dadosCartao) && ! empty($dadosCartao)) {
                $resultadoCartao = $this->processarPagamentoCartao($pedido, $dadosCartao, $request->user());
                if (empty($resultadoCartao['aprovado'])) {
                    $this->restaurarEstoquePedido($pedido);
                    $pedido->delete();
                    return response()->json([
                        'message' => $resultadoCartao['mensagem'] ?? 'Pagamento recusado pela operadora do cartão.',
                    ], 422);
                }

                // Salva novo cartão na conta do cliente se solicitado
                if ($request->boolean('salvar_cartao') && ! empty($dadosCartao['numero'])) {
                    $numLimpo = preg_replace('/\D/', '', $dadosCartao['numero']);
                    if (strlen($numLimpo) >= 13 && ! str_contains($dadosCartao['numero'], '*')) {
                        $ultimos = substr($numLimpo, -4);
                        $tipoSalvar = 'credito';
                        $jaExiste = $request->user()->cartoes()
                            ->where('ultimos_digitos', $ultimos)
                            ->where('tipo', $tipoSalvar)
                            ->exists();

                        if (! $jaExiste) {
                            $request->user()->cartoes()->create([
                                'tipo'            => $tipoSalvar,
                                'titular'         => mb_strtoupper(trim($dadosCartao['titular'] ?? $request->user()->name)),
                                'numero'          => $numLimpo,
                                'ultimos_digitos' => $ultimos,
                                'bandeira'        => $dadosCartao['bandeira'] ?? 'Cartão',
                                'validade'        => $dadosCartao['validade'] ?? '12/30',
                            ]);
                        }
                    }
                }
            }
            $pedido->refresh();
        }

        // Salva dados de contato (telefone, CPF) e endereço na conta do cliente se autorizado
        if ($request->boolean('salvar_dados') || $request->boolean('salvar_cartao')) {
            $user = $request->user();
            $dadosAtualizar = [];
            if (! empty($pedido->telefone) && (empty($user->telefone) || $user->telefone !== $pedido->telefone)) {
                $dadosAtualizar['telefone'] = $pedido->telefone;
            }
            if (! empty($pedido->cpf) && (empty($user->cpf) || $user->cpf !== $pedido->cpf)) {
                $dadosAtualizar['cpf'] = $pedido->cpf;
            }
            if (! empty($dadosAtualizar)) {
                $user->update($dadosAtualizar);
            }

            // Salva endereço se informado e ainda não existente
            if (! empty($pedido->cep) && ! empty($pedido->logradouro) && ! empty($pedido->numero)) {
                $jaExisteEndereco = $user->enderecos()
                    ->where('cep', $pedido->cep)
                    ->where('numero', $pedido->numero)
                    ->exists();

                if (! $jaExisteEndereco) {
                    $user->enderecos()->create([
                        'cep'         => $pedido->cep,
                        'logradouro'  => $pedido->logradouro,
                        'numero'      => $pedido->numero,
                        'complemento' => $pedido->complemento,
                        'bairro'      => $pedido->bairro,
                        'cidade'      => $pedido->cidade,
                        'estado'      => $pedido->estado,
                    ]);
                }
            }
        }

        // Dispara e-mail de confirmação de pedido para o cliente
        try {
            $destinatario = $pedido->email_contato ?: $request->user()->email;
            if ($destinatario) {
                \Illuminate\Support\Facades\Mail::to($destinatario)->send(new \App\Mail\PedidoCriadoMail($pedido->load(['itens.variacao.produto', 'user'])));
            }
        } catch (\Throwable $e) {
            \Log::error('Erro ao enviar e-mail de pedido criado: ' . $e->getMessage());
        }

        // Dispara e-mail de notificação de novo pedido para o administrador apenas quando o pedido estiver Pago
        if ($pedido->status === 'Pago') {
            try {
                \Illuminate\Support\Facades\Mail::to('salvsacra2@gmail.com')->send(new \App\Mail\NovoPedidoAdminMail($pedido->load(['itens.variacao.produto', 'user'])));
            } catch (\Throwable $e) {
                \Log::error('Erro ao enviar e-mail de novo pedido para o admin: ' . $e->getMessage());
            }
        }

        // Notificação para o Administrador e Cliente
        \App\Services\NotificacaoService::notificarAdmin(
            'pedido',
            "Novo Pedido #{$pedido->id} Recebido!",
            "Cliente {$request->user()->name} realizou uma compra no valor de R$ " . number_format($pedido->valor_total, 2, ',', '.') . " (" . strtoupper($pedido->metodo_pagamento ?? 'PIX') . "). Status: {$pedido->status}.",
            "/admin/pedidos",
            $pedido->id
        );

        \App\Services\NotificacaoService::notificarCliente(
            $request->user()->id,
            'pedido',
            "Pedido #{$pedido->id} Realizado!",
            "Seu pedido no valor de R$ " . number_format($pedido->valor_total, 2, ',', '.') . " foi registrado com sucesso. Acompanhe os detalhes e o envio.",
            "/minha-conta?aba=pedidos&pedido={$pedido->id}",
            $pedido->id
        );

        return response()->json([
            'mensagem' => 'Pedido criado com sucesso!',
            'pedido'   => $pedido->load(['itens.variacao.produto']),
            'user'     => $request->user()->fresh(),
        ], 201);
    }

    /**
     * Cancela o pagamento pendente no Mercado Pago (invalida imediatamente o QR Code PIX e o link de pagamento).
     */
    private function cancelarPagamentoMercadoPago(Pedido $pedido): void
    {
        if (empty($pedido->pagamento_id) || str_starts_with((string) $pedido->pagamento_id, 'SIM-')) {
            return;
        }

        $mpToken = Configuracao::where('chave', 'mercadopago_access_token')->value('valor')
            ?: env('MERCADOPAGO_ACCESS_TOKEN');

        if (empty($mpToken)) {
            return;
        }

        try {
            Http::withoutVerifying()
                ->withHeaders([
                    'Authorization' => 'Bearer ' . trim($mpToken),
                    'Content-Type'  => 'application/json',
                ])
                ->timeout(3)
                ->put("https://api.mercadopago.com/v1/payments/{$pedido->pagamento_id}", [
                    'status' => 'cancelled',
                ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Erro ao cancelar cobrança no Mercado Pago #{$pedido->pagamento_id}: " . $e->getMessage());
        }
    }

    /**
     * Cancela automaticamente pedidos com status 'Pendente' que já ultrapassaram 30 minutos
     * desde a geração (tempo oficial de expiração do QR Code PIX), restaurando o estoque de forma instantânea.
     */
    public function cancelarPedidosPendentesExpirados(?int $userId = null): void
    {
        $limite = now()->subMinutes(30);

        $query = Pedido::where('status', 'Pendente')
            ->where(function ($q) use ($limite) {
                $q->where('data_pedido', '<=', $limite)
                  ->orWhere('created_at', '<=', $limite);
            });

        if ($userId) {
            $query->where('user_id', $userId);
        }

        $expirados = $query->with('itens.variacao')->get();

        foreach ($expirados as $pedido) {
            try {
                // Se tiver cobrança real no Mercado Pago, verifica antes se não foi paga nos últimos instantes
                if (! empty($pedido->pagamento_id) && ! str_starts_with((string) $pedido->pagamento_id, 'SIM-')) {
                    $mpToken = Configuracao::where('chave', 'mercadopago_access_token')->value('valor')
                        ?: env('MERCADOPAGO_ACCESS_TOKEN');
                    if (! empty($mpToken)) {
                        try {
                            $resp = Http::withoutVerifying()
                                ->withHeaders(['Authorization' => 'Bearer ' . trim($mpToken)])
                                ->timeout(2)->get("https://api.mercadopago.com/v1/payments/{$pedido->pagamento_id}");
                            if ($resp->successful() && $resp->json('status') === 'approved') {
                                $pedido->update(['status' => 'Pago']);
                                continue;
                            }
                        } catch (\Throwable $e) {}
                    }
                }

                $this->restaurarEstoquePedido($pedido);
                $pedido->update(['status' => 'Cancelado']);
                $this->cancelarPagamentoMercadoPago($pedido);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Erro ao expirar pedido pendente #{$pedido->id}: " . $e->getMessage());
            }
        }
    }

    /**
     * Consultar pedido por ID (e sincroniza status na API do Mercado Pago caso esteja Pendente).
     */
    public function show(Request $request, Pedido $pedido): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->papel === 'admin' || $pedido->user_id === $user->id, 403, 'Acesso negado.');

        // Sincroniza com o Mercado Pago caso haja pagamento_id real
        if (! empty($pedido->pagamento_id) && ! str_starts_with((string) $pedido->pagamento_id, 'SIM-')) {
            $mpToken = Configuracao::where('chave', 'mercadopago_access_token')->value('valor')
                ?: env('MERCADOPAGO_ACCESS_TOKEN');

            if (! empty($mpToken)) {
                try {
                    $resp = Http::withoutVerifying()
                        ->withHeaders([
                            'Authorization' => 'Bearer ' . trim($mpToken),
                        ])->timeout(2)->get("https://api.mercadopago.com/v1/payments/{$pedido->pagamento_id}");

                    if ($resp->successful() && ($resp->json('status') === 'approved')) {
                        if ($pedido->status !== 'Pago') {
                            // Se estava cancelado, re-decrementa o estoque pois o pagamento foi efetuado
                            if ($pedido->status === 'Cancelado') {
                                foreach ($pedido->itens as $item) {
                                    if ($item->variacao) {
                                        $item->variacao->decrement('estoque', (int) $item->quantidade);
                                    }
                                }
                            }
                            $pedido->update(['status' => 'Pago']);
                        }
                        return response()->json($pedido->fresh()->load(['itens.variacao.produto', 'user']));
                    }
                } catch (\Throwable $e) {
                    // Silencioso no polling
                }
            }
        }

        // Se o pedido for Pendente e já passou de 30 minutos (e não foi pago), cancela e invalida no MP
        if ($pedido->status === 'Pendente') {
            $dataBase = $pedido->data_pedido ?? $pedido->created_at;
            if ($dataBase && \Carbon\Carbon::parse($dataBase)->addMinutes(30)->isPast()) {
                $this->restaurarEstoquePedido($pedido);
                $pedido->update(['status' => 'Cancelado']);
                $this->cancelarPagamentoMercadoPago($pedido);
                return response()->json($pedido->fresh()->load(['itens.variacao.produto', 'user']));
            }
        }

        return response()->json($pedido->load(['itens.variacao.produto', 'user']));
    }

    /**
     * Confirmar pagamento do pedido (modo simulação/sandbox ou verificação direta no gateway).
     */
    public function confirmarPagamento(Request $request, Pedido $pedido): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->papel === 'admin' || $pedido->user_id === $user->id, 403, 'Acesso negado.');

        if ($pedido->status === 'Pendente') {
            $pedido->update(['status' => 'Pago']);

            try {
                $destinatario = $pedido->email_contato ?: $pedido->user?->email;
                if ($destinatario) {
                    \Illuminate\Support\Facades\Mail::to($destinatario)->send(new \App\Mail\StatusPedidoMail($pedido->load('user')));
                }
                \Illuminate\Support\Facades\Mail::to('salvsacra2@gmail.com')->send(new \App\Mail\NovoPedidoAdminMail($pedido->load(['itens.variacao.produto', 'user'])));
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Erro ao enviar e-mail de pagamento confirmado: ' . $e->getMessage());
            }

            if ($pedido->user_id) {
                \App\Services\NotificacaoService::notificarCliente(
                    $pedido->user_id,
                    'pedido',
                    "Pagamento Confirmado! · Pedido #{$pedido->id}",
                    "Seu pagamento no valor de R$ " . number_format($pedido->valor_total, 2, ',', '.') . " foi confirmado com sucesso! Suas peças já estão em preparação para envio.",
                    "/minha-conta?aba=pedidos&pedido={$pedido->id}",
                    $pedido->id
                );
            }
        }

        return response()->json([
            'mensagem' => 'Pagamento confirmado com sucesso!',
            'pedido'   => $pedido->load(['itens.variacao.produto', 'user']),
        ]);
    }

    /**
     * Restaura a quantidade dos itens de um pedido de volta ao estoque de cada variação.
     */
    private function restaurarEstoquePedido(Pedido $pedido): void
    {
        $pedido->loadMissing('itens.variacao');
        foreach ($pedido->itens as $item) {
            if ($item->variacao) {
                $item->variacao->increment('estoque', (int) $item->quantidade);
            }
        }
    }

    /**
     * Solicita o estorno integral (refund) do pagamento no Mercado Pago quando o pedido já estava Pago.
     */
    public function estornarPagamentoMercadoPago(Pedido $pedido): array
    {
        if (empty($pedido->pagamento_id)) {
            return ['sucesso' => false, 'mensagem' => 'Pedido sem ID de pagamento externo.'];
        }

        // Em modo simulado (prefixo SIM-), confirma estorno simulado
        if (str_starts_with((string) $pedido->pagamento_id, 'SIM-')) {
            return [
                'sucesso'  => true,
                'mensagem' => 'Estorno processado automaticamente (modo simulação).',
            ];
        }

        $mpToken = Configuracao::where('chave', 'mercadopago_access_token')->value('valor')
            ?: env('MERCADOPAGO_ACCESS_TOKEN');

        if (empty($mpToken)) {
            return ['sucesso' => false, 'mensagem' => 'Token do Mercado Pago não configurado para estorno automático.'];
        }

        try {
            $resp = Http::withoutVerifying()
                ->withHeaders([
                    'Authorization'     => 'Bearer ' . trim($mpToken),
                    'Content-Type'      => 'application/json',
                    'X-Idempotency-Key' => 'refund-pedido-' . $pedido->id . '-' . uniqid(),
                ])
                ->timeout(4)
                ->post("https://api.mercadopago.com/v1/payments/{$pedido->pagamento_id}/refunds");

            if ($resp->successful()) {
                return [
                    'sucesso'  => true,
                    'mensagem' => $pedido->metodo_pagamento === 'pix'
                        ? 'O estorno via PIX foi realizado automaticamente e o valor já foi devolvido para a sua conta bancária.'
                        : 'O estorno no cartão foi processado automaticamente junto à operadora.',
                ];
            }

            Log::warning("Aviso ao estornar pagamento MP #{$pedido->pagamento_id}: " . $resp->body());
            return [
                'sucesso'  => false,
                'mensagem' => 'O pedido foi cancelado e o reembolso foi encaminhado para processamento financeiro.',
            ];
        } catch (\Throwable $e) {
            Log::error("Erro ao estornar pagamento MP #{$pedido->pagamento_id}: " . $e->getMessage());
            return [
                'sucesso'  => false,
                'mensagem' => 'O pedido foi cancelado e o reembolso será processado pela equipe financeira.',
            ];
        }
    }

    /**
     * Permite ao próprio cliente cancelar um pedido enquanto estiver Pendente, Pago ou Em separação.
     */
    public function cancelarPeloCliente(Request $request, Pedido $pedido): JsonResponse
    {
        $user = $request->user();
        abort_unless($pedido->user_id === $user->id, 403, 'Você não tem permissão para cancelar este pedido.');

        $statusPermitidos = ['Pendente', 'Pago', 'Em separação', 'Em montagem'];
        if (! in_array($pedido->status, $statusPermitidos, true)) {
            return response()->json([
                'message' => "Não é possível cancelar diretamente um pedido com status '{$pedido->status}'. Caso o pacote já tenha sido enviado, utilize a opção de Solicitar Devolução.",
            ], 422);
        }

        $estavaPago = in_array($pedido->status, ['Pago', 'Em separação', 'Em montagem'], true);
        $infoEstorno = null;

        DB::transaction(function () use ($pedido, $estavaPago, &$infoEstorno) {
            // 1. Devolve as unidades ao estoque das variações
            $this->restaurarEstoquePedido($pedido);

            // 2. Se já estava PAGO, aciona o estorno no Mercado Pago
            if ($estavaPago) {
                $infoEstorno = $this->estornarPagamentoMercadoPago($pedido);
            } else {
                // Se NÃO estava pago, cancela a cobrança no Mercado Pago (invalida imediatamente o QR Code e link)
                $this->cancelarPagamentoMercadoPago($pedido);
            }

            // 3. Atualiza status para Cancelado
            $pedido->update(['status' => 'Cancelado']);
        });

        // 4. Se o pedido estava PAGO, avisa cliente e admin por e-mail (em pedidos não pagos não trava a resposta com SMTP)
        if ($estavaPago) {
            try {
                $destinatario = $pedido->email_contato ?: $pedido->user?->email;
                if ($destinatario) {
                    \Illuminate\Support\Facades\Mail::to($destinatario)->send(new \App\Mail\StatusPedidoMail($pedido->load('user')));
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Erro ao enviar e-mail de cancelamento do pedido: ' . $e->getMessage());
            }

            try {
                \Illuminate\Support\Facades\Mail::to('salvsacra2@gmail.com')->send(new \App\Mail\PedidoCanceladoAdminMail($pedido->load(['itens.variacao.produto', 'user'])));
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Erro ao enviar e-mail de cancelamento para o admin: ' . $e->getMessage());
            }
        }

        $msgRetorno = "Pedido #{$pedido->id} cancelado com sucesso.";
        if ($estavaPago && ! empty($infoEstorno['mensagem'])) {
            $msgRetorno .= ' ' . $infoEstorno['mensagem'];
        }

        return response()->json([
            'mensagem' => $msgRetorno,
            'estorno'  => $infoEstorno,
            'pedido'   => $pedido->fresh()->load(['itens.variacao.produto', 'user']),
        ]);
    }

    /**
     * Webhook público para notificações automáticas do Mercado Pago.
     */
    public function webhookMercadoPago(Request $request): JsonResponse
    {
        $paymentId = $request->input('data.id') ?? $request->input('id');
        if ($paymentId) {
            $pedido = Pedido::where('pagamento_id', (string) $paymentId)->first();
            $mpToken = Configuracao::where('chave', 'mercadopago_access_token')->value('valor')
                ?: env('MERCADOPAGO_ACCESS_TOKEN');

            if ($pedido && ! empty($mpToken)) {
                try {
                    $resp = Http::withoutVerifying()
                        ->withHeaders([
                            'Authorization' => 'Bearer ' . trim($mpToken),
                        ])->timeout(10)->get("https://api.mercadopago.com/v1/payments/{$paymentId}");

                    if ($resp->successful() && ($resp->json('status') === 'approved')) {
                        if ($pedido->status !== 'Pago') {
                            if ($pedido->status === 'Cancelado') {
                                foreach ($pedido->itens as $item) {
                                    if ($item->variacao) {
                                        $item->variacao->decrement('estoque', (int) $item->quantidade);
                                    }
                                }
                            }
                            $pedido->update(['status' => 'Pago']);
                            $destinatario = $pedido->email_contato ?: $pedido->user?->email;
                            if ($destinatario) {
                                \Illuminate\Support\Facades\Mail::to($destinatario)->send(new \App\Mail\StatusPedidoMail($pedido->load('user')));
                            }
                            try {
                                \Illuminate\Support\Facades\Mail::to('salvsacra2@gmail.com')->send(new \App\Mail\NovoPedidoAdminMail($pedido->load(['itens.variacao.produto', 'user'])));
                            } catch (\Throwable $e) {
                                \Illuminate\Support\Facades\Log::error('Erro ao enviar e-mail de novo pedido pago para o admin via webhook: ' . $e->getMessage());
                            }
                        }
                    }
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::error('Erro no webhook Mercado Pago: ' . $e->getMessage());
                }
            }
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * Listar todos os pedidos com filtros (apenas Admin).
     */
    public function indexAdmin(Request $request): JsonResponse
    {
        $this->cancelarPedidosPendentesExpirados();

        $query = Pedido::with(['user', 'itens.variacao.produto', 'devolucao'])->latest('data_pedido');

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('busca')) {
            $termo = '%' . $request->query('busca') . '%';
            $query->where(function ($q) use ($termo) {
                $q->where('id', 'like', $termo)
                  ->orWhere('email_contato', 'like', $termo)
                  ->orWhereHas('user', function ($qu) use ($termo) {
                      $qu->where('name', 'like', $termo)
                         ->orWhere('email', 'like', $termo);
                  });
            });
        }

        return response()->json($query->paginate(20));
    }

    /**
     * Atualizar status e/ou código de rastreio do pedido (apenas Admin).
     */
    public function updateStatus(Request $request, Pedido $pedido): JsonResponse
    {
        $validated = $request->validate([
            'status'          => ['nullable', 'string', 'in:Pendente,Pago,Em separação,Em montagem,Enviado,Em transporte,Entregue,Cancelado'],
            'codigo_rastreio' => ['nullable', 'string', 'max:100'],
        ]);

        $statusAnterior = $pedido->status;
        $novoStatus = $validated['status'] ?? $pedido->status;
        $codigoRastreio = array_key_exists('codigo_rastreio', $validated)
            ? trim((string) $validated['codigo_rastreio'])
            : $pedido->codigo_rastreio;

        // Se o Admin alterar o status para Cancelado (e antes não estava Cancelado), devolve o estoque e estorna se já estava pago
        if ($novoStatus === 'Cancelado' && $statusAnterior !== 'Cancelado') {
            $this->restaurarEstoquePedido($pedido);

            // Se o pedido teve devolução concluída com CUPOM (vale-compras), NÃO estorna o pagamento no gateway
            $temCupomTroca = $pedido->devolucoes()->where('tipo_solicitacao', 'cupom')->where('status', 'Concluida')->exists();

            if (! $temCupomTroca && (in_array($statusAnterior, ['Pago', 'Em separação', 'Em montagem', 'Enviado', 'Em transporte', 'Entregue'], true) || ! empty($pedido->pagamento_id))) {
                $this->estornarPagamentoMercadoPago($pedido);
            }
            try {
                \Illuminate\Support\Facades\Mail::to('salvsacra2@gmail.com')->send(new \App\Mail\PedidoCanceladoAdminMail($pedido->load(['itens.variacao.produto', 'user'])));
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Erro ao enviar e-mail de cancelamento para o admin: ' . $e->getMessage());
            }
        }

        $pedido->update([
            'status'          => $novoStatus,
            'codigo_rastreio' => $codigoRastreio ?: null,
        ]);

        // Notifica o cliente por e-mail e na loja quando o status muda ou quando um código de rastreio é salvo
        if ($novoStatus !== $statusAnterior || (in_array($novoStatus, ['Enviado', 'Em transporte'], true) && ! empty($validated['codigo_rastreio']))) {
            try {
                $destinatario = $pedido->email_contato ?: $pedido->user?->email;
                if ($destinatario) {
                    \Illuminate\Support\Facades\Mail::to($destinatario)->send(new \App\Mail\StatusPedidoMail($pedido->load('user')));
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Erro ao enviar e-mail de status do pedido: ' . $e->getMessage());
            }

            if ($pedido->user_id) {
                $msgStatus = match ($novoStatus) {
                    'Pago' => "Seu pagamento foi confirmado! Suas peças estão sendo preparadas com carinho.",
                    'Em separação' => "Seu pedido entrou em separação e conferência no nosso ateliê.",
                    'Em montagem' => "Suas camisetas estão em processo de montagem e embalagem.",
                    'Enviado' => "Seu pedido foi postado e já está a caminho!" . ($codigoRastreio ? " Código de rastreio: {$codigoRastreio}." : ""),
                    'Em transporte' => "Sua encomenda está em trânsito com os Correios. Acompanhe a entrega!",
                    'Entregue' => "Seu pedido foi entregue com sucesso! Esperamos que ame suas peças.",
                    'Cancelado' => "Seu pedido foi cancelado.",
                    default => "O status do seu pedido mudou para: {$novoStatus}."
                };

                \App\Services\NotificacaoService::notificarCliente(
                    $pedido->user_id,
                    'pedido',
                    "Atualização no Pedido #{$pedido->id}: {$novoStatus}",
                    $msgStatus,
                    "/minha-conta?aba=pedidos&pedido={$pedido->id}",
                    $pedido->id
                );
            }
        }

        return response()->json([
            'mensagem' => 'Dados de envio/status do pedido atualizados com sucesso.',
            'pedido'   => $pedido->load(['itens.variacao.produto', 'user']),
        ]);
    }

    /**
     * Excluir pedido do histórico (apenas se Entregue ou Cancelado).
     * - Cancelado: pode ser excluído a qualquer momento.
     * - Entregue: somente após 7 dias corridos (prazo legal de devolução/troca) e sem devolução ativa.
     */
    public function destroy(Request $request, Pedido $pedido): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->papel === 'admin' || $pedido->user_id === $user->id, 403, 'Acesso negado.');

        if (! in_array($pedido->status, ['Entregue', 'Cancelado'], true)) {
            return response()->json([
                'message' => "Apenas pedidos finalizados ('Entregue' ou 'Cancelado') podem ser excluídos.",
            ], 422);
        }

        // Regra para pedidos Entregues (prazo legal de arrependimento / devolução do CDC)
        if ($pedido->status === 'Entregue') {
            $devolucaoConcluida = $pedido->devolucoes()->where('status', 'Concluida')->exists();

            // Se a devolução já tiver sido concluída, a exclusão é liberada imediatamente para o administrador
            if (! $devolucaoConcluida) {
                // Não exclui se houver devolução em andamento
                $temDevolucaoAtiva = $pedido->devolucoes()->whereIn('status', ['Pendente', 'Aprovada'])->exists();
                if ($temDevolucaoAtiva) {
                    return response()->json([
                        'message' => "Este pedido possui uma solicitação de devolução/troca em andamento e não pode ser excluído.",
                    ], 422);
                }

                $dataBase = $pedido->updated_at ?? $pedido->data_pedido ?? $pedido->created_at;
                $diasDesdeEntrega = Carbon::parse($dataBase)->diffInDays(now());
                if ($diasDesdeEntrega < 7) {
                    $diasFaltando = 7 - $diasDesdeEntrega;
                    return response()->json([
                        'message' => "Pedidos com status 'Entregue' só podem ser excluídos após o prazo legal de 7 dias para devolução/troca (faltam {$diasFaltando} dia(s)).",
                    ], 422);
                }
            }
        }

        $id = $pedido->id;
        $pedido->itens()->delete();
        $pedido->delete();

        return response()->json([
            'mensagem' => "Pedido #{$id} excluído com sucesso.",
        ]);
    }

    /**
     * Exclui em lote todos os pedidos finalizados elegíveis (Apenas Admin).
     * - Cancelados: a qualquer hora.
     * - Entregues: apenas após 7 dias e sem devoluções ativas.
     */
    public function limparFinalizados(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->papel === 'admin', 403, 'Acesso negado.');

        $limite7Dias = now()->subDays(7);

        // 1. Pedidos cancelados
        $cancelados = Pedido::where('status', 'Cancelado')->get();

        // 2. Pedidos entregues há mais de 7 dias ou com devolução já concluída (e sem devoluções ativas)
        $entreguesElegiveis = Pedido::where('status', 'Entregue')
            ->where(function ($q) use ($limite7Dias) {
                $q->where('updated_at', '<=', $limite7Dias)
                  ->orWhere('data_pedido', '<=', $limite7Dias)
                  ->orWhereHas('devolucoes', function ($dq) {
                      $dq->where('status', 'Concluida');
                  });
            })
            ->whereDoesntHave('devolucoes', function ($dq) {
                $dq->whereIn('status', ['Pendente', 'Aprovada']);
            })
            ->get();

        $todosParaExcluir = $cancelados->merge($entreguesElegiveis);
        $totalExcluidos = $todosParaExcluir->count();

        if ($totalExcluidos === 0) {
            return response()->json([
                'message' => 'Nenhum pedido elegível para exclusão no momento (pedidos entregues precisam ter mais de 7 dias de recebimento).',
                'total_excluidos' => 0,
            ]);
        }

        DB::transaction(function () use ($todosParaExcluir) {
            foreach ($todosParaExcluir as $ped) {
                $ped->itens()->delete();
                $ped->delete();
            }
        });

        return response()->json([
            'message' => "Limpeza concluída com sucesso! {$cancelados->count()} pedido(s) cancelado(s) e {$entreguesElegiveis->count()} pedido(s) entregue(s) com mais de 7 dias foram excluídos.",
            'total_excluidos' => $totalExcluidos,
            'qtd_cancelados'  => $cancelados->count(),
            'qtd_entregues'   => $entreguesElegiveis->count(),
        ]);
    }

    /**
     * Consulta o status do rastreio de um pedido e atualiza automaticamente se entregue (Admin).
     */
    public function consultarRastreio(Pedido $pedido, RastreioService $rastreioService): JsonResponse
    {
        $info = $rastreioService->consultar($pedido);

        return response()->json([
            'sucesso'  => $info['sucesso'],
            'mensagem' => $info['mensagem'],
            'info'     => $info,
            'pedido'   => $pedido->fresh()->load(['itens.variacao.produto', 'user']),
        ]);
    }

    /**
     * Sincroniza em lote o rastreio de todos os pedidos em transporte (Admin).
     */
    public function sincronizarTodosRastreios(RastreioService $rastreioService): JsonResponse
    {
        $resumo = $rastreioService->sincronizarTodos();

        return response()->json([
            'mensagem' => "Sincronização concluída: {$resumo['total_atualizados']} de {$resumo['total_verificados']} pedidos atualizados.",
            'resumo'   => $resumo,
        ]);
    }

    /**
     * Webhook público para notificações automáticas do Melhor Envio (mudança de status de envio).
     */
    public function webhookMelhorEnvio(Request $request, RastreioService $rastreioService): JsonResponse
    {
        Log::info('Webhook Melhor Envio recebido: ', $request->all());

        $payload = $request->all();
        $orderId = $payload['id'] ?? $payload['order_id'] ?? $payload['shipment_id'] ?? null;
        $tracking = $payload['tracking'] ?? $payload['shipment']['tracking'] ?? null;
        $status  = strtolower($payload['status'] ?? $payload['event'] ?? '');
        $customId = $payload['custom_id'] ?? $payload['tag'] ?? null;

        $pedido = null;
        if ($orderId) {
            $pedido = Pedido::where('melhor_envio_id', (string) $orderId)
                ->orWhere('codigo_rastreio', (string) $orderId)
                ->first();
        }
        if (! $pedido && $tracking) {
            $pedido = Pedido::where('codigo_rastreio', (string) $tracking)->first();
        }
        if (! $pedido && $customId) {
            $pedido = Pedido::find($customId);
        }

        if ($pedido) {
            // Se veio o código de rastreio oficial dos Correios (ex: NL...BR), atualiza no pedido
            if (! empty($tracking) && $pedido->codigo_rastreio !== $tracking) {
                $pedido->update(['codigo_rastreio' => $tracking]);
            }

            if (in_array($status, ['delivered', 'entregue', 'shipment.delivered'], true) && $pedido->status !== 'Entregue') {
                $rastreioService->atualizarParaEntregue($pedido);
            } elseif (in_array($status, ['posted', 'postado', 'shipment.posted'], true) && in_array($pedido->status, ['Pago', 'Em separação'], true)) {
                $rastreioService->atualizarParaEnviado($pedido);
            } elseif (in_array($status, ['in_transit', 'shipment.in_transit'], true) && $pedido->status !== 'Entregue') {
                $pedido->update(['status' => 'Em transporte']);
            }
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * Envia o pedido diretamente para o Carrinho do Melhor Envio (Admin).
     */
    public function enviarMelhorEnvio(Request $request, Pedido $pedido, \App\Services\MelhorEnvioService $melhorEnvioService): JsonResponse
    {
        $cpfInformado = $request->input('cpf');
        $res = $melhorEnvioService->inserirNoCarrinho($pedido, $cpfInformado);

        if (! $res['sucesso']) {
            return response()->json([
                'mensagem' => $res['mensagem'],
            ], 422);
        }

        return response()->json([
            'mensagem' => $res['mensagem'],
            'pedido'   => $pedido->fresh()->load(['itens.variacao.produto', 'user']),
            'info'     => $res,
        ]);
    }
}
