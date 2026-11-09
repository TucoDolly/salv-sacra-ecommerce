<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notificacao extends Model
{
    protected $table = 'notificacoes';

    protected $fillable = [
        'user_id',
        'tipo',
        'categoria',
        'referencia_id',
        'titulo',
        'mensagem',
        'link',
        'lida',
        'data_leitura',
    ];

    protected $casts = [
        'lida'         => 'boolean',
        'data_leitura' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }
}

