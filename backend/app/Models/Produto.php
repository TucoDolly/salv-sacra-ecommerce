<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Produto extends Model
{
    protected $fillable = [
        'nome',
        'descricao',
        'preco_base',
        'imagem_url',
        'disponivel',
        'colecao',
        'categoria_id',
        'devocao_id',
    ];

    protected $casts = [
        'preco_base' => 'decimal:2',
        'disponivel'  => 'boolean',
    ];

    // ─── Relações ────────────────────────────────────────────────────────────

    public function variacoes(): HasMany
    {
        return $this->hasMany(Variacao::class);
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class);
    }

    public function devocao(): BelongsTo
    {
        return $this->belongsTo(Devocao::class);
    }
}
