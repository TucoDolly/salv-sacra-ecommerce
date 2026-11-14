<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cupom extends Model
{
    public const TIPO_PRODUTO = 'produto';
    public const TIPO_FRETE = 'frete';
    public const TIPO_VALE_COMPRA = 'vale_compra';

    public const STATUS_ATIVO = 'ativo';
    public const STATUS_INATIVO = 'inativo';
    public const STATUS_ESGOTADO = 'esgotado';
    public const STATUS_EXPIRADO = 'expirado';
    public const STATUS_BLOQUEADO = 'bloqueado';
    public const STATUS_REVOGADO = 'revogado';

    protected $table = 'cupons';

    protected $fillable = [
        'codigo',
        'descricao',
        'percentual',
        'valor_fixo',
        'valor_inicial',
        'saldo_atual',
        'tipo',
        'todos_produtos',
        'ativo',
        'validade',
        'valor_minimo_pedido',
        'limite_usos',
        'usos_atuais',
        'condicoes_utilizacao',
        'user_id',
        'pedido_origem_id',
        'devolucao_id',
        'status',
        'motivo_bloqueio',
        'bloqueado_em',
    ];

    protected $casts = [
        'percentual'          => 'float',
        'valor_fixo'          => 'decimal:2',
        'valor_inicial'       => 'decimal:2',
        'saldo_atual'         => 'decimal:2',
        'valor_minimo_pedido' => 'decimal:2',
        'limite_usos'         => 'integer',
        'usos_atuais'         => 'integer',
        'todos_produtos'      => 'boolean',
        'ativo'               => 'boolean',
        'validade'            => 'datetime',
        'bloqueado_em'        => 'datetime',
    ];

    public function produtos(): BelongsToMany
    {
        return $this->belongsToMany(Produto::class, 'cupom_produto', 'cupom_id', 'produto_id');
    }

    public function historicos(): HasMany
    {
        return $this->hasMany(CupomHistorico::class, 'cupom_id')->latest('id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id')->withTrashed();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id')->withTrashed();
    }

    public function pedidoOrigem(): BelongsTo
    {
        return $this->belongsTo(Pedido::class, 'pedido_origem_id');
    }

    public function devolucao(): BelongsTo
    {
        return $this->belongsTo(Devolucao::class, 'devolucao_id');
    }

    public function pedidosComoCupom(): HasMany
    {
        return $this->hasMany(Pedido::class, 'cupom_id');
    }

    public function pedidosComoVale(): HasMany
    {
        return $this->hasMany(Pedido::class, 'vale_compra_id');
    }

    public function ehValeCompra(): bool
    {
        return in_array($this->tipo, [self::TIPO_VALE_COMPRA, 'troca'], true)
            || str_starts_with((string) $this->codigo, 'TROCA-')
            || str_starts_with((string) $this->codigo, 'VALE-');
    }

    public function ehCupomProduto(): bool
    {
        return $this->tipo === self::TIPO_PRODUTO && ! $this->ehValeCompra();
    }

    public function ehCupomFrete(): bool
    {
        return $this->tipo === self::TIPO_FRETE;
    }

    public function ehPromocional(): bool
    {
        return $this->ehCupomProduto() || $this->ehCupomFrete();
    }

    public function estaExpirado(): bool
    {
        return $this->validade !== null && $this->validade->isPast();
    }

    public function estaBloqueadoOuRevogado(): bool
    {
        return in_array($this->status, [self::STATUS_BLOQUEADO, self::STATUS_REVOGADO], true);
    }

    public function obterSaldoDisponivel(): float
    {
        if (! $this->ehValeCompra()) {
            return 0.0;
        }

        return max(0.0, round((float) ($this->saldo_atual ?? $this->valor_fixo ?? $this->valor_inicial ?? 0), 2));
    }

    public function validarDisponibilidade(?int $userId = null, float $subtotal = 0.0): array
    {
        if ($this->estaBloqueadoOuRevogado()) {
            $motivo = $this->motivo_bloqueio ? " Motivo: {$this->motivo_bloqueio}" : '';
            return [
                'valido'   => false,
                'mensagem' => "Este benefício ({$this->codigo}) está {$this->status} e não pode ser utilizado.{$motivo}",
            ];
        }

        if ($this->estaExpirado() || $this->status === self::STATUS_EXPIRADO) {
            return [
                'valido'   => false,
                'mensagem' => "O benefício {$this->codigo} está expirado.",
            ];
        }

        if ($this->status === self::STATUS_ESGOTADO) {
            return [
                'valido'   => false,
                'mensagem' => $this->ehValeCompra()
                    ? "O vale-compra {$this->codigo} já teve todo o seu saldo utilizado."
                    : "O cupom {$this->codigo} atingiu o limite máximo de utilizações.",
            ];
        }

        if (! $this->ativo || $this->status === self::STATUS_INATIVO) {
            return [
                'valido'   => false,
                'mensagem' => "O benefício {$this->codigo} está inativo no momento.",
            ];
        }

        if ($this->ehValeCompra()) {
            if ($this->obterSaldoDisponivel() <= 0) {
                return [
                    'valido'   => false,
                    'mensagem' => "O vale-compra {$this->codigo} não possui saldo disponível.",
                ];
            }

            if ($this->user_id !== null) {
                if ($userId === null) {
                    return [
                        'valido'   => false,
                        'mensagem' => "O vale-compra {$this->codigo} é pessoal. Faça login na conta titular para utilizá-lo.",
                    ];
                }
                if ((int) $this->user_id !== (int) $userId) {
                    return [
                        'valido'   => false,
                        'mensagem' => "O vale-compra {$this->codigo} pertence a outro titular e não pode ser utilizado nesta conta.",
                    ];
                }
            }
        } else {
            if ($this->limite_usos !== null && (int) $this->usos_atuais >= (int) $this->limite_usos) {
                return [
                    'valido'   => false,
                    'mensagem' => "O cupom {$this->codigo} atingiu o limite máximo de utilizações.",
                ];
            }
        }

        $minimo = (float) ($this->valor_minimo_pedido ?? 0);
        if ($minimo > 0 && $subtotal < $minimo) {
            return [
                'valido'   => false,
                'mensagem' => "O benefício {$this->codigo} exige valor mínimo de R$ " . number_format($minimo, 2, ',', '.') . ' em produtos.',
            ];
        }

        return [
            'valido'   => true,
            'mensagem' => null,
        ];
    }

    /**
     * Calcula o desconto do benefício para os itens [produto_id, preco, quantidade] e o frete informado.
     */
    public function calcularDesconto(array $itens, float $frete, float $descontoPromocionalPrevio = 0.0): float
    {
        $idsPermitidos = ($this->todos_produtos ?? true) ? null : $this->produtos()->pluck('produtos.id')->all();

        $itensCollection = collect($itens);
        $itensValidos = $itensCollection->filter(
            fn ($i) => $idsPermitidos === null || in_array((int) ($i['produto_id'] ?? 0), $idsPermitidos, true)
        );

        if ($itensValidos->isEmpty()) {
            return 0.0;
        }

        $subtotalCarrinho = (float) $itensCollection->sum(
            fn ($i) => (float) ($i['preco'] ?? 0) * (int) ($i['quantidade'] ?? 1)
        );

        $valorMinimo = (float) ($this->valor_minimo_pedido ?? 0);
        if ($valorMinimo > 0 && $subtotalCarrinho < $valorMinimo) {
            return 0.0;
        }

        // Cupom de frete: desconto percentual sobre o frete do pedido
        if ($this->ehCupomFrete()) {
            $pct = min(100, max(0, (float) $this->percentual)) / 100;
            return round(max(0.0, $frete) * $pct, 2);
        }

        $totalItensValidos = (float) $itensValidos->sum(
            fn ($i) => (float) ($i['preco'] ?? 0) * (int) ($i['quantidade'] ?? 1)
        );

        // Vale-compra: crédito em dinheiro aplicado sobre o total restante do pedido após cupom promocional
        if ($this->ehValeCompra()) {
            $saldoDisponivel = $this->obterSaldoDisponivel();
            if ($saldoDisponivel <= 0) {
                return 0.0;
            }

            $totalPedidoRestante = max(0.0, round($subtotalCarrinho + max(0.0, $frete) - max(0.0, $descontoPromocionalPrevio), 2));
            if (! ($this->todos_produtos ?? true)) {
                $tetoElegivel = max(0.0, round($totalItensValidos + max(0.0, $frete) - max(0.0, $descontoPromocionalPrevio), 2));
                $totalPedidoRestante = min($totalPedidoRestante, $tetoElegivel);
            }

            return round(min($totalPedidoRestante, $saldoDisponivel), 2);
        }

        // Cupom de produto: desconto percentual sobre os produtos elegíveis
        $pct = min(100, max(0, (float) $this->percentual)) / 100;
        if ($pct > 0) {
            return round($totalItensValidos * $pct, 2);
        }

        if (! empty($this->valor_fixo) && (float) $this->valor_fixo > 0) {
            return round(min($totalItensValidos, (float) $this->valor_fixo), 2);
        }

        return 0.0;
    }

    public function registrarHistorico(
        string $tipoEvento,
        float $valor = 0.0,
        ?float $saldoAnterior = null,
        ?float $saldoNovo = null,
        ?int $pedidoId = null,
        ?int $userId = null,
        ?string $descricao = null
    ): CupomHistorico {
        return $this->historicos()->create([
            'pedido_id'      => $pedidoId,
            'user_id'        => $userId,
            'tipo_evento'    => $tipoEvento,
            'valor'          => round($valor, 2),
            'saldo_anterior' => $saldoAnterior !== null ? round($saldoAnterior, 2) : null,
            'saldo_novo'     => $saldoNovo !== null ? round($saldoNovo, 2) : null,
            'descricao'      => $descricao,
        ]);
    }

    public function consumirNoPedido(float $valorUtilizado, int $pedidoId, ?int $userId = null): void
    {
        $valorUtilizado = round(max(0.0, $valorUtilizado), 2);

        if ($this->ehValeCompra()) {
            $saldoAnterior = $this->obterSaldoDisponivel();
            $novoSaldo = max(0.0, round($saldoAnterior - $valorUtilizado, 2));
            $esgotado = $novoSaldo <= 0;

            $this->update([
                'saldo_atual' => $novoSaldo,
                'valor_fixo'  => $novoSaldo,
                'usos_atuais' => (int) $this->usos_atuais + 1,
                'ativo'       => ! $esgotado,
                'status'      => $esgotado ? self::STATUS_ESGOTADO : self::STATUS_ATIVO,
            ]);

            $tipoUso = $esgotado ? 'integral' : 'parcial';
            $this->registrarHistorico(
                'utilizacao',
                $valorUtilizado,
                $saldoAnterior,
                $novoSaldo,
                $pedidoId,
                $userId,
                "Utilização {$tipoUso} de R$ " . number_format($valorUtilizado, 2, ',', '.') . " no Pedido #{$pedidoId}. Saldo restante: R$ " . number_format($novoSaldo, 2, ',', '.') . '.'
            );

            return;
        }

        $novosUsos = (int) $this->usos_atuais + 1;
        $esgotouLimite = $this->limite_usos !== null && $novosUsos >= (int) $this->limite_usos;

        $this->update([
            'usos_atuais' => $novosUsos,
            'ativo'       => $esgotouLimite ? false : $this->ativo,
            'status'      => $esgotouLimite ? self::STATUS_ESGOTADO : self::STATUS_ATIVO,
        ]);

        $this->registrarHistorico(
            'utilizacao',
            $valorUtilizado,
            null,
            null,
            $pedidoId,
            $userId,
            "Cupom promocional ({$this->tipo}) utilizado no Pedido #{$pedidoId} com desconto de R$ " . number_format($valorUtilizado, 2, ',', '.') . '.'
        );
    }

    public function restaurarDoPedido(
        float $valorRestaurado,
        int $pedidoId,
        ?int $userId = null,
        string $motivo = 'Cancelamento do pedido'
    ): void {
        $valorRestaurado = round(max(0.0, $valorRestaurado), 2);

        if ($this->ehValeCompra()) {
            $saldoAnterior = $this->obterSaldoDisponivel();
            $teto = max((float) ($this->valor_inicial ?? 0), $saldoAnterior + $valorRestaurado);
            $novoSaldo = round(min($teto, $saldoAnterior + $valorRestaurado), 2);

            $dadosAtualizar = [
                'saldo_atual' => $novoSaldo,
                'valor_fixo'  => $novoSaldo,
                'usos_atuais' => max(0, (int) $this->usos_atuais - 1),
            ];

            $validadeEstendida = false;
            if (! $this->estaBloqueadoOuRevogado()) {
                if ($novoSaldo > 0 && ($this->estaExpirado() || $this->status === self::STATUS_EXPIRADO)) {
                    $dadosAtualizar['validade'] = now()->addDays(30);
                    $dadosAtualizar['status'] = self::STATUS_ATIVO;
                    $dadosAtualizar['ativo'] = true;
                    $validadeEstendida = true;
                } else {
                    $dadosAtualizar['status'] = $novoSaldo > 0 ? self::STATUS_ATIVO : self::STATUS_ESGOTADO;
                    $dadosAtualizar['ativo'] = $novoSaldo > 0;
                }
            }

            $this->update($dadosAtualizar);

            $descricaoHistorico = "Saldo restaurado (+R$ " . number_format($valorRestaurado, 2, ',', '.') . ") referente ao Pedido #{$pedidoId}. Motivo: {$motivo}.";
            if ($validadeEstendida) {
                $descricaoHistorico .= ' Validade prorrogada por +30 dias na restauração.';
            }

            $this->registrarHistorico(
                'restauracao',
                $valorRestaurado,
                $saldoAnterior,
                $novoSaldo,
                $pedidoId,
                $userId,
                $descricaoHistorico
            );

            return;
        }

        $novosUsos = max(0, (int) $this->usos_atuais - 1);
        $dadosAtualizar = ['usos_atuais' => $novosUsos];
        $validadeEstendida = false;

        if (! $this->estaBloqueadoOuRevogado()) {
            $dentroDoLimite = ($this->limite_usos === null || $novosUsos < (int) $this->limite_usos);
            if ($this->estaExpirado() || $this->status === self::STATUS_EXPIRADO) {
                $dadosAtualizar['validade'] = now()->addDays(30);
                $validadeEstendida = true;
                if ($dentroDoLimite) {
                    $dadosAtualizar['status'] = self::STATUS_ATIVO;
                    $dadosAtualizar['ativo'] = true;
                } else {
                    $dadosAtualizar['status'] = self::STATUS_ESGOTADO;
                    $dadosAtualizar['ativo'] = false;
                }
            } elseif ($this->status === self::STATUS_ESGOTADO && $dentroDoLimite) {
                $dadosAtualizar['status'] = self::STATUS_ATIVO;
                $dadosAtualizar['ativo'] = true;
            } elseif ($dentroDoLimite && $this->status === self::STATUS_ATIVO) {
                $dadosAtualizar['ativo'] = true;
            }
        }

        $this->update($dadosAtualizar);

        $descricaoHistorico = "Uso do cupom promocional restaurado referente ao Pedido #{$pedidoId}. Motivo: {$motivo}.";
        if ($validadeEstendida) {
            $descricaoHistorico .= ' Validade prorrogada por +30 dias na restauração.';
        }

        $this->registrarHistorico(
            'restauracao',
            $valorRestaurado,
            null,
            null,
            $pedidoId,
            $userId,
            $descricaoHistorico
        );
    }

    public function bloquearPorContestacao(
        string $motivo,
        ?int $adminUserId = null,
        string $novoStatus = self::STATUS_BLOQUEADO
    ): void {
        $statusFinal = in_array($novoStatus, [self::STATUS_BLOQUEADO, self::STATUS_REVOGADO], true)
            ? $novoStatus
            : self::STATUS_BLOQUEADO;

        $saldoAnterior = $this->ehValeCompra() ? $this->obterSaldoDisponivel() : 0.0;

        $dadosUpdate = [
            'status'          => $statusFinal,
            'ativo'           => false,
            'motivo_bloqueio' => $motivo,
            'bloqueado_em'    => now(),
        ];

        if ($this->ehValeCompra()) {
            $dadosUpdate['saldo_atual'] = 0;
            $dadosUpdate['valor_fixo'] = 0;
        }

        $this->update($dadosUpdate);

        $tipoEvento = $statusFinal === self::STATUS_REVOGADO ? 'revogacao' : 'bloqueio';
        $this->registrarHistorico(
            $tipoEvento,
            $saldoAnterior,
            $this->ehValeCompra() ? $saldoAnterior : null,
            $this->ehValeCompra() ? 0.0 : null,
            $this->pedido_origem_id,
            $adminUserId,
            "Benefício {$statusFinal}. Motivo: {$motivo}"
        );
    }

    public function desbloquear(?int $adminUserId = null, ?string $observacao = null): void
    {
        if ($this->ehValeCompra()) {
            $ultimoBloqueio = $this->historicos()
                ->whereIn('tipo_evento', ['bloqueio', 'revogacao'])
                ->first();

            $saldoRestaurado = $ultimoBloqueio && $ultimoBloqueio->saldo_anterior !== null
                ? max(0.0, (float) $ultimoBloqueio->saldo_anterior)
                : max(0.0, (float) ($this->valor_inicial ?? 0));

            $saldoAnterior = $this->obterSaldoDisponivel();
            $novoStatus = $this->estaExpirado()
                ? self::STATUS_EXPIRADO
                : ($saldoRestaurado > 0 ? self::STATUS_ATIVO : self::STATUS_ESGOTADO);

            $this->update([
                'saldo_atual'     => $saldoRestaurado,
                'valor_fixo'      => $saldoRestaurado,
                'status'          => $novoStatus,
                'ativo'           => $novoStatus === self::STATUS_ATIVO,
                'motivo_bloqueio' => null,
                'bloqueado_em'    => null,
            ]);

            $this->registrarHistorico(
                'desbloqueio',
                $saldoRestaurado,
                $saldoAnterior,
                $saldoRestaurado,
                $this->pedido_origem_id,
                $adminUserId,
                $observacao ?: 'Vale-compra desbloqueado e saldo restaurado pelo administrador.'
            );

            return;
        }

        $esgotado = $this->limite_usos !== null && (int) $this->usos_atuais >= (int) $this->limite_usos;
        $novoStatus = $this->estaExpirado()
            ? self::STATUS_EXPIRADO
            : ($esgotado ? self::STATUS_ESGOTADO : self::STATUS_ATIVO);

        $this->update([
            'status'          => $novoStatus,
            'ativo'           => $novoStatus === self::STATUS_ATIVO,
            'motivo_bloqueio' => null,
            'bloqueado_em'    => null,
        ]);

        $this->registrarHistorico(
            'desbloqueio',
            0.0,
            null,
            null,
            $this->pedido_origem_id,
            $adminUserId,
            $observacao ?: 'Cupom desbloqueado pelo administrador.'
        );
    }
}
