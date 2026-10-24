<?php

namespace App\Http\Controllers;

use App\Models\Produto;
use App\Models\Variacao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EstoqueController extends Controller
{
    /**
     * Lista produtos com suas variações para a gestão ágil de estoque.
     * Suporta busca por nome, categoria e filtro por nível de estoque (crítico, esgotado, etc.).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Produto::query();

        // Filtro por termo de busca (nome do produto ou categoria)
        if ($request->filled('busca')) {
            $busca = $request->input('busca');
            $query->where(function ($q) use ($busca) {
                $q->where('nome', 'like', "%{$busca}%")
                  ->orWhereHas('categoria', function ($c) use ($busca) {
                      $c->where('nome', 'like', "%{$busca}%");
                  });
            });
        }

        $filtro = $request->input('filtro');

        // Filtro por status de estoque
        if ($filtro === 'critico') {
            // Apenas variações com estoque <= 5 (e > 0)
            $query->whereHas('variacoes', function ($v) {
                $v->where('estoque', '<=', 5);
            })->with(['categoria', 'devocao', 'variacoes' => function ($v) {
                $v->where('estoque', '<=', 5);
            }]);
        } elseif ($filtro === 'esgotado') {
            // Apenas variações com estoque = 0
            $query->whereHas('variacoes', function ($v) {
                $v->where('estoque', 0);
            })->with(['categoria', 'devocao', 'variacoes' => function ($v) {
                $v->where('estoque', 0);
            }]);
        } elseif ($filtro === 'normal') {
            // Apenas variações com estoque > 5
            $query->whereHas('variacoes', function ($v) {
                $v->where('estoque', '>', 5);
            })->with(['categoria', 'devocao', 'variacoes' => function ($v) {
                $v->where('estoque', '>', 5);
            }]);
        } else {
            $query->with(['categoria', 'devocao', 'variacoes']);
        }

        $produtos = $query->orderBy('nome', 'asc')->get();

        // Totalizadores para os cards rápidos no topo da página
        $totalVariacoes = Variacao::count();
        $totalCriticos  = Variacao::where('estoque', '<=', 5)->count();
        $totalEsgotados = Variacao::where('estoque', 0)->count();
        $totalPecas     = (int) Variacao::sum('estoque');

        return response()->json([
            'produtos' => $produtos,
            'resumo'   => [
                'total_produtos'  => $produtos->count(),
                'total_variacoes' => $totalVariacoes,
                'total_criticos'  => $totalCriticos,
                'total_esgotados' => $totalEsgotados,
                'total_pecas'     => $totalPecas,
            ],
        ]);
    }

    /**
     * Atualização ágil e pontual do estoque de uma variação específica.
     */
    public function update(Request $request, Variacao $variacao): JsonResponse
    {
        $request->validate([
            'estoque' => 'required|integer|min:0',
        ]);

        $variacao->estoque = (int) $request->input('estoque');
        $variacao->save();

        return response()->json([
            'message'  => 'Estoque atualizado com sucesso.',
            'variacao' => $variacao,
        ]);
    }
}
