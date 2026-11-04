<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Variacao extends Model
{
    protected $fillable = [
        'produto_id',
        'modelo',
        'tamanho',
        'cor',
        'estoque',
    ];

    protected $casts = [
        'estoque' => 'integer',
    ];

    // ─── Eventos ─────────────────────────────────────────────────────────

    protected static function booted(): void
    {
        // Quando uma variação passa a ter estoque > 0 (criada ou atualizada),
        // avisa por e-mail os clientes que solicitaram reposição desta peça.
        static::saved(function (Variacao $variacao) {
            if ((int) $variacao->estoque > 0) {
                \App\Services\AvisoEstoqueService::processarReposicao($variacao);
            }
        });
    }

    // ─── Relações ────────────────────────────────────────────────────────────

    public function produto(): BelongsTo
    {
        return $this->belongsTo(Produto::class);
    }
}
