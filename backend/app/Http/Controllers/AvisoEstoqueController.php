<?php

namespace App\Http\Controllers;

use App\Models\AvisoEstoque;
use App\Models\Produto;
use App\Models\Variacao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AvisoEstoqueController extends Controller
{
    /**
     * Lista avisos de reposição ativos do usuário logado (opcionalmente filtrados por produto).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = AvisoEstoque::where('user_id', $user->id)
            ->whereNull('notificado_em');

        if ($request->filled('produto_id')) {
            $query->where('produto_id', $request->input('produto_id'));
        }

        $avisos = $query->get(['id', 'produto_id', 'tamanho', 'cor', 'modelo', 'created_at']);

        return response()->json([
            'avisos' => $avisos,
        ]);
    }

    /**
     * Alterna (liga/desliga) o aviso de reposição para um produto e tamanho/cor/modelo.
     */
    public function toggle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'produto_id' => 'required|exists:produtos,id',
            'tamanho'    => 'required|string|max:50',
            'cor'        => 'nullable|string|max:100',
            'modelo'     => 'nullable|string|max:100',
        ]);

        $user = $request->user();
        $produtoId = (int) $validated['produto_id'];
        $tamanho = trim($validated['tamanho']);
        $cor = !empty($validated['cor']) ? trim($validated['cor']) : null;
        $modelo = !empty($validated['modelo']) ? trim($validated['modelo']) : null;

        // Procura aviso ativo existente
        $queryExistente = AvisoEstoque::where('user_id', $user->id)
            ->where('produto_id', $produtoId)
            ->whereNull('notificado_em')
            ->whereRaw('UPPER(TRIM(tamanho)) = ?', [strtoupper($tamanho)]);

        if ($cor !== null) {
            $queryExistente->whereRaw('LOWER(TRIM(cor)) = ?', [strtolower($cor)]);
        } else {
            $queryExistente->whereNull('cor');
        }

        if ($modelo !== null) {
            $queryExistente->whereRaw('LOWER(TRIM(modelo)) = ?', [strtolower($modelo)]);
        } else {
            $queryExistente->whereNull('modelo');
        }

        $existente = $queryExistente->first();

        if ($existente) {
            $existente->delete();
            return response()->json([
                'ativo'   => false,
                'message' => 'Aviso de reposição cancelado.',
            ]);
        }

        // Verifica se já tem estoque disponível para essa variação
        $queryVar = Variacao::where('produto_id', $produtoId)
            ->whereRaw('UPPER(TRIM(tamanho)) = ?', [strtoupper($tamanho)]);

        if ($cor !== null) {
            $queryVar->whereRaw('LOWER(TRIM(cor)) = ?', [strtolower($cor)]);
        }
        if ($modelo !== null) {
            $queryVar->whereRaw('LOWER(TRIM(modelo)) = ?', [strtolower($modelo)]);
        }

        $variacaoEncontrada = $queryVar->first();
        if ($variacaoEncontrada && $variacaoEncontrada->estoque > 0) {
            return response()->json([
                'message' => 'Esta peça já está disponível no estoque.',
            ], 422);
        }

        AvisoEstoque::create([
            'user_id'     => $user->id,
            'produto_id'  => $produtoId,
            'tamanho'     => $tamanho,
            'cor'         => $cor,
            'modelo'      => $modelo,
            'variacao_id' => $variacaoEncontrada?->id,
        ]);

        return response()->json([
            'ativo'   => true,
            'message' => "Combinado! Enviaremos um e-mail para {$user->email} assim que esta peça voltar ao estoque.",
        ], 201);
    }
}
