<?php

namespace App\Http\Controllers;

use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProdutoController extends Controller
{
    // ─── GET /api/produtos ───────────────────────────────────────────────────
    /**
     * Lista todos os produtos com suas relações (categoria, devoção e variações),
     * aceitando filtros por busca, categoria_id, colecao e ordenação.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Produto::with(['categoria', 'devocao', 'variacoes']);

        // Filtro por termo de busca
        if ($request->filled('busca')) {
            $termo = $request->input('busca');
            $query->where(function ($q) use ($termo) {
                $q->where('nome', 'like', "%{$termo}%")
                  ->orWhere('descricao', 'like', "%{$termo}%")
                  ->orWhereHas('devocao', function ($d) use ($termo) {
                      $d->where('nome', 'like', "%{$termo}%");
                  })
                  ->orWhereHas('categoria', function ($c) use ($termo) {
                      $c->where('nome', 'like', "%{$termo}%");
                  });
            });
        }

        // Filtro por categoria (slug ou ID)
        if ($request->filled('categoria')) {
            $cat = $request->input('categoria');
            $query->whereHas('categoria', function ($c) use ($cat) {
                $c->where('nome', 'ilike', "%{$cat}%");
                if (is_numeric($cat)) {
                    $c->orWhere('id', (int) $cat);
                }
            });
        }

        // Filtro por coleção
        if ($request->filled('colecao')) {
            $col = strtolower(trim($request->input('colecao')));
            $query->where(function ($q) use ($col) {
                if (str_contains($col, 'regular')) {
                    $q->where('colecao', 'ilike', '%regular%')
                      ->orWhere('colecao', 'ilike', '%ambos%')
                      ->orWhere('modelo', 'ilike', '%regular%')
                      ->orWhere('modelo', 'ilike', '%ambos%');
                } elseif (str_contains($col, 'over')) {
                    $q->where('colecao', 'ilike', '%over%')
                      ->orWhere('colecao', 'ilike', '%ambos%')
                      ->orWhere('modelo', 'ilike', '%over%')
                      ->orWhere('modelo', 'ilike', '%ambos%');
                } else {
                    $q->where('colecao', 'ilike', "%{$col}%")
                      ->orWhere('modelo', 'ilike', "%{$col}%")
                      ->orWhere('modelo', 'ilike', '%ambos%');
                }
            });
        }

        // Filtro explícito por modelo (ex: 'regular-fit', 'oversized')
        if ($request->filled('modelo')) {
            $mod = strtolower(trim($request->input('modelo')));
            $query->where(function ($q) use ($mod) {
                if (str_contains($mod, 'regular')) {
                    $q->where('modelo', 'ilike', '%regular%')
                      ->orWhere('modelo', 'ilike', '%ambos%')
                      ->orWhere('colecao', 'ilike', '%regular%')
                      ->orWhere('colecao', 'ilike', '%ambos%');
                } elseif (str_contains($mod, 'over')) {
                    $q->where('modelo', 'ilike', '%over%')
                      ->orWhere('modelo', 'ilike', '%ambos%')
                      ->orWhere('colecao', 'ilike', '%over%')
                      ->orWhere('colecao', 'ilike', '%ambos%');
                } else {
                    $q->where('modelo', 'ilike', "%{$mod}%")
                      ->orWhere('modelo', 'ilike', '%ambos%');
                }
            });
        }

        // Filtro explícito por devoção (id ou nome)
        if ($request->filled('devocao')) {
            $dev = $request->input('devocao');
            $query->whereHas('devocao', function ($d) use ($dev) {
                $d->where('nome', 'ilike', "%{$dev}%");
                if (is_numeric($dev)) {
                    $d->orWhere('id', (int) $dev);
                }
            });
        }

        $produtos = $query->get();

        return response()->json($produtos);
    }

    // ─── POST /api/produtos ──────────────────────────────────────────────────
    /**
     * Cria um novo produto junto com suas variações em uma única transação atômica.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // Produto
            'nome'         => ['required', 'string', 'max:255'],
            'descricao'    => ['nullable', 'string'],
            'preco_base'   => ['required', 'numeric', 'min:0'],
            'imagem_url'   => ['nullable', 'url', 'max:2048'],
            'imagens'      => ['nullable', 'array'],
            'imagens.*'    => ['nullable', 'url', 'max:2048'],
            'disponivel'   => ['boolean'],
            'colecao'      => ['nullable', 'string', 'max:255'],
            'modelo'       => ['nullable', 'string', 'max:255'],
            'categoria_id' => ['nullable', 'integer', 'exists:categorias,id'],
            'devocao_id'   => ['nullable', 'integer', 'exists:devocaos,id'],

            // Variações
            'variacoes'            => ['nullable', 'array'],
            'variacoes.*.tamanho'  => ['required_with:variacoes', 'string', 'max:50'],
            'variacoes.*.cor'      => ['required_with:variacoes', 'string', 'max:100'],
            'variacoes.*.estoque'  => ['required_with:variacoes', 'integer', 'min:0'],
        ]);

        $produto = DB::transaction(function () use ($validated, $request) {
            $dadosProduto = collect($validated)->except('variacoes')->toArray();
            
            // Se imagens vieram, filtra URLs vazias
            if (isset($dadosProduto['imagens']) && is_array($dadosProduto['imagens'])) {
                $dadosProduto['imagens'] = array_values(array_filter($dadosProduto['imagens'], fn($u) => !empty(trim($u))));
                if (empty($dadosProduto['imagem_url']) && !empty($dadosProduto['imagens'])) {
                    $dadosProduto['imagem_url'] = $dadosProduto['imagens'][0];
                }
            } elseif (!empty($dadosProduto['imagem_url'])) {
                $dadosProduto['imagens'] = [$dadosProduto['imagem_url']];
            }

            $produto = Produto::create($dadosProduto);

            if (!empty($validated['variacoes'])) {
                $produto->variacoes()->createMany($validated['variacoes']);
            }

            return $produto;
        });

        return response()->json(
            $produto->load(['categoria', 'devocao', 'variacoes']),
            201
        );
    }

    // ─── GET /api/produtos/{produto} ─────────────────────────────────────────
    /**
     * Exibe um produto específico com toda a árvore de dados.
     */
    public function show(Produto $produto): JsonResponse
    {
        return response()->json(
            $produto->load(['categoria', 'devocao', 'variacoes'])
        );
    }

    // ─── PUT/PATCH /api/produtos/{produto} ───────────────────────────────────
    /**
     * Atualiza um produto e sincroniza as suas variações.
     *
     * Estratégia de sincronização:
     *   - Se `variacoes` vier no request (mesmo vazio), substitui integralmente
     *     (deleta as antigas e insere as novas) para garantir consistência.
     *   - Se `variacoes` NÃO vier no request, mantém as variações atuais.
     */
    public function update(Request $request, Produto $produto): JsonResponse
    {
        $validated = $request->validate([
            // Produto
            'nome'         => ['sometimes', 'string', 'max:255'],
            'descricao'    => ['nullable', 'string'],
            'preco_base'   => ['sometimes', 'numeric', 'min:0'],
            'imagem_url'   => ['nullable', 'url', 'max:2048'],
            'imagens'      => ['nullable', 'array'],
            'imagens.*'    => ['nullable', 'url', 'max:2048'],
            'disponivel'   => ['boolean'],
            'colecao'      => ['nullable', 'string', 'max:255'],
            'modelo'       => ['nullable', 'string', 'max:255'],
            'categoria_id' => ['nullable', 'integer', 'exists:categorias,id'],
            'devocao_id'   => ['nullable', 'integer', 'exists:devocaos,id'],

            // Variações
            'variacoes'            => ['nullable', 'array'],
            'variacoes.*.tamanho'  => ['required_with:variacoes', 'string', 'max:50'],
            'variacoes.*.cor'      => ['required_with:variacoes', 'string', 'max:100'],
            'variacoes.*.estoque'  => ['required_with:variacoes', 'integer', 'min:0'],
        ]);

        $produto = DB::transaction(function () use ($validated, $produto) {
            $dadosProduto = collect($validated)->except('variacoes')->toArray();

            if (array_key_exists('imagens', $dadosProduto) && is_array($dadosProduto['imagens'])) {
                $dadosProduto['imagens'] = array_values(array_filter($dadosProduto['imagens'], fn($u) => !empty(trim($u))));
                if (empty($dadosProduto['imagem_url']) && !empty($dadosProduto['imagens'])) {
                    $dadosProduto['imagem_url'] = $dadosProduto['imagens'][0];
                }
            }

            $produto->update($dadosProduto);

            // Sincroniza variações somente se a chave foi enviada no payload
            if (array_key_exists('variacoes', $validated)) {
                $produto->variacoes()->delete();

                if (!empty($validated['variacoes'])) {
                    $produto->variacoes()->createMany($validated['variacoes']);
                }
            }

            return $produto;
        });

        return response()->json(
            $produto->load(['categoria', 'devocao', 'variacoes'])
        );
    }

    // ─── DELETE /api/produtos/{produto} ──────────────────────────────────────
    /**
     * Remove um produto e suas variações (via cascade na migration ou exclusão manual).
     */
    public function destroy(Produto $produto): JsonResponse
    {
        DB::transaction(function () use ($produto) {
            $produto->variacoes()->delete();
            $produto->delete();
        });

        return response()->json(null, 204);
    }
}
