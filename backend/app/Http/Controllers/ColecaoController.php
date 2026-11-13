<?php

namespace App\Http\Controllers;

use App\Models\Colecao;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ColecaoController extends Controller
{
    public function index(): JsonResponse
    {
        $colecoes = Colecao::orderBy('nome')->get();

        $colecoes->transform(function ($col) {
            $col->produtos_count = Produto::where('colecao', 'ilike', "%{$col->nome}%")
                ->orWhere('modelo', 'ilike', "%{$col->nome}%")
                ->count();
            return $col;
        });

        return response()->json($colecoes);
    }

    public function store(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:100', 'unique:colecoes,nome'],
        ], [
            'nome.required' => 'Informe o nome da coleção.',
            'nome.unique'   => 'Já existe uma coleção com esse nome.',
        ]);

        $colecao = Colecao::create([
            'nome' => trim($dados['nome']),
            'slug' => Str::slug($dados['nome']),
        ]);
        $colecao->produtos_count = 0;

        return response()->json($colecao, 201);
    }

    public function show($id): JsonResponse
    {
        $colecao = Colecao::findOrFail($id);
        $colecao->produtos_count = Produto::where('colecao', 'ilike', "%{$colecao->nome}%")
            ->orWhere('modelo', 'ilike', "%{$colecao->nome}%")
            ->count();

        return response()->json($colecao);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $colecao = Colecao::findOrFail($id);

        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:100', Rule::unique('colecoes', 'nome')->ignore($colecao->id)],
        ], [
            'nome.required' => 'Informe o nome da coleção.',
            'nome.unique'   => 'Já existe uma coleção com esse nome.',
        ]);

        $nomeAntigo = $colecao->nome;
        $novoNome = trim($dados['nome']);

        $colecao->update([
            'nome' => $novoNome,
            'slug' => Str::slug($novoNome),
        ]);

        if ($nomeAntigo !== $novoNome) {
            Produto::where('colecao', $nomeAntigo)->update(['colecao' => $novoNome]);
            Produto::where('modelo', $nomeAntigo)->update(['modelo' => $novoNome]);
        }

        $colecao->produtos_count = Produto::where('colecao', 'ilike', "%{$colecao->nome}%")
            ->orWhere('modelo', 'ilike', "%{$colecao->nome}%")
            ->count();

        return response()->json($colecao);
    }

    public function destroy($id): JsonResponse
    {
        $colecao = Colecao::findOrFail($id);
        $colecao->delete();

        return response()->json(['message' => 'Coleção excluída com sucesso.']);
    }
}

