<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Cupom extends Model
{
    protected $table = 'cupons';

    protected $fillable = ['codigo', 'descricao', 'percentual', 'tipo', 'todos_produtos', 'ativo'];

    protected $casts = [
        'percentual'     => 'float',
        'todos_produtos' => 'boolean',
        'ativo'          => 'boolean',
    ];

    public function produtos(): BelongsToMany
    {
        return $this->belongsToMany(Produto::class, 'cupom_produto', 'cupom_id', 'produto_id');
    }

    /**
     * Calcula o desconto do cupom para os itens [produto_id, preco, quantidade] e o frete informado.
     */
    public function calcularDesconto(array $itens, float $frete): float
    {
        $pct = min(100, max(0, $this->percentual)) / 100;
        $idsPermitidos = ($this->todos_produtos ?? true) ? null : $this->produtos()->pluck('produtos.id')->all();

        $itensValidos = collect($itens)->filter(
            fn ($i) => $idsPermitidos === null || in_array((int) $i['produto_id'], $idsPermitidos, true)
        );

        if ($itensValidos->isEmpty()) {
            return 0.0;
        }

        if ($this->tipo === 'frete') {
            return round($frete * $pct, 2);
        }

        $base = $itensValidos->sum(fn ($i) => (float) $i['preco'] * (int) $i['quantidade']);
        return round($base * $pct, 2);
    }
}
