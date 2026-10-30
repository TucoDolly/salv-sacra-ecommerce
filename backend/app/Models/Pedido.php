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
        'observacoes',
        'cep',
        'logradouro',
        'numero',
        'complemento',
        'bairro',
        'cidade',
        'estado',
        'valor_frete',
        'valor_total',
    ];

    protected $casts = [
        'data_pedido' => 'datetime',
        'valor_frete' => 'decimal:2',
        'valor_total' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function itens(): HasMany
    {
        return $this->hasMany(ItemPedido::class);
    }
}
