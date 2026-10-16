<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemPedido extends Model
{
    protected $table = 'item_pedidos';

    protected $fillable = [
        'pedido_id',
        'variacao_produto_id',
        'quantidade',
        'preco_unitario',
    ];

    protected $casts = [
        'preco_unitario' => 'decimal:2',
        'quantidade' => 'integer',
    ];

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function variacao(): BelongsTo
    {
        return $this->belongsTo(Variacao::class, 'variacao_produto_id');
    }
}
