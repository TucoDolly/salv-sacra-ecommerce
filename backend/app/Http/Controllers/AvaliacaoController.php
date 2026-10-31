<?php

namespace App\Http\Controllers;

use App\Models\Avaliacao;
use App\Models\ItemPedido;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvaliacaoController extends Controller
{
    /**
     * Lista as avaliações de um produto específico com resumo de notas (média e distribuição).
     */
    public function index(Produto $produto): JsonResponse
    {
        $avaliacoes = $produto->avaliacoes()
            ->with(['user:id,name,deleted_at'])
            ->latest()
            ->get()
            ->map(function (Avaliacao $av) {
                $nomeAutor = $av->user
                    ? trim(preg_replace('/\s*\(Conta Desativada\)/i', '', $av->user->name))
                    : 'Cliente';

                return [
                    'id'                => $av->id,
                    'produto_id'        => $av->produto_id,
                    'user_id'           => $av->user_id,
                    'autor_nome'        => $nomeAutor,
                    'nota'              => (int) $av->nota,
                    'titulo'            => $av->titulo,
                    'comentario'        => $av->comentario,
                    'compra_verificada' => (bool) $av->compra_verificada,
                    'created_at'        => $av->created_at?->toIso8601String(),
                ];
            });

        $total = $avaliacoes->count();
        $media = $total > 0 ? round($avaliacoes->avg('nota'), 1) : 0;

        $distribuicao = [
            5 => $avaliacoes->where('nota', 5)->count(),
            4 => $avaliacoes->where('nota', 4)->count(),
            3 => $avaliacoes->where('nota', 3)->count(),
            2 => $avaliacoes->where('nota', 2)->count(),
            1 => $avaliacoes->where('nota', 1)->count(),
        ];

        return response()->json([
            'media'        => $media,
            'total'        => $total,
            'distribuicao' => $distribuicao,
            'avaliacoes'   => $avaliacoes->values(),
        ]);
    }

    /**
     * Registra ou atualiza a avaliação do cliente autenticado para um produto.
     */
    public function store(Request $request, Produto $produto): JsonResponse
    {
        $validated = $request->validate([
            'nota'       => ['required', 'integer', 'min:1', 'max:5'],
            'titulo'     => ['nullable', 'string', 'max:120'],
            'comentario' => ['required', 'string', 'min:3', 'max:1500'],
        ], [
            'nota.required'       => 'Selecione uma nota de 1 a 5 estrelas.',
            'comentario.required' => 'Escreva um breve comentário sobre o produto.',
            'comentario.min'      => 'O comentário deve ter pelo menos 3 caracteres.',
        ]);

        $user = $request->user();

        // Verifica se o cliente já comprou este produto em um pedido pago/enviado/entregue
        $comprou = ItemPedido::whereHas('variacao', function ($q) use ($produto) {
                $q->where('produto_id', $produto->id);
            })
            ->whereHas('pedido', function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->whereIn('status', ['Pago', 'Enviado', 'Entregue']);
            })
            ->exists();

        $avaliacao = Avaliacao::updateOrCreate(
            [
                'produto_id' => $produto->id,
                'user_id'    => $user->id,
            ],
            [
                'nota'              => $validated['nota'],
                'titulo'            => $validated['titulo'] ?? null,
                'comentario'        => $validated['comentario'],
                'compra_verificada' => $comprou,
            ]
        );

        return response()->json([
            'message'   => 'Avaliação publicada com sucesso!',
            'avaliacao' => [
                'id'                => $avaliacao->id,
                'produto_id'        => $avaliacao->produto_id,
                'user_id'           => $avaliacao->user_id,
                'autor_nome'        => $user->name,
                'nota'              => (int) $avaliacao->nota,
                'titulo'            => $avaliacao->titulo,
                'comentario'        => $avaliacao->comentario,
                'compra_verificada' => (bool) $avaliacao->compra_verificada,
                'created_at'        => $avaliacao->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    /**
     * Permite ao próprio autor ou a um administrador excluir uma avaliação.
     */
    public function destroy(Request $request, Avaliacao $avaliacao): JsonResponse
    {
        $user = $request->user();

        if ($user->papel !== 'admin' && $avaliacao->user_id !== $user->id) {
            return response()->json(['message' => 'Acesso negado.'], 403);
        }

        $avaliacao->delete();

        return response()->json(['message' => 'Avaliação removida com sucesso.']);
    }

    /**
     * Lista todas as avaliações da loja para moderação no painel administrativo.
     */
    public function adminIndex(): JsonResponse
    {
        $avaliacoes = Avaliacao::with([
            'produto:id,nome,imagem_url,imagens_vitrine',
            'user:id,name,email,deleted_at',
        ])
            ->latest()
            ->get()
            ->map(function (Avaliacao $av) {
                return [
                    'id'                => $av->id,
                    'produto_id'        => $av->produto_id,
                    'produto_nome'      => $av->produto?->nome ?? 'Produto removido',
                    'produto_imagem'    => $av->produto?->imagens_vitrine[0] ?? $av->produto?->imagem_url ?? null,
                    'user_id'           => $av->user_id,
                    'autor_nome'        => $av->user?->name ?? 'Cliente',
                    'autor_email'       => $av->user?->email ?? '',
                    'nota'              => (int) $av->nota,
                    'titulo'            => $av->titulo,
                    'comentario'        => $av->comentario,
                    'compra_verificada' => (bool) $av->compra_verificada,
                    'created_at'        => $av->created_at?->toIso8601String(),
                ];
            });

        return response()->json($avaliacoes);
    }
}

