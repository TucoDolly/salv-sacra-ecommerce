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
     * Lista todos os produtos com suas relações (categoria, devoção e variações).
     */
    public function index(): JsonResponse
    {
        $produtos = Produto::with(['categoria', 'devocao', 'variacoes'])->get();

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
            'disponivel'   => ['boolean'],
            'colecao'      => ['nullable', 'string', 'max:255'],
            'categoria_id' => ['nullable', 'integer', 'exists:categorias,id'],
            'devocao_id'   => ['nullable', 'integer', 'exists:devocaos,id'],

            // Variações
            'variacoes'            => ['nullable', 'array'],
            'variacoes.*.tamanho'  => ['required_with:variacoes', 'string', 'max:50'],
            'variacoes.*.cor'      => ['required_with:variacoes', 'string', 'max:100'],
            'variacoes.*.estoque'  => ['required_with:variacoes', 'integer', 'min:0'],
        ]);

        $produto = DB::transaction(function () use ($validated) {
            $produto = Produto::create(collect($validated)->except('variacoes')->toArray());

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
            'disponivel'   => ['boolean'],
            'colecao'      => ['nullable', 'string', 'max:255'],
            'categoria_id' => ['nullable', 'integer', 'exists:categorias,id'],
            'devocao_id'   => ['nullable', 'integer', 'exists:devocaos,id'],

            // Variações
            'variacoes'            => ['nullable', 'array'],
            'variacoes.*.tamanho'  => ['required_with:variacoes', 'string', 'max:50'],
            'variacoes.*.cor'      => ['required_with:variacoes', 'string', 'max:100'],
            'variacoes.*.estoque'  => ['required_with:variacoes', 'integer', 'min:0'],
        ]);

        $produto = DB::transaction(function () use ($validated, $produto) {
            $produto->update(collect($validated)->except('variacoes')->toArray());

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
