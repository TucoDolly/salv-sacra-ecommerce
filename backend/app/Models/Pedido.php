<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pedido extends Model
{
    protected $fillable = [
        'user_id',
        'email_contato',
        'telefone',
        'data_pedido',
        'status',
        'metodo_pagamento',
        'pagamento_id',
        'pix_copia_e_cola',
        'pix_qr_code_base64',
        'tipo_frete',
        'codigo_rastreio',
        'melhor_envio_id',
        'observacoes',
        'cep',
        'logradouro',
        'numero',
        'complemento',
        'bairro',
        'cidade',
        'estado',
        'valor_frete',
        'valor_frete_pago',
        'valor_total',
        'valor_pago_dinheiro',
        'cupom_id',
        'cupom_codigo',
        'cupom_tipo',
        'valor_desconto_cupom',
        'valor_desconto_produto',
        'valor_desconto_frete',
        'vale_compra_id',
        'vale_compra_codigo',
        'valor_vale_compra',
        'beneficios_restaurados',
        'cartao_parcelas',
        'cartao_valor_parcela',
    ];

    protected $casts = [
        'data_pedido'            => 'datetime',
        'valor_frete'            => 'decimal:2',
        'valor_frete_pago'       => 'decimal:2',
        'valor_total'            => 'decimal:2',
        'valor_pago_dinheiro'    => 'decimal:2',
        'valor_desconto_cupom'   => 'decimal:2',
        'valor_desconto_produto' => 'decimal:2',
        'valor_desconto_frete'   => 'decimal:2',
        'valor_vale_compra'      => 'decimal:2',
        'beneficios_restaurados' => 'boolean',
        'cartao_parcelas'        => 'integer',
        'cartao_valor_parcela'   => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function itens(): HasMany
    {
        return $this->hasMany(ItemPedido::class);
    }

    public function devolucoes(): HasMany
    {
        return $this->hasMany(Devolucao::class);
    }

    public function devolucao()
    {
        return $this->hasOne(Devolucao::class)->latestOfMany();
    }

    public function cupom(): BelongsTo
    {
        return $this->belongsTo(Cupom::class, 'cupom_id');
    }

    public function valeCompra(): BelongsTo
    {
        return $this->belongsTo(Cupom::class, 'vale_compra_id');
    }

    protected static function booted(): void
    {
        static::creating(function (Pedido $pedido) {
            if (is_null($pedido->valor_frete_pago)) {
                $descontoFrete = (float) ($pedido->valor_desconto_frete ?? 0);
                $valorFrete = (float) ($pedido->valor_frete ?? 0);
                $pedido->valor_frete_pago = round(max(0.0, $valorFrete - $descontoFrete), 2);
            }

            if (is_null($pedido->valor_pago_dinheiro)) {
                $valorTotal = (float) ($pedido->valor_total ?? 0);
                $valorVale = (float) ($pedido->valor_vale_compra ?? 0);
                $pedido->valor_pago_dinheiro = round(max(0.0, $valorTotal - $valorVale), 2);
            }
        });
    }

    public function calcularOpcoesRestituicao(): array
    {
        $valorDinheiro = round(max(0.0, (float) ($this->valor_pago_dinheiro ?? 0)), 2);
        $valorFretePago = round(max(0.0, (float) ($this->valor_frete_pago ?? 0)), 2);
        $valorVale = round(max(0.0, (float) ($this->valor_vale_compra ?? 0)), 2);
        $valorDescontoCupom = round(max(0.0, (float) ($this->valor_desconto_cupom ?? 0)), 2);

        $permiteReembolsoDinheiro = $valorDinheiro > 0;
        $motivoBloqueioReembolso = null;

        if (! $permiteReembolsoDinheiro) {
            if ($valorVale > 0) {
                $motivoBloqueioReembolso = 'Este pedido foi pago integralmente com vale-compra (valor em dinheiro: R$ 0,00). O reembolso em dinheiro está indisponível; o saldo utilizado no vale-compra original será restaurado.';
            } else {
                $motivoBloqueioReembolso = 'Não houve pagamento em dinheiro neste pedido (valor pago em dinheiro: R$ 0,00). Apenas os benefícios promocionais elegíveis serão restaurados.';
            }
        }

        $cupomRestaurar = null;
        if ($this->cupom_id || $this->cupom_codigo) {
            $cupomModel = $this->relationLoaded('cupom') ? $this->cupom : $this->cupom()->first();
            $cupomRestaurar = [
                'id'             => $cupomModel?->id ?? $this->cupom_id,
                'codigo'         => $cupomModel?->codigo ?? $this->cupom_codigo,
                'tipo'           => $cupomModel?->tipo ?? $this->cupom_tipo ?? 'desconto',
                'valor_desconto' => $valorDescontoCupom,
            ];
        }

        $valeModel = null;
        if ($this->vale_compra_id || $this->vale_compra_codigo) {
            $valeModel = $this->relationLoaded('valeCompra') ? $this->valeCompra : $this->valeCompra()->first();
        }
        $valeCodigo = $valeModel?->codigo ?? $this->vale_compra_codigo;

        $valorNovoVale = round($valorDinheiro + $valorVale, 2);
        $parcelas = (int) ($this->cartao_parcelas ?? 1);
        $valorParcela = (float) ($this->cartao_valor_parcela ?? 0);
        $ehCartao = str_contains(strtolower((string) ($this->metodo_pagamento ?? '')), 'cartao') && $valorDinheiro > 0;

        return [
            'pedido_id'                  => $this->id,
            'permite_reembolso_dinheiro' => $permiteReembolsoDinheiro,
            'motivo_bloqueio_reembolso'  => $motivoBloqueioReembolso,
            'valor_pago_dinheiro'        => $valorDinheiro,
            'valor_frete_pago'           => $valorFretePago,
            'valor_vale_compra'          => $valorVale,
            'valor_desconto_cupom'       => $valorDescontoCupom,
            'beneficios_restaurados'     => (bool) $this->beneficios_restaurados,
            'opcao_reembolso'            => [
                'disponivel'               => $permiteReembolsoDinheiro,
                'valor_reembolso_dinheiro' => $valorDinheiro,
                'valor_vale_restaurar'     => $valorVale,
                'vale_codigo'              => $valeCodigo,
                'cupom_restaurar'          => $cupomRestaurar,
            ],
            'opcao_vale_compra'          => [
                'disponivel'             => $permiteReembolsoDinheiro && $valorNovoVale > 0,
                'valor_novo_vale'        => $permiteReembolsoDinheiro ? $valorNovoVale : 0.0,
                'restaura_vale_original' => ! $permiteReembolsoDinheiro && $valorVale > 0,
                'valor_vale_restaurar'   => ! $permiteReembolsoDinheiro ? $valorVale : 0.0,
                'vale_codigo'            => $valeCodigo,
                'cupom_restaurar'        => $cupomRestaurar,
            ],
            'parcelamento_cartao'        => [
                'aplicavel'     => $ehCartao,
                'parcelas'      => $ehCartao ? max(1, $parcelas) : null,
                'valor_parcela' => $ehCartao ? round($valorParcela > 0 ? $valorParcela : ($valorDinheiro / max(1, $parcelas)), 2) : null,
                'valor_total'   => $ehCartao ? $valorDinheiro : null,
            ],
        ];
    }

    public function historicosBeneficios(): HasMany
    {
        return $this->hasMany(CupomHistorico::class, 'pedido_id');
    }
}
