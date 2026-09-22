<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Devocao extends Model
{
    protected $fillable = ['nome'];

    // ─── Relações ────────────────────────────────────────────────────────────

    public function produtos(): HasMany
    {
        return $this->hasMany(Produto::class);
    }
}
