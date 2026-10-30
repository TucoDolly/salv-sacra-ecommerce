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
     * Criar um novo pedido com seus itens.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email_contato'      => ['required', 'email'],
            'telefone'           => ['nullable', 'string', 'max:30'],
            'cep'                => ['required', 'string', 'max:20'],
            'logradouro'         => ['required', 'string', 'max:255'],
            'numero'             => ['required', 'string', 'max:50'],
            'complemento'        => ['nullable', 'string', 'max:255'],
            'bairro'             => ['required', 'string', 'max:150'],
            'cidade'             => ['required', 'string', 'max:150'],
            'estado'             => ['required', 'string', 'max:2'],
            'tipo_frete'         => ['nullable', 'string', 'max:100'],
            'valor_frete'        => ['required', 'numeric', 'min:0'],
            'metodo_pagamento'   => ['required', 'in:cartao,pix,boleto'],
            'observacoes'        => ['nullable', 'string'],
            'cupom_codigo'       => ['nullable', 'string', 'max:50'],
            'itens'              => ['required', 'array', 'min:1'],
            'itens.*.variacao_id'=> ['nullable', 'integer', 'exists:variacaos,id'],
            'itens.*.produto_id' => ['required', 'integer', 'exists:produtos,id'],
            'itens.*.quantidade' => ['required', 'integer', 'min:1'],
            'itens.*.preco'      => ['required', 'numeric', 'min:0'],
        ]);

        // A rota exige auth:sanctum, então sempre há um usuário logado
        $userId = $request->user()->id;

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

            if ($validated['metodo_pagamento'] === 'pix' || $validated['metodo_pagamento'] === 'boleto') {
                $valorTotal = $valorTotal * 0.95; // 5% de desconto
            }

            $statusInicial = $validated['metodo_pagamento'] === 'cartao' ? 'Pago' : 'Pendente';

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
                }

                ItemPedido::create([
                    'pedido_id'            => $pedido->id,
                    'variacao_produto_id'  => $variacaoId,
                    'quantidade'           => $item['quantidade'],
                    'preco_unitario'       => $item['preco'],
                ]);
            }

            return $pedido;
        });

        // Se o pagamento for PIX, gera cobrança via Mercado Pago (ou BRCode oficial EMVCo)
        if ($pedido->metodo_pagamento === 'pix') {
            $this->processarPagamentoPix($pedido, $request->user());
            $pedido->refresh();
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

        return response()->json([
            'mensagem' => 'Pedido criado com sucesso!',
            'pedido'   => $pedido->load(['itens.variacao.produto']),
        ], 201);
    }

    /**
     * Consultar pedido por ID (e sincroniza status na API do Mercado Pago caso esteja Pendente).
     */
    public function show(Request $request, Pedido $pedido): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->papel === 'admin' || $pedido->user_id === $user->id, 403, 'Acesso negado.');

        if ($pedido->status === 'Pendente' && ! empty($pedido->pagamento_id)) {
            $mpToken = Configuracao::where('chave', 'mercadopago_access_token')->value('valor')
                ?: env('MERCADOPAGO_ACCESS_TOKEN');

            if (! empty($mpToken)) {
                try {
                    $resp = Http::withoutVerifying()
                        ->withHeaders([
                            'Authorization' => 'Bearer ' . trim($mpToken),
                        ])->timeout(8)->get("https://api.mercadopago.com/v1/payments/{$pedido->pagamento_id}");

                    if ($resp->successful() && ($resp->json('status') === 'approved')) {
                        $pedido->update(['status' => 'Pago']);
                        try {
                            $destinatario = $pedido->email_contato ?: $pedido->user?->email;
                            if ($destinatario) {
                                \Illuminate\Support\Facades\Mail::to($destinatario)->send(new \App\Mail\StatusPedidoMail($pedido->load('user')));
                            }
                        } catch (\Throwable $e) {
                            \Illuminate\Support\Facades\Log::error('Erro ao enviar e-mail de aprovação MP: ' . $e->getMessage());
                        }
                    }
                } catch (\Throwable $e) {
                    // Silencioso no polling
                }
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
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Erro ao enviar e-mail de pagamento confirmado: ' . $e->getMessage());
            }
        }

        return response()->json([
            'mensagem' => 'Pagamento confirmado com sucesso!',
            'pedido'   => $pedido->load(['itens.variacao.produto', 'user']),
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

            if ($pedido && $pedido->status === 'Pendente' && ! empty($mpToken)) {
                try {
                    $resp = Http::withoutVerifying()
                        ->withHeaders([
                            'Authorization' => 'Bearer ' . trim($mpToken),
                        ])->timeout(10)->get("https://api.mercadopago.com/v1/payments/{$paymentId}");

                    if ($resp->successful() && ($resp->json('status') === 'approved')) {
                        $pedido->update(['status' => 'Pago']);
                        $destinatario = $pedido->email_contato ?: $pedido->user?->email;
                        if ($destinatario) {
                            \Illuminate\Support\Facades\Mail::to($destinatario)->send(new \App\Mail\StatusPedidoMail($pedido->load('user')));
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
        $query = Pedido::with(['user', 'itens.variacao.produto'])->latest('data_pedido');

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

        $pedido->update([
            'status'          => $novoStatus,
            'codigo_rastreio' => $codigoRastreio ?: null,
        ]);

        // Notifica o cliente por e-mail quando o status muda ou quando um código de rastreio é salvo
        if ($novoStatus !== $statusAnterior || (in_array($novoStatus, ['Enviado', 'Em transporte'], true) && ! empty($validated['codigo_rastreio']))) {
            try {
                $destinatario = $pedido->email_contato ?: $pedido->user?->email;
                if ($destinatario) {
                    \Illuminate\Support\Facades\Mail::to($destinatario)->send(new \App\Mail\StatusPedidoMail($pedido->load('user')));
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::error('Erro ao enviar e-mail de status do pedido: ' . $e->getMessage());
            }
        }

        return response()->json([
            'mensagem' => 'Dados de envio/status do pedido atualizados com sucesso.',
            'pedido'   => $pedido->load(['itens.variacao.produto', 'user']),
        ]);
    }
}
