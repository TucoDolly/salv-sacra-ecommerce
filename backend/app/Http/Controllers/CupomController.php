<?php

namespace App\Http\Controllers;

use App\Models\Cupom;
use App\Models\Pedido;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CupomController extends Controller
{
    private const RELACOES_ADMIN = [
        'produtos:id,nome',
        'usuario:id,name,email,cpf',
        'pedidoOrigem:id,status,valor_total,metodo_pagamento,data_pedido',
        'devolucao:id,pedido_id,status,motivo,valor_estorno',
        'historicos.pedido:id,status,valor_total',
        'historicos.usuario:id,name',
    ];

    /**
     * Atualiza para 'expirado' os benefícios ativos cuja validade já venceu.
     */
    public static function sincronizarExpirados(): void
    {
        Cupom::where('status', Cupom::STATUS_ATIVO)
            ->whereNotNull('validade')
            ->where('validade', '<=', now())
            ->update([
                'status' => Cupom::STATUS_EXPIRADO,
                'ativo'  => false,
            ]);
    }

    /**
     * Resolve, valida e calcula as combinações de benefícios no checkout.
     * Regras:
     * - Máximo 1 cupom promocional (produto OU frete) por compra.
     * - Máximo 1 vale-compra por compra.
     * - Não é possível combinar cupom de frete e cupom de produto na mesma compra.
     * - É permitido combinar 1 cupom promocional (produto ou frete) com 1 vale-compra.
     *
     * @throws ValidationException
     */
    public static function resolverBeneficiosCheckout(
        array $entradaCodigos,
        array $itens,
        float $valorFrete,
        ?int $userId = null,
        bool $lockForUpdate = false
    ): array {
        self::sincronizarExpirados();

        $cupomCodigoRaw = strtoupper(trim((string) ($entradaCodigos['cupom_codigo'] ?? '')));
        $valeCodigoRaw = strtoupper(trim((string) ($entradaCodigos['vale_compra_codigo'] ?? '')));
        $codigosExtrasRaw = collect($entradaCodigos['codigos'] ?? [])
            ->map(fn ($c) => strtoupper(trim((string) $c)))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if ($cupomCodigoRaw !== '' && $valeCodigoRaw !== '' && $cupomCodigoRaw === $valeCodigoRaw) {
            throw ValidationException::withMessages([
                'cupom_codigo' => ['O mesmo código não pode ser utilizado duas vezes na mesma compra.'],
            ]);
        }

        $buscarCupom = function (string $codigo) use ($lockForUpdate): ?Cupom {
            $query = Cupom::where('codigo', $codigo);
            if ($lockForUpdate) {
                $query->lockForUpdate();
            }
            return $query->first();
        };

        $beneficiosPorId = [];

        if ($cupomCodigoRaw !== '') {
            $encontrado = $buscarCupom($cupomCodigoRaw);
            if (! $encontrado) {
                throw ValidationException::withMessages([
                    'cupom_codigo' => ["Benefício \"{$cupomCodigoRaw}\" não encontrado."],
                ]);
            }
            $beneficiosPorId[$encontrado->id] = $encontrado;
        }

        if ($valeCodigoRaw !== '') {
            $encontradoVale = $buscarCupom($valeCodigoRaw);
            if (! $encontradoVale) {
                throw ValidationException::withMessages([
                    'vale_compra_codigo' => ["Vale-compra \"{$valeCodigoRaw}\" não encontrado."],
                ]);
            }
            if (! $encontradoVale->ehValeCompra()) {
                throw ValidationException::withMessages([
                    'vale_compra_codigo' => ["O código \"{$valeCodigoRaw}\" é um cupom promocional e deve ser informado no campo de cupom, não como vale-compra."],
                ]);
            }
            $beneficiosPorId[$encontradoVale->id] = $encontradoVale;
        }

        foreach ($codigosExtrasRaw as $codigoExtra) {
            $encontradoExtra = $buscarCupom($codigoExtra);
            if (! $encontradoExtra) {
                throw ValidationException::withMessages([
                    'codigos' => ["Benefício \"{$codigoExtra}\" não encontrado."],
                ]);
            }
            $beneficiosPorId[$encontradoExtra->id] = $encontradoExtra;
        }

        $promocionais = [];
        $vales = [];

        foreach ($beneficiosPorId as $beneficio) {
            if ($beneficio->ehValeCompra()) {
                $vales[] = $beneficio;
            } else {
                $promocionais[] = $beneficio;
            }
        }

        if (count($promocionais) > 1) {
            throw ValidationException::withMessages([
                'cupom_codigo' => ['Não é possível combinar cupom de frete e cupom de produto (ou mais de um cupom promocional) na mesma compra. Utilize no máximo 1 cupom promocional e 1 vale-compra.'],
            ]);
        }

        if (count($vales) > 1) {
            throw ValidationException::withMessages([
                'vale_compra_codigo' => ['É permitido utilizar apenas 1 vale-compra por compra.'],
            ]);
        }

        /** @var Cupom|null $cupomPromocional */
        $cupomPromocional = $promocionais[0] ?? null;
        /** @var Cupom|null $valeCompra */
        $valeCompra = $vales[0] ?? null;

        $subtotal = round((float) collect($itens)->sum(
            fn ($i) => (float) ($i['preco'] ?? 0) * (int) ($i['quantidade'] ?? 1)
        ), 2);
        $valorFreteOriginal = round(max(0.0, $valorFrete), 2);

        if ($cupomPromocional) {
            $check = $cupomPromocional->validarDisponibilidade($userId, $subtotal);
            if (! $check['valido']) {
                throw ValidationException::withMessages([
                    'cupom_codigo' => [$check['mensagem']],
                ]);
            }
        }

        if ($valeCompra) {
            $checkVale = $valeCompra->validarDisponibilidade($userId, $subtotal);
            if (! $checkVale['valido']) {
                throw ValidationException::withMessages([
                    'vale_compra_codigo' => [$checkVale['mensagem']],
                ]);
            }
        }

        $descontoProduto = 0.0;
        $descontoFrete = 0.0;

        if ($cupomPromocional) {
            $valorDesconto = $cupomPromocional->calcularDesconto($itens, $valorFreteOriginal);
            if ($cupomPromocional->ehCupomFrete()) {
                $descontoFrete = $valorDesconto;
            } else {
                $descontoProduto = $valorDesconto;
            }
        }

        $descontoCupom = round($descontoProduto + $descontoFrete, 2);
        $valorFretePago = max(0.0, round($valorFreteOriginal - $descontoFrete, 2));
        $totalAposCupom = max(0.0, round(($subtotal - $descontoProduto) + $valorFretePago, 2));

        $valorValeCompra = 0.0;
        $saldoAnteriorVale = 0.0;
        $saldoRestanteVale = 0.0;

        if ($valeCompra) {
            $saldoAnteriorVale = $valeCompra->obterSaldoDisponivel();
            $valorValeCompra = $valeCompra->calcularDesconto($itens, $valorFreteOriginal, $descontoCupom);
            $saldoRestanteVale = max(0.0, round($saldoAnteriorVale - $valorValeCompra, 2));
        }

        $valorPagoDinheiro = max(0.0, round($totalAposCupom - $valorValeCompra, 2));

        return [
            'cupom'                 => $cupomPromocional,
            'vale_compra'           => $valeCompra,
            'subtotal_produtos'     => $subtotal,
            'valor_frete_original'  => $valorFreteOriginal,
            'valor_desconto_cupom'  => $descontoCupom,
            'valor_desconto_produto'=> $descontoProduto,
            'valor_desconto_frete'  => $descontoFrete,
            'valor_frete_pago'      => $valorFretePago,
            'valor_vale_compra'     => $valorValeCompra,
            'saldo_anterior_vale'   => $saldoAnteriorVale,
            'saldo_restante_vale'   => $saldoRestanteVale,
            'valor_pago_dinheiro'   => $valorPagoDinheiro,
            'valor_total'           => $valorPagoDinheiro,
        ];
    }

    /** Lista completa com filtros por categoria/tipo/status/origem/busca (Admin). */
    public function index(Request $request): JsonResponse
    {
        self::sincronizarExpirados();

        $query = Cupom::with(self::RELACOES_ADMIN);
        $this->aplicarFiltrosAdmin($query, $request);

        return response()->json($query->latest()->get());
    }

    /** Lista apenas cupons promocionais (produto e frete) no painel Admin. */
    public function indexPromocionais(Request $request): JsonResponse
    {
        self::sincronizarExpirados();

        $request->merge(['categoria' => 'promocional']);
        $query = Cupom::with(self::RELACOES_ADMIN);
        $this->aplicarFiltrosAdmin($query, $request);

        return response()->json($query->latest()->get());
    }

    /** Lista apenas vales-compra no painel Admin. */
    public function indexValesCompra(Request $request): JsonResponse
    {
        self::sincronizarExpirados();

        $request->merge(['categoria' => 'vale_compra']);
        $query = Cupom::with(self::RELACOES_ADMIN);
        $this->aplicarFiltrosAdmin($query, $request);

        return response()->json($query->latest()->get());
    }

    /** Exibe os detalhes completos de um cupom ou vale-compra (Admin). */
    public function show(Cupom $cupom): JsonResponse
    {
        self::sincronizarExpirados();
        $cupom->refresh()->load(self::RELACOES_ADMIN);

        return response()->json($cupom);
    }

    /** Exibe o histórico completo de movimentações do cupom ou vale-compra (Admin). */
    public function historico(Cupom $cupom): JsonResponse
    {
        $historicos = $cupom->historicos()
            ->with(['pedido:id,status,valor_total,data_pedido', 'usuario:id,name,email'])
            ->get();

        return response()->json($historicos);
    }

    /** Benefícios ativos visíveis ao cliente (carrinho / checkout). */
    public function disponiveis(Request $request): JsonResponse
    {
        self::sincronizarExpirados();

        $user = $request->user('sanctum');

        $query = Cupom::with('produtos:id')
            ->where('ativo', true)
            ->where('status', Cupom::STATUS_ATIVO)
            ->where(function ($q) {
                $q->whereNull('validade')->orWhere('validade', '>', now());
            })
            ->where(function ($q) {
                $q->whereNull('limite_usos')->orWhereColumn('usos_atuais', '<', 'limite_usos');
            })
            ->where(function ($q) use ($user) {
                // Cupons promocionais públicos
                $q->where(function ($promoQ) {
                    $promoQ->whereIn('tipo', [Cupom::TIPO_PRODUTO, Cupom::TIPO_FRETE])
                        ->where('codigo', 'not like', 'TROCA-%')
                        ->where('codigo', 'not like', 'VALE-%');
                });

                // Vales-compra com saldo > 0 pertencentes ao cliente autenticado (ou sem titular definido)
                $q->orWhere(function ($valeQ) use ($user) {
                    $valeQ->where(function ($tv) {
                        $tv->whereIn('tipo', [Cupom::TIPO_VALE_COMPRA, 'troca'])
                            ->orWhere('codigo', 'like', 'TROCA-%')
                            ->orWhere('codigo', 'like', 'VALE-%');
                    })->whereRaw('COALESCE(saldo_atual, valor_fixo, 0) > 0');

                    if ($user) {
                        $valeQ->where(function ($uq) use ($user) {
                            $uq->whereNull('user_id')->orWhere('user_id', $user->id);
                        });
                    } else {
                        $valeQ->whereNull('user_id');
                    }
                });
            });

        $cupons = $query->orderBy('codigo')->get()
            ->map(function (Cupom $c) {
                $ehVale = $c->ehValeCompra();
                $saldoDisponivel = $ehVale ? $c->obterSaldoDisponivel() : null;

                return [
                    'id'                   => $c->id,
                    'codigo'               => $c->codigo,
                    'descricao'            => $c->descricao,
                    'percentual'           => $c->percentual,
                    'valor_fixo'           => $ehVale ? $saldoDisponivel : $c->valor_fixo,
                    'valor_inicial'        => $c->valor_inicial,
                    'saldo_atual'          => $saldoDisponivel,
                    'tipo'                 => $ehVale ? Cupom::TIPO_VALE_COMPRA : $c->tipo,
                    'eh_vale_compra'       => $ehVale,
                    'todos_produtos'       => $c->todos_produtos,
                    'produto_ids'          => $c->produtos->pluck('id')->all(),
                    'validade'             => $c->validade,
                    'valor_minimo_pedido'  => $c->valor_minimo_pedido,
                    'limite_usos'          => $c->limite_usos,
                    'usos_atuais'          => $c->usos_atuais,
                    'condicoes_utilizacao' => $c->condicoes_utilizacao,
                    'pedido_origem_id'     => $c->pedido_origem_id,
                    'status'               => $c->status,
                ];
            });

        return response()->json($cupons);
    }

    /** Vales-compra do cliente autenticado (Área Minha Conta). */
    public function meusVales(Request $request): JsonResponse
    {
        self::sincronizarExpirados();

        $user = $request->user();

        $vales = Cupom::with([
            'pedidoOrigem:id,status,valor_total,data_pedido',
            'devolucao:id,pedido_id,status,motivo,valor_estorno',
            'historicos.pedido:id,status,valor_total',
        ])
            ->where('user_id', $user->id)
            ->where(function ($q) {
                $q->whereIn('tipo', [Cupom::TIPO_VALE_COMPRA, 'troca'])
                    ->orWhere('codigo', 'like', 'TROCA-%')
                    ->orWhere('codigo', 'like', 'VALE-%');
            })
            ->orderByDesc('ativo')
            ->orderByDesc('id')
            ->get();

        return response()->json($vales);
    }

    /**
     * Valida e simula a combinação de cupom promocional (produto OU frete) + vale-compra no Checkout.
     */
    public function validarCheckout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'codigo'               => ['nullable', 'string', 'max:50'],
            'cupom_codigo'         => ['nullable', 'string', 'max:50'],
            'vale_compra_codigo'   => ['nullable', 'string', 'max:50'],
            'codigos'              => ['nullable', 'array'],
            'codigos.*'            => ['string', 'max:50'],
            'valor_frete'          => ['required', 'numeric', 'min:0'],
            'itens'                => ['required', 'array', 'min:1'],
            'itens.*.produto_id'   => ['required', 'integer', 'exists:produtos,id'],
            'itens.*.preco'        => ['required', 'numeric', 'min:0'],
            'itens.*.quantidade'   => ['required', 'integer', 'min:1'],
        ]);

        $codigos = $validated['codigos'] ?? [];
        if (! empty($validated['codigo'])) {
            $codigos[] = $validated['codigo'];
        }

        $user = $request->user('sanctum');

        $resultado = self::resolverBeneficiosCheckout(
            [
                'cupom_codigo'       => $validated['cupom_codigo'] ?? null,
                'vale_compra_codigo' => $validated['vale_compra_codigo'] ?? null,
                'codigos'            => $codigos,
            ],
            $validated['itens'],
            (float) $validated['valor_frete'],
            $user?->id
        );

        return response()->json([
            'valido'                 => true,
            'cupom'                  => $resultado['cupom'],
            'vale_compra'            => $resultado['vale_compra'],
            'subtotal_produtos'      => $resultado['subtotal_produtos'],
            'valor_frete_original'   => $resultado['valor_frete_original'],
            'valor_desconto_cupom'   => $resultado['valor_desconto_cupom'],
            'valor_desconto_produto' => $resultado['valor_desconto_produto'],
            'valor_desconto_frete'   => $resultado['valor_desconto_frete'],
            'valor_frete_pago'       => $resultado['valor_frete_pago'],
            'valor_vale_compra'      => $resultado['valor_vale_compra'],
            'saldo_anterior_vale'    => $resultado['saldo_anterior_vale'],
            'saldo_restante_vale'    => $resultado['saldo_restante_vale'],
            'valor_pago_dinheiro'    => $resultado['valor_pago_dinheiro'],
            'valor_total'            => $resultado['valor_total'],
        ]);
    }

    /** Cria cupom promocional ou vale-compra (Admin). */
    public function store(Request $request): JsonResponse
    {
        return $this->criarBeneficio($request, false);
    }

    /** Endpoint dedicado para emissão manual de vale-compra (Admin). */
    public function storeValeCompra(Request $request): JsonResponse
    {
        return $this->criarBeneficio($request, true);
    }

    /** Atualiza cupom promocional ou vale-compra (Admin). */
    public function update(Request $request, Cupom $cupom): JsonResponse
    {
        $saldoAnterior = $cupom->ehValeCompra() ? $cupom->obterSaldoDisponivel() : null;
        $dados = $this->validarDadosBeneficio($request, $cupom, $cupom->ehValeCompra());

        DB::transaction(function () use ($request, $cupom, $dados, $saldoAnterior) {
            $cupom->update($dados);
            $cupom->produtos()->sync($cupom->todos_produtos ? [] : $request->input('produto_ids', []));

            if ($cupom->ehValeCompra()) {
                $novoSaldo = $cupom->obterSaldoDisponivel();
                if ($saldoAnterior !== null && abs($novoSaldo - $saldoAnterior) >= 0.01) {
                    $cupom->registrarHistorico(
                        'ajuste',
                        abs($novoSaldo - $saldoAnterior),
                        $saldoAnterior,
                        $novoSaldo,
                        $cupom->pedido_origem_id,
                        $request->user()?->id,
                        'Saldo do vale-compra ajustado manualmente pelo administrador.'
                    );
                }
            }
        });

        return response()->json($cupom->fresh()->load(self::RELACOES_ADMIN));
    }

    /** Remove cupom ou vale-compra sem movimentação (Admin). */
    public function destroy(Cupom $cupom): JsonResponse
    {
        $cupom->delete();
        return response()->json(['message' => 'Benefício removido.']);
    }

    /** Bloqueia um vale-compra ou cupom (ex: contestação bancária / chargeback / MED). */
    public function bloquear(Request $request, Cupom $cupom): JsonResponse
    {
        $validated = $request->validate([
            'motivo' => ['required', 'string', 'min:3', 'max:1000'],
            'tipo'   => ['nullable', 'in:bloqueado,revogado'],
        ]);

        $novoStatus = $validated['tipo'] ?? Cupom::STATUS_BLOQUEADO;

        DB::transaction(function () use ($cupom, $validated, $request, $novoStatus) {
            $cupomLocked = Cupom::lockForUpdate()->findOrFail($cupom->id);
            $cupomLocked->bloquearPorContestacao(
                trim($validated['motivo']),
                $request->user()?->id,
                $novoStatus
            );
        });

        $label = $novoStatus === Cupom::STATUS_REVOGADO ? 'revogado' : 'bloqueado';

        return response()->json([
            'message' => "Benefício {$cupom->codigo} {$label} com sucesso.",
            'cupom'   => $cupom->fresh()->load(self::RELACOES_ADMIN),
        ]);
    }

    /** Revoga definitivamente um vale-compra ou cupom (alias para bloquear com status 'revogado'). */
    public function revogar(Request $request, Cupom $cupom): JsonResponse
    {
        $request->merge(['tipo' => Cupom::STATUS_REVOGADO]);
        return $this->bloquear($request, $cupom);
    }

    /** Desbloqueia um vale-compra ou cupom restaurando o saldo anterior ao bloqueio (Admin). */
    public function desbloquear(Request $request, Cupom $cupom): JsonResponse
    {
        $validated = $request->validate([
            'observacao' => ['nullable', 'string', 'max:1000'],
        ]);

        if (! $cupom->estaBloqueadoOuRevogado()) {
            return response()->json([
                'message' => "O benefício {$cupom->codigo} não está bloqueado nem revogado.",
            ], 422);
        }

        DB::transaction(function () use ($cupom, $validated, $request) {
            $cupomLocked = Cupom::lockForUpdate()->findOrFail($cupom->id);
            $cupomLocked->desbloquear($request->user()?->id, $validated['observacao'] ?? null);
        });

        return response()->json([
            'message' => "Benefício {$cupom->codigo} desbloqueado com sucesso.",
            'cupom'   => $cupom->fresh()->load(self::RELACOES_ADMIN),
        ]);
    }

    /**
     * Bloqueia ou revoga todos os vales-compra originados de um pedido específico
     * (ex: em casos de contestação bancária / chargeback / MED no pedido de origem).
     */
    public function bloquearPorPedidoOrigem(Request $request, Pedido $pedido): JsonResponse
    {
        $validated = $request->validate([
            'motivo' => ['nullable', 'string', 'max:1000'],
            'tipo'   => ['nullable', 'in:bloqueado,revogado'],
        ]);

        $motivo = trim((string) ($validated['motivo'] ?? ''))
            ?: "Contestação bancária (Chargeback / MED) registrada no Pedido #{$pedido->id}.";
        $novoStatus = $validated['tipo'] ?? Cupom::STATUS_REVOGADO;

        $codigosDevolucoes = $pedido->devolucoes()
            ->whereNotNull('cupom_gerado_codigo')
            ->pluck('cupom_gerado_codigo')
            ->filter()
            ->map(fn ($c) => strtoupper(trim((string) $c)))
            ->all();

        $valesAfetados = DB::transaction(function () use ($pedido, $codigosDevolucoes, $motivo, $novoStatus, $request) {
            $vales = Cupom::lockForUpdate()
                ->where(function ($q) use ($pedido, $codigosDevolucoes) {
                    $q->where('pedido_origem_id', $pedido->id);
                    if (! empty($codigosDevolucoes)) {
                        $q->orWhereIn('codigo', $codigosDevolucoes);
                    }
                })
                ->whereNotIn('status', [Cupom::STATUS_BLOQUEADO, Cupom::STATUS_REVOGADO])
                ->get();

            foreach ($vales as $vale) {
                $vale->bloquearPorContestacao($motivo, $request->user()?->id, $novoStatus);
            }

            return $vales;
        });

        return response()->json([
            'message'          => $valesAfetados->count() > 0
                ? "{$valesAfetados->count()} vale(s)-compra vinculado(s) ao Pedido #{$pedido->id} {$novoStatus}(s) com sucesso."
                : "Nenhum vale-compra ativo/desbloqueado encontrado para o Pedido #{$pedido->id}.",
            'total_afetados'   => $valesAfetados->count(),
            'vales_afetados'   => $valesAfetados->map(fn (Cupom $v) => $v->fresh()->load(self::RELACOES_ADMIN))->values(),
        ]);
    }

    private function criarBeneficio(Request $request, bool $forcarValeCompra): JsonResponse
    {
        $dados = $this->validarDadosBeneficio($request, null, $forcarValeCompra);

        $cupom = DB::transaction(function () use ($request, $dados) {
            $cupom = Cupom::create($dados);
            $cupom->produtos()->sync($cupom->todos_produtos ? [] : $request->input('produto_ids', []));

            $ehVale = $cupom->ehValeCompra();
            $saldo = $ehVale ? $cupom->obterSaldoDisponivel() : 0.0;

            $cupom->registrarHistorico(
                'criacao',
                $saldo,
                $ehVale ? 0.0 : null,
                $ehVale ? $saldo : null,
                $cupom->pedido_origem_id,
                $request->user()?->id,
                $ehVale
                    ? 'Vale-compra emitido com crédito inicial de R$ ' . number_format($saldo, 2, ',', '.') . '.'
                    : "Cupom promocional ({$cupom->tipo}) criado no painel administrativo."
            );

            return $cupom;
        });

        return response()->json($cupom->load(self::RELACOES_ADMIN), 201);
    }

    private function aplicarFiltrosAdmin($query, Request $request): void
    {
        $categoria = strtolower(trim((string) ($request->query('categoria') ?? $request->query('grupo') ?? '')));
        $tipo = strtolower(trim((string) $request->query('tipo', '')));

        if ($categoria === 'promocional' || $tipo === 'promocional') {
            $query->whereIn('tipo', [Cupom::TIPO_PRODUTO, Cupom::TIPO_FRETE])
                ->where('codigo', 'not like', 'TROCA-%')
                ->where('codigo', 'not like', 'VALE-%');
        } elseif ($categoria === 'vale_compra' || in_array($tipo, [Cupom::TIPO_VALE_COMPRA, 'troca'], true)) {
            $query->where(function ($q) {
                $q->whereIn('tipo', [Cupom::TIPO_VALE_COMPRA, 'troca'])
                    ->orWhere('codigo', 'like', 'TROCA-%')
                    ->orWhere('codigo', 'like', 'VALE-%');
            });
        } elseif ($tipo === Cupom::TIPO_PRODUTO) {
            $query->where('tipo', Cupom::TIPO_PRODUTO)
                ->where('codigo', 'not like', 'TROCA-%')
                ->where('codigo', 'not like', 'VALE-%');
        } elseif ($tipo === Cupom::TIPO_FRETE) {
            $query->where('tipo', Cupom::TIPO_FRETE);
        }

        if ($request->filled('status')) {
            $query->where('status', strtolower(trim((string) $request->query('status'))));
        }

        if ($request->has('ativo') && $request->query('ativo') !== '') {
            $query->where('ativo', filter_var($request->query('ativo'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('pedido_origem_id')) {
            $query->where('pedido_origem_id', (int) $request->query('pedido_origem_id'));
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', (int) $request->query('user_id'));
        }

        if ($request->filled('busca')) {
            $termo = trim((string) $request->query('busca'));
            $like = '%' . mb_strtolower($termo) . '%';
            $query->where(function ($q) use ($termo, $like) {
                $q->whereRaw('LOWER(codigo) LIKE ?', [$like])
                    ->orWhereRaw("LOWER(COALESCE(descricao, '')) LIKE ?", [$like])
                    ->orWhereHas('usuario', function ($uq) use ($like) {
                        $uq->whereRaw('LOWER(name) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(email) LIKE ?', [$like])
                            ->orWhereRaw("COALESCE(cpf, '') LIKE ?", [$like]);
                    });
                if (ctype_digit($termo)) {
                    $q->orWhere('pedido_origem_id', (int) $termo);
                }
            });
        }
    }

    private function validarDadosBeneficio(Request $request, ?Cupom $existente = null, bool $forcarValeCompra = false): array
    {
        $tipoInformado = strtolower(trim((string) ($request->input('tipo') ?? ($existente?->tipo ?? Cupom::TIPO_PRODUTO))));
        if ($forcarValeCompra || $tipoInformado === 'troca') {
            $tipoNormalizado = Cupom::TIPO_VALE_COMPRA;
        } else {
            $tipoNormalizado = $tipoInformado;
        }

        $codigoInformado = strtoupper(trim((string) $request->input('codigo', '')));
        if ($codigoInformado === '' && $tipoNormalizado === Cupom::TIPO_VALE_COMPRA && ! $existente) {
            do {
                $codigoInformado = 'VALE-' . strtoupper(Str::random(6));
            } while (Cupom::where('codigo', $codigoInformado)->exists());
        }

        $request->merge([
            'codigo' => $codigoInformado,
            'tipo'   => $tipoNormalizado,
        ]);

        $ehValeCompra = $tipoNormalizado === Cupom::TIPO_VALE_COMPRA;

        $rules = [
            'codigo'               => ['required', 'string', 'max:50', 'alpha_dash', Rule::unique('cupons', 'codigo')->ignore($existente?->id)],
            'descricao'            => ['nullable', 'string', 'max:255'],
            'tipo'                 => ['required', 'in:produto,frete,vale_compra'],
            'todos_produtos'       => ['boolean'],
            'ativo'                => ['boolean'],
            'validade'             => ['nullable', 'date'],
            'valor_minimo_pedido'  => ['nullable', 'numeric', 'min:0'],
            'limite_usos'          => ['nullable', 'integer', 'min:1'],
            'condicoes_utilizacao' => ['nullable', 'string', 'max:2000'],
            'user_id'              => ['nullable', 'integer', 'exists:users,id'],
            'pedido_origem_id'     => ['nullable', 'integer', 'exists:pedidos,id'],
            'devolucao_id'         => ['nullable', 'integer', 'exists:devolucoes,id'],
            'status'               => ['nullable', 'in:ativo,inativo,esgotado,expirado,bloqueado,revogado'],
            'motivo_bloqueio'      => ['nullable', 'string', 'max:1000'],
        ];

        if ($ehValeCompra) {
            $rules['percentual'] = ['nullable', 'numeric', 'min:0', 'max:100'];
            $rules['valor_inicial'] = [$existente ? 'nullable' : 'required_without:valor_fixo', 'numeric', 'gt:0'];
            $rules['valor_fixo'] = ['nullable', 'numeric', 'min:0'];
            $rules['saldo_atual'] = ['nullable', 'numeric', 'min:0'];
            $rules['produto_ids'] = ['nullable', 'array'];
            $rules['produto_ids.*'] = ['integer', 'exists:produtos,id'];
        } else {
            $rules['percentual'] = ['required', 'numeric', 'gt:0', 'max:100'];
            $rules['valor_fixo'] = ['nullable', 'numeric', 'min:0'];
            $rules['valor_inicial'] = ['nullable', 'numeric', 'min:0'];
            $rules['saldo_atual'] = ['nullable', 'numeric', 'min:0'];
            $rules['produto_ids'] = ['array', 'required_if:todos_produtos,false'];
            $rules['produto_ids.*'] = ['integer', 'exists:produtos,id'];
        }

        $dados = $request->validate($rules, [
            'produto_ids.required_if'          => 'Selecione ao menos uma peça ou marque "Todas as peças".',
            'valor_inicial.required_without'   => 'Informe o valor inicial do vale-compra.',
        ]);

        unset($dados['produto_ids']);

        if ($ehValeCompra) {
            $dados['percentual'] = 0;
            $dados['todos_produtos'] = $dados['todos_produtos'] ?? true;

            $valorInicial = isset($dados['valor_inicial'])
                ? (float) $dados['valor_inicial']
                : (isset($dados['valor_fixo']) && ! $existente ? (float) $dados['valor_fixo'] : (float) ($existente?->valor_inicial ?? $existente?->valor_fixo ?? 0));

            if (isset($dados['saldo_atual'])) {
                $saldoAtual = (float) $dados['saldo_atual'];
            } elseif (! $existente) {
                $saldoAtual = $valorInicial;
            } elseif ($request->has('valor_fixo') && $dados['valor_fixo'] !== null) {
                $saldoAtual = (float) $dados['valor_fixo'];
            } else {
                $saldoAtual = (float) ($existente->saldo_atual ?? $existente->valor_fixo ?? $valorInicial);
            }

            if ($saldoAtual > $valorInicial && $valorInicial > 0) {
                $valorInicial = $saldoAtual;
            }

            $dados['valor_inicial'] = round($valorInicial, 2);
            $dados['saldo_atual'] = round($saldoAtual, 2);
            $dados['valor_fixo'] = round($saldoAtual, 2);
        } else {
            $dados['valor_inicial'] = null;
            $dados['saldo_atual'] = null;
            $dados['valor_fixo'] = null;
            $dados['todos_produtos'] = $dados['todos_produtos'] ?? true;
        }

        // Sincroniza flags 'ativo' e 'status' de forma consistente
        if (! $existente) {
            $ativo = array_key_exists('ativo', $dados) ? (bool) $dados['ativo'] : true;
            $status = $dados['status'] ?? ($ativo ? Cupom::STATUS_ATIVO : Cupom::STATUS_INATIVO);
            if ($ehValeCompra && ($dados['saldo_atual'] ?? 0) <= 0 && $status === Cupom::STATUS_ATIVO) {
                $status = Cupom::STATUS_ESGOTADO;
                $ativo = false;
            }
            $dados['ativo'] = ($status === Cupom::STATUS_ATIVO);
            $dados['status'] = $status;
        } else {
            $statusExplicitamenteAlterado = $request->has('status') && $request->input('status') !== $existente->status;
            $ativoExplicitamenteAlterado = $request->has('ativo') && $request->boolean('ativo') !== (bool) $existente->ativo;

            if ($statusExplicitamenteAlterado) {
                $status = $dados['status'];
                $dados['ativo'] = ($status === Cupom::STATUS_ATIVO);
            } elseif ($ativoExplicitamenteAlterado) {
                $ativo = $request->boolean('ativo');
                if ($ativo && $ehValeCompra && ($dados['saldo_atual'] ?? 0) <= 0) {
                    $dados['status'] = Cupom::STATUS_ESGOTADO;
                    $dados['ativo'] = false;
                } else {
                    $dados['ativo'] = $ativo;
                    $dados['status'] = $ativo ? Cupom::STATUS_ATIVO : Cupom::STATUS_INATIVO;
                }
            } else {
                $status = $dados['status'] ?? $existente->status;
                if ($ehValeCompra && ($dados['saldo_atual'] ?? 0) <= 0 && $status === Cupom::STATUS_ATIVO) {
                    $status = Cupom::STATUS_ESGOTADO;
                }
                $dados['status'] = $status;
                $dados['ativo'] = ($status === Cupom::STATUS_ATIVO);
            }
        }

        return $dados;
    }
}
