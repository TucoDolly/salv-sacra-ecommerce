<?php

namespace App\Http\Controllers;

use App\Models\ModeloCamiseta;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ModeloCamisetaController extends Controller
{
    private function contarProdutosPorModelo(string $nomeModelo): int
    {
        $isRegularOuOver = in_array(strtolower($nomeModelo), ['regular fit', 'oversized', 'regular', 'over'], true);

        return Produto::where(function ($q) use ($nomeModelo, $isRegularOuOver) {
            $q->where('modelo', 'ilike', "%{$nomeModelo}%")
              ->orWhereHas('variacoes', function ($qv) use ($nomeModelo) {
                  $qv->where('modelo', 'ilike', "%{$nomeModelo}%");
              });

            // Se for Regular Fit ou Oversized, inclui também produtos configurados como 'Ambos'
            if ($isRegularOuOver) {
                $q->orWhere('modelo', 'ilike', 'ambos');
            }
        })->count();
    }

    public function index(): JsonResponse
    {
        $modelos = ModeloCamiseta::orderBy('nome')->get();

        $modelos->transform(function ($mod) {
            $mod->produtos_count = $this->contarProdutosPorModelo($mod->nome);
            return $mod;
        });

        return response()->json($modelos);
    }

    public function store(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:100', 'unique:modelos_camiseta,nome'],
        ], [
            'nome.required' => 'Informe o nome do modelo de camiseta.',
            'nome.unique'   => 'Já existe um modelo de camiseta com esse nome.',
        ]);

        $modelo = ModeloCamiseta::create([
            'nome' => trim($dados['nome']),
            'slug' => Str::slug($dados['nome']),
        ]);
        $modelo->produtos_count = 0;

        return response()->json($modelo, 201);
    }

    public function show($id): JsonResponse
    {
        $modelo = ModeloCamiseta::findOrFail($id);
        $modelo->produtos_count = $this->contarProdutosPorModelo($modelo->nome);

        return response()->json($modelo);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $modelo = ModeloCamiseta::findOrFail($id);

        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:100', Rule::unique('modelos_camiseta,nome')->ignore($modelo->id)],
        ], [
            'nome.required' => 'Informe o nome do modelo de camiseta.',
            'nome.unique'   => 'Já existe um modelo de camiseta com esse nome.',
        ]);

        $nomeAntigo = $modelo->nome;
        $novoNome = trim($dados['nome']);

        $modelo->update([
            'nome' => $novoNome,
            'slug' => Str::slug($novoNome),
        ]);

        if ($nomeAntigo !== $novoNome) {
            Produto::where('modelo', $nomeAntigo)->update(['modelo' => $novoNome]);
        }

        $modelo->produtos_count = Produto::where('modelo', 'ilike', "%{$modelo->nome}%")->count();

        return response()->json($modelo);
    }

    public function destroy($id): JsonResponse
    {
        $modelo = ModeloCamiseta::findOrFail($id);
        $modelo->delete();

        return response()->json(['message' => 'Modelo de camiseta excluído com sucesso.']);
    }
}

