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

        // Filtro por termo de busca (nome do produto, modelo, categoria, devoção ou variação)
        if ($request->filled('busca')) {
            $busca = trim((string) $request->input('busca'));
            $driver = \Illuminate\Support\Facades\DB::getDriverName();
            $likeOp = $driver === 'pgsql' ? 'ILIKE' : 'like';

            $query->where(function ($q) use ($busca, $likeOp) {
                $q->where('nome', $likeOp, "%{$busca}%")
                  ->orWhere('modelo', $likeOp, "%{$busca}%")
                  ->orWhereHas('categoria', function ($c) use ($busca, $likeOp) {
                      $c->where('nome', $likeOp, "%{$busca}%");
                  })
                  ->orWhereHas('devocao', function ($d) use ($busca, $likeOp) {
                      $d->where('nome', $likeOp, "%{$busca}%");
                  })
                  ->orWhereHas('variacoes', function ($v) use ($busca, $likeOp) {
                      $v->where('tamanho', $likeOp, "%{$busca}%")
                        ->orWhere('cor', $likeOp, "%{$busca}%");
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

        // Se o usuário buscou e a busca contém termos sem acento para textos acentuados (ou vice-versa),
        // complementa com busca normalizada (Str::ascii) caso o banco não suporte unaccent nativo
        if ($request->filled('busca')) {
            $buscaAscii = strtolower(\Illuminate\Support\Str::ascii($request->input('busca')));
            if ($buscaAscii !== '') {
                $todosParaChecar = Produto::with(['categoria', 'devocao', 'variacoes'])->get();
                $extras = $todosParaChecar->filter(function ($p) use ($buscaAscii) {
                    $nomeAscii = strtolower(\Illuminate\Support\Str::ascii($p->nome ?? ''));
                    $catAscii  = strtolower(\Illuminate\Support\Str::ascii($p->categoria?->nome ?? ''));
                    $devAscii  = strtolower(\Illuminate\Support\Str::ascii($p->devocao?->nome ?? ''));
                    $modAscii  = strtolower(\Illuminate\Support\Str::ascii($p->modelo ?? ''));
                    if (str_contains($nomeAscii, $buscaAscii) ||
                        str_contains($catAscii, $buscaAscii) ||
                        str_contains($devAscii, $buscaAscii) ||
                        str_contains($modAscii, $buscaAscii)) {
                        return true;
                    }
                    foreach ($p->variacoes as $v) {
                        $corAscii = strtolower(\Illuminate\Support\Str::ascii($v->cor ?? ''));
                        $tamAscii = strtolower(\Illuminate\Support\Str::ascii($v->tamanho ?? ''));
                        if (str_contains($corAscii, $buscaAscii) || str_contains($tamAscii, $buscaAscii)) {
                            return true;
                        }
                    }
                    return false;
                });
                $produtos = $produtos->merge($extras)->unique('id')->sortBy('nome')->values();
            }
        }

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

        if ($variacao->estoque > 0) {
            \App\Services\AvisoEstoqueService::processarReposicao($variacao);
        }

        return response()->json([
            'message'  => 'Estoque atualizado com sucesso.',
            'variacao' => $variacao,
        ]);
    }
}
