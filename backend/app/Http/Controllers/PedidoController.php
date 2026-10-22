<?php

namespace App\Http\Controllers;

use App\Models\ItemPedido;
use App\Models\Pedido;
use App\Models\Variacao;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PedidoController extends Controller
{
    /**
     * Criar um novo pedido com seus itens.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email_contato'      => ['required', 'email'],
            'telefone'           => ['nullable', 'string', 'max:30'],
            'cep'                => ['required', 'string', 'max:20'],
            'logradouro'         => ['required', 'string', 'max:255'],
            'numero'             => ['required', 'string', 'max:50'],
            'complemento'        => ['nullable', 'string', 'max:255'],
            'bairro'             => ['required', 'string', 'max:150'],
            'cidade'             => ['required', 'string', 'max:150'],
            'estado'             => ['required', 'string', 'max:2'],
            'tipo_frete'         => ['nullable', 'string', 'max:100'],
            'valor_frete'        => ['required', 'numeric', 'min:0'],
            'metodo_pagamento'   => ['required', 'in:cartao,pix,boleto'],
            'observacoes'        => ['nullable', 'string'],
            'itens'              => ['required', 'array', 'min:1'],
            'itens.*.variacao_id'=> ['nullable', 'integer', 'exists:variacaos,id'],
            'itens.*.produto_id' => ['required', 'integer', 'exists:produtos,id'],
            'itens.*.quantidade' => ['required', 'integer', 'min:1'],
            'itens.*.preco'      => ['required', 'numeric', 'min:0'],
        ]);

        // A rota exige auth:sanctum, então sempre há um usuário logado
        $userId = $request->user()->id;

        $pedido = DB::transaction(function () use ($validated, $userId) {
            $subtotal = collect($validated['itens'])->sum(function ($item) {
                return $item['preco'] * $item['quantidade'];
            });

            $valorTotal = $subtotal + $validated['valor_frete'];
            if ($validated['metodo_pagamento'] === 'pix' || $validated['metodo_pagamento'] === 'boleto') {
                $valorTotal = $valorTotal * 0.95; // 5% de desconto
            }

            $pedido = Pedido::create([
                'user_id'          => $userId,
                'email_contato'    => $validated['email_contato'],
                'telefone'         => $validated['telefone'],
                'data_pedido'      => now(),
                'status'           => 'Pendente',
                'metodo_pagamento' => $validated['metodo_pagamento'],
                'tipo_frete'       => $validated['tipo_frete'] ?? 'SEDEX',
                'observacoes'      => $validated['observacoes'],
                'cep'              => $validated['cep'],
                'logradouro'       => $validated['logradouro'],
                'numero'           => $validated['numero'],
                'complemento'      => $validated['complemento'],
                'bairro'           => $validated['bairro'],
                'cidade'           => $validated['cidade'],
                'estado'           => strtoupper($validated['estado']),
                'valor_frete'      => $validated['valor_frete'],
                'valor_total'      => $valorTotal,
            ]);

            foreach ($validated['itens'] as $item) {
                $variacaoId = $item['variacao_id'] ?? null;

                if (!$variacaoId) {
                    // Busca ou cria uma variação padrão para vincular
                    $variacao = Variacao::where('produto_id', $item['produto_id'])->first();
                    if (!$variacao) {
                        $variacao = Variacao::create([
                            'produto_id' => $item['produto_id'],
                            'tamanho'    => 'M',
                            'cor'        => 'Padrão',
                            'estoque'    => 10,
                        ]);
                    }
                    $variacaoId = $variacao->id;
                }

                ItemPedido::create([
                    'pedido_id'            => $pedido->id,
                    'variacao_produto_id'  => $variacaoId,
                    'quantidade'           => $item['quantidade'],
                    'preco_unitario'       => $item['preco'],
                ]);
            }

            return $pedido;
        });

        return response()->json([
            'mensagem' => 'Pedido criado com sucesso!',
            'pedido'   => $pedido->load(['itens.variacao.produto']),
        ], 201);
    }

    /**
     * Consultar pedido por ID.
     */
    public function show(Request $request, Pedido $pedido): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->papel === 'admin' || $pedido->user_id === $user->id, 403, 'Acesso negado.');

        return response()->json($pedido->load(['itens.variacao.produto', 'user']));
    }
}
