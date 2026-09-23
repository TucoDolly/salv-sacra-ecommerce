<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\DevocaoController;
use App\Http\Controllers\ProdutoController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rotas Públicas — Autenticação
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);
});

/*
|--------------------------------------------------------------------------
| Rotas Públicas — Catálogo (sem autenticação, leitura apenas)
|--------------------------------------------------------------------------
*/
Route::get('produtos',           [ProdutoController::class, 'index']);
Route::get('produtos/{produto}', [ProdutoController::class, 'show']);
Route::get('categorias',         [CategoriaController::class, 'index']);
Route::get('devocaos',           [DevocaoController::class,   'index']);

/*
|--------------------------------------------------------------------------
| Rotas Protegidas — requerem token Sanctum
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',      [AuthController::class, 'me']);

    /*
    |----------------------------------------------------------------------
    | Rotas de Administração — requerem Sanctum + papel admin
    |----------------------------------------------------------------------
    */
    Route::middleware('admin')->group(function () {

        // ── UC03 — Gestão de Produtos (criar, editar, excluir) ────────────
        Route::post('produtos',              [ProdutoController::class, 'store']);
        Route::put('produtos/{produto}',     [ProdutoController::class, 'update']);
        Route::patch('produtos/{produto}',   [ProdutoController::class, 'update']);
        Route::delete('produtos/{produto}',  [ProdutoController::class, 'destroy']);

        // ── Gestão de Categorias (CRUD completo) ──────────────────────────
        Route::apiResource('categorias', CategoriaController::class)
            ->except(['index']);

        // ── Gestão de Devoções (CRUD completo) ────────────────────────────
        Route::apiResource('devocaos', DevocaoController::class)
            ->except(['index']);
    });
});
