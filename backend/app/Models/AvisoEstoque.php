<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AvisoEstoque extends Model
{
    protected $table = 'avisos_estoque';

    protected $fillable = [
        'user_id',
        'produto_id',
        'tamanho',
        'cor',
        'modelo',
        'variacao_id',
        'notificado_em',
    ];

    protected $casts = [
        'notificado_em' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }

    public function variacao(): BelongsTo
    {
        return $this->belongsTo(Variacao::class);
    }
}
