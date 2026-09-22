<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use Illuminate\Http\JsonResponse;

class CategoriaController extends Controller
{
    /**
     * Retorna todas as categorias disponíveis para uso em selects.
     */
    public function index(): JsonResponse
    {
        return response()->json(
            Categoria::orderBy('nome')->get(['id', 'nome'])
        );
    }
}
