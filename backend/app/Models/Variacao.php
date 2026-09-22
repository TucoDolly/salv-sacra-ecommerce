<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Variacao extends Model
{
    protected $fillable = [
        'produto_id',
        'tamanho',
        'cor',
        'estoque',
    ];

    protected $casts = [
        'estoque' => 'integer',
    ];

    // ─── Relações ────────────────────────────────────────────────────────────

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }
}
