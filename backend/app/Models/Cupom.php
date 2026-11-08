<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Cupom extends Model
{
    protected $table = 'cupons';

    protected $fillable = ['codigo', 'descricao', 'percentual', 'valor_fixo', 'tipo', 'todos_produtos', 'ativo'];

    protected $casts = [
        'percentual'     => 'float',
        'valor_fixo'     => 'decimal:2',
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
        $idsPermitidos = ($this->todos_produtos ?? true) ? null : $this->produtos()->pluck('produtos.id')->all();

        $itensValidos = collect($itens)->filter(
            fn ($i) => $idsPermitidos === null || in_array((int) $i['produto_id'], $idsPermitidos, true)
        );

        if ($itensValidos->isEmpty()) {
            return 0.0;
        }

        if ($this->tipo === 'frete') {
            $pct = min(100, max(0, $this->percentual)) / 100;
            return round($frete * $pct, 2);
        }

        $base = $itensValidos->sum(fn ($i) => (float) $i['preco'] * (int) $i['quantidade']);

        // Se o cupom tiver valor fixo (ex: Vale-Compras de Troca/Devolução)
        if (!empty($this->valor_fixo) && (float) $this->valor_fixo > 0) {
            return round(min($base, (float) $this->valor_fixo), 2);
        }

        $pct = min(100, max(0, $this->percentual)) / 100;
        return round($base * $pct, 2);
    }
}
