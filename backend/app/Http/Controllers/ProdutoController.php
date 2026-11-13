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
        $query = Produto::with(['categoria', 'devocao', 'variacoes'])
            ->withCount('avaliacoes')
            ->withAvg('avaliacoes', 'nota')
            ->withCount(['itemPedidos as vendas_count' => function ($q) {
                $q->whereHas('pedido', function ($pq) {
                    $pq->whereIn('status', ['Pago', 'Em separação', 'Em montagem', 'Enviado', 'Em transporte', 'Entregue']);
                });
            }]);

        // Filtro por termo de busca
        if ($request->filled('busca')) {
            $termo = $request->input('busca');
            $query->where(function ($q) use ($termo) {
                $q->where('nome', 'like', "%{$termo}%")
                  ->orWhere('descricao', 'like', "%{$termo}%")
                  ->orWhere('colecao', 'like', "%{$termo}%")
                  ->orWhere('modelo', 'like', "%{$termo}%")
                  ->orWhereHas('devocao', function ($d) use ($termo) {
                      $d->where('nome', 'like', "%{$termo}%");
                  })
                  ->orWhereHas('categoria', function ($c) use ($termo) {
                      $c->where('nome', 'like', "%{$termo}%");
                  })
                  ->orWhereHas('variacoes', function ($v) use ($termo) {
                      $v->where('cor', 'like', "%{$termo}%")
                        ->orWhere('modelo', 'like', "%{$termo}%")
                        ->orWhere('tamanho', 'like', "%{$termo}%");
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
            'imagem_url'        => ['nullable', 'string', 'max:2048'],
            'imagens'           => ['nullable', 'array'],
            'imagens.*'         => ['nullable'],
            'imagens_vitrine'   => ['nullable', 'array'],
            'imagens_vitrine.*' => ['nullable', 'string', 'max:2048'],
            'cores_config'      => ['nullable', 'array'],
            'disponivel'        => ['boolean'],
            'colecao'           => ['nullable', 'string', 'max:255'],
            'modelo'            => ['nullable', 'string', 'max:255'],
            'categoria_id'      => ['nullable', 'integer', 'exists:categorias,id'],
            'devocao_id'        => ['nullable', 'integer', 'exists:devocaos,id'],

            // Variações
            'variacoes'            => ['nullable', 'array'],
            'variacoes.*.modelo'   => ['nullable', 'string', 'max:100'],
            'variacoes.*.tamanho'  => ['required_with:variacoes', 'string', 'max:50'],
            'variacoes.*.cor'      => ['required_with:variacoes', 'string', 'max:100'],
            'variacoes.*.estoque'  => ['required_with:variacoes', 'integer', 'min:0'],
        ]);

        $produto = DB::transaction(function () use ($validated, $request) {
            $dadosProduto = collect($validated)->except('variacoes')->toArray();

            if (isset($dadosProduto['imagens_vitrine']) && is_array($dadosProduto['imagens_vitrine'])) {
                $dadosProduto['imagens_vitrine'] = array_values(array_filter($dadosProduto['imagens_vitrine'], fn($u) => !empty(trim($u))));
            }
            
            // Se imagens vieram, filtra URLs vazias
            if (isset($dadosProduto['imagens']) && is_array($dadosProduto['imagens'])) {
                $dadosProduto['imagens'] = array_values(array_filter($dadosProduto['imagens'], function ($item) {
                    if (is_array($item)) return !empty(trim($item['url'] ?? ''));
                    return !empty(trim((string)$item));
                }));
                if (empty($dadosProduto['imagem_url'])) {
                    $primeira = $dadosProduto['imagens_vitrine'][0] ?? $dadosProduto['imagens'][0] ?? null;
                    $dadosProduto['imagem_url'] = is_array($primeira) ? ($primeira['url'] ?? null) : $primeira;
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
        $produto->load(['categoria', 'devocao', 'variacoes']);
        $produto->loadCount('avaliacoes');
        $produto->loadAvg('avaliacoes', 'nota');

        return response()->json($produto);
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
            'imagem_url'        => ['nullable', 'string', 'max:2048'],
            'imagens'           => ['nullable', 'array'],
            'imagens.*'         => ['nullable'],
            'imagens_vitrine'   => ['nullable', 'array'],
            'imagens_vitrine.*' => ['nullable', 'string', 'max:2048'],
            'cores_config'      => ['nullable', 'array'],
            'disponivel'        => ['boolean'],
            'colecao'           => ['nullable', 'string', 'max:255'],
            'modelo'            => ['nullable', 'string', 'max:255'],
            'categoria_id'      => ['nullable', 'integer', 'exists:categorias,id'],
            'devocao_id'        => ['nullable', 'integer', 'exists:devocaos,id'],

            // Variações
            'variacoes'            => ['nullable', 'array'],
            'variacoes.*.modelo'   => ['nullable', 'string', 'max:100'],
            'variacoes.*.tamanho'  => ['required_with:variacoes', 'string', 'max:50'],
            'variacoes.*.cor'      => ['required_with:variacoes', 'string', 'max:100'],
            'variacoes.*.estoque'  => ['required_with:variacoes', 'integer', 'min:0'],
        ]);

        $produto = DB::transaction(function () use ($validated, $produto) {
            $dadosProduto = collect($validated)->except('variacoes')->toArray();

            if (array_key_exists('imagens_vitrine', $dadosProduto) && is_array($dadosProduto['imagens_vitrine'])) {
                $dadosProduto['imagens_vitrine'] = array_values(array_filter($dadosProduto['imagens_vitrine'], fn($u) => !empty(trim($u))));
            }

            if (array_key_exists('imagens', $dadosProduto) && is_array($dadosProduto['imagens'])) {
                $dadosProduto['imagens'] = array_values(array_filter($dadosProduto['imagens'], function ($item) {
                    if (is_array($item)) return !empty(trim($item['url'] ?? ''));
                    return !empty(trim((string)$item));
                }));
                if (empty($dadosProduto['imagem_url'])) {
                    $primeira = $dadosProduto['imagens_vitrine'][0] ?? $dadosProduto['imagens'][0] ?? null;
                    $dadosProduto['imagem_url'] = is_array($primeira) ? ($primeira['url'] ?? null) : $primeira;
                }
            }

            $produto->update($dadosProduto);

            // Sincroniza variações somente se a chave foi enviada no payload
            if (array_key_exists('variacoes', $validated)) {
                $idsMantidos = [];
                foreach ($validated['variacoes'] ?? [] as $varData) {
                    $modeloVar = $varData['modelo'] ?? 'Regular Fit';
                    $existente = $produto->variacoes()
                        ->where('tamanho', $varData['tamanho'])
                        ->where('cor', $varData['cor'])
                        ->where(function ($q) use ($modeloVar) {
                            $q->where('modelo', $modeloVar)->orWhereNull('modelo');
                        })
                        ->first();

                    if ($existente) {
                        $existente->update([
                            'modelo'  => $modeloVar,
                            'tamanho' => $varData['tamanho'],
                            'cor'     => $varData['cor'],
                            'estoque' => $varData['estoque'],
                        ]);
                        $idsMantidos[] = $existente->id;
                    } else {
                        $nova = $produto->variacoes()->create([
                            'modelo'  => $modeloVar,
                            'tamanho' => $varData['tamanho'],
                            'cor'     => $varData['cor'],
                            'estoque' => $varData['estoque'],
                        ]);
                        $idsMantidos[] = $nova->id;
                    }
                }

                // Remove variações antigas que não estão mais na lista (desvinculando itens de pedido se necessário)
                $paraRemover = $produto->variacoes()->whereNotIn('id', $idsMantidos)->pluck('id')->all();
                if (!empty($paraRemover)) {
                    $idSubstituto = $idsMantidos[0] ?? null;
                    if ($idSubstituto) {
                        \App\Models\ItemPedido::whereIn('variacao_produto_id', $paraRemover)
                            ->update(['variacao_produto_id' => $idSubstituto]);
                    } else {
                        \App\Models\ItemPedido::whereIn('variacao_produto_id', $paraRemover)->delete();
                    }
                    $produto->variacoes()->whereIn('id', $paraRemover)->delete();
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

    /**
     * Valida os itens atuais do carrinho no cliente contra o estoque real em banco.
     * Retorna se cada item está disponível (estoque > 0) e a quantidade máxima permitida.
     */
    public function verificarEstoqueCarrinho(Request $request): JsonResponse
    {
        $itensSolicitados = $request->input('itens', []);
        if (!is_array($itensSolicitados) || empty($itensSolicitados)) {
            return response()->json(['itens' => []]);
        }

        $resultado = [];

        foreach ($itensSolicitados as $item) {
            $variacaoId = $item['variacao_id'] ?? null;
            $qtd = (int) ($item['quantidade'] ?? 1);

            if (! $variacaoId) {
                // Tenta achar pela combinação produto_id, tamanho e cor
                $prodId = $item['produto_id'] ?? $item['id'] ?? null;
                $tam = $item['tamanho'] ?? null;
                $cor = $item['cor'] ?? null;
                $variacao = null;
                if ($prodId) {
                    $q = \App\Models\Variacao::where('produto_id', $prodId);
                    if ($tam) $q->where('tamanho', $tam);
                    if ($cor) $q->where('cor', $cor);
                    $variacao = $q->first();
                }
            } else {
                $variacao = \App\Models\Variacao::find($variacaoId);
            }

            if (! $variacao) {
                $resultado[] = [
                    'variacao_id'       => $variacaoId,
                    'produto_id'        => $item['produto_id'] ?? $item['id'] ?? null,
                    'tamanho'           => $item['tamanho'] ?? null,
                    'cor'               => $item['cor'] ?? null,
                    'estoque_atual'     => 0,
                    'disponivel'        => false,
                    'quantidade_valida' => 0,
                    'mensagem'          => 'Produto ou variação não encontrado no catálogo.',
                ];
                continue;
            }

            $estoqueReal = max(0, (int) $variacao->estoque);
            $disponivel = $estoqueReal > 0;
            $quantidadeValida = min($qtd, $estoqueReal);

            $resultado[] = [
                'variacao_id'       => $variacao->id,
                'produto_id'        => $variacao->produto_id,
                'tamanho'           => $variacao->tamanho,
                'cor'               => $variacao->cor,
                'estoque_atual'     => $estoqueReal,
                'disponivel'        => $disponivel,
                'quantidade_valida' => $quantidadeValida,
                'ajustado'          => $qtd > $estoqueReal,
                'mensagem'          => ! $disponivel
                    ? 'Item esgotado no estoque.'
                    : ($qtd > $estoqueReal ? "Quantidade ajustada para {$estoqueReal} (limite disponível)." : null),
            ];
        }

        return response()->json([
            'itens' => $resultado,
        ]);
    }
}
