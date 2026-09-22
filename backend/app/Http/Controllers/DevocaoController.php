<?php

namespace App\Http\Controllers;

use App\Models\Devocao;
use Illuminate\Http\JsonResponse;

class DevocaoController extends Controller
{
    /**
     * Retorna todas as devoções disponíveis para uso em selects.
     */
    public function index(): JsonResponse
    {
        return response()->json(
            Devocao::orderBy('nome')->get(['id', 'nome'])
        );
    }
}
