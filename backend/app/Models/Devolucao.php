<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Devolucao extends Model
{
    protected $table = 'devolucoes';

    protected $fillable = [
        'pedido_id',
        'user_id',
        'status',
        'tipo_solicitacao',
        'motivo',
        'descricao',
        'itens_devolvidos',
        'fotos',
        'declaracao_conteudo_path',
        'declaracao_conteudo_url',
        'declaracao_conteudo_nome',
        'codigo_postagem_reversa',
        'prazo_postagem',
        'instrucoes_admin',
        'motivo_recusa',
        'valor_estorno',
        'cupom_gerado_codigo',
        'data_aprovacao',
        'data_conclusao',
    ];

    protected $casts = [
        'itens_devolvidos' => 'array',
        'fotos'            => 'array',
        'valor_estorno'    => 'decimal:2',
        'data_aprovacao'   => 'datetime',
        'data_conclusao'   => 'datetime',
    ];

    public function pedido(): BelongsTo
    {
        return $this->belongsTo(Pedido::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }
}

