<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Cartao extends Model
{
    protected $table = 'cartoes';

    protected $fillable = [
        'user_id',
        'tipo',
        'titular',
        'numero',
        'ultimos_digitos',
        'bandeira',
        'validade',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
