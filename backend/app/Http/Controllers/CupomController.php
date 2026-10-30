<?php

namespace App\Http\Controllers;

use App\Models\Cupom;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CupomController extends Controller
{
    /** Lista completa (Admin). */
    public function index(): JsonResponse
    {
        return response()->json(Cupom::with('produtos:id,nome')->latest()->get());
    }

    /** Cupons ativos visíveis ao cliente (carrinho / checkout). */
    public function disponiveis(): JsonResponse
    {
        $cupons = Cupom::with('produtos:id')->where('ativo', true)->orderBy('codigo')->get()
            ->map(fn (Cupom $c) => [
                'id'             => $c->id,
                'codigo'         => $c->codigo,
                'descricao'      => $c->descricao,
                'percentual'     => $c->percentual,
                'tipo'           => $c->tipo,
                'todos_produtos' => $c->todos_produtos,
                'produto_ids'    => $c->produtos->pluck('id')->all(),
            ]);

        return response()->json($cupons);
    }

    public function store(Request $request): JsonResponse
    {
        $cupom = Cupom::create($this->validar($request));
        $cupom->produtos()->sync($cupom->todos_produtos ? [] : $request->input('produto_ids', []));

        return response()->json($cupom->load('produtos:id,nome'), 201);
    }

    public function update(Request $request, Cupom $cupom): JsonResponse
    {
        $cupom->update($this->validar($request, $cupom->id));
        $cupom->produtos()->sync($cupom->todos_produtos ? [] : $request->input('produto_ids', []));

        return response()->json($cupom->load('produtos:id,nome'));
    }

    public function destroy(Cupom $cupom): JsonResponse
    {
        $cupom->delete();
        return response()->json(['message' => 'Cupom removido.']);
    }

    private function validar(Request $request, ?int $ignorarId = null): array
    {
        $request->merge(['codigo' => strtoupper(trim((string) $request->input('codigo')))]);

        $dados = $request->validate([
            'codigo'         => ['required', 'string', 'max:50', 'alpha_dash', Rule::unique('cupons', 'codigo')->ignore($ignorarId)],
            'descricao'      => ['nullable', 'string', 'max:255'],
            'percentual'     => ['required', 'numeric', 'gt:0', 'max:100'],
            'tipo'           => ['required', 'in:produto,frete'],
            'todos_produtos' => ['boolean'],
            'ativo'          => ['boolean'],
            'produto_ids'    => ['array', 'required_if:todos_produtos,false'],
            'produto_ids.*'  => ['integer', 'exists:produtos,id'],
        ], [
            'produto_ids.required_if' => 'Selecione ao menos uma peça ou marque "Todas as peças".',
        ]);

        unset($dados['produto_ids']);
        return $dados;
    }
}

