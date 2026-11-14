<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CupomHistorico extends Model
{
    protected $table = 'cupom_historicos';

    protected $fillable = [
        'cupom_id',
        'pedido_id',
        'user_id',
        'tipo_evento',
        'valor',
        'saldo_anterior',
        'saldo_novo',
        'descricao',
    ];

    protected $casts = [
        'valor'          => 'decimal:2',
        'saldo_anterior' => 'decimal:2',
        'saldo_novo'     => 'decimal:2',
    ];

    public function cupom(): BelongsTo
    {
        return $this->belongsTo(Cupom::class, 'cupom_id');
    }

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class, 'pedido_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id')->withTrashed();
    }
}
