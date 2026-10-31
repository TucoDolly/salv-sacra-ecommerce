<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\DevocaoController;
use App\Http\Controllers\PedidoController;
use App\Http\Controllers\ProdutoController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rotas Públicas — Autenticação
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('/register',           [AuthController::class, 'register']);
    Route::post('/verificar-email',    [AuthController::class, 'verificarEmail']);
    Route::post('/reenviar-validacao', [AuthController::class, 'reenviarValidacao']);
    Route::post('/login',              [AuthController::class, 'login']);
    Route::post('/esqueci-senha',      [\App\Http\Controllers\PasswordResetController::class, 'enviarLink']);
    Route::post('/redefinir-senha',    [\App\Http\Controllers\PasswordResetController::class, 'redefinirSenha']);
});

/*
|--------------------------------------------------------------------------
| Rotas Públicas — Catálogo e Checkout
|--------------------------------------------------------------------------
*/
Route::get('produtos',           [ProdutoController::class, 'index']);
Route::get('produtos/{produto}', [ProdutoController::class, 'show']);
Route::get('produtos/{produto}/avaliacoes', [\App\Http\Controllers\AvaliacaoController::class, 'index']);
Route::get('categorias',         [CategoriaController::class, 'index']);
Route::get('devocaos',           [DevocaoController::class,   'index']);

// Pedidos / Checkout: exigem usuário autenticado (ver grupo auth:sanctum abaixo)

// Configurações públicas da loja (banner de topo, frete grátis, contatos)
Route::get('configuracoes', [\App\Http\Controllers\ConfiguracaoController::class, 'publicas']);

// Cálculo real de frete e prazo por CEP
Route::post('frete/calcular', [\App\Http\Controllers\FreteController::class, 'calcular']);

// Formulário de contato (com reCAPTCHA)
Route::post('contato', [\App\Http\Controllers\ContatoController::class, 'enviar']);

// Webhook de pagamento do Mercado Pago
Route::post('webhooks/mercadopago', [PedidoController::class, 'webhookMercadoPago']);

// Cupons ativos disponíveis para o cliente
Route::get('cupons/disponiveis', [\App\Http\Controllers\CupomController::class, 'disponiveis']);

/*
|--------------------------------------------------------------------------
| Rotas Protegidas — requerem token Sanctum
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me',      [AuthController::class, 'me']);

    // Pedidos / Checkout (somente logado)
    Route::post('pedidos',                             [PedidoController::class, 'store']);
    Route::get('pedidos/{pedido}',                     [PedidoController::class, 'show']);
    Route::post('pedidos/{pedido}/confirmar-pagamento',[PedidoController::class, 'confirmarPagamento']);

    // Avaliações de Produtos (cliente autenticado)
    Route::post('produtos/{produto}/avaliacoes', [\App\Http\Controllers\AvaliacaoController::class, 'store']);
    Route::delete('avaliacoes/{avaliacao}',      [\App\Http\Controllers\AvaliacaoController::class, 'destroy']);

    // ── Minha Conta (cliente autenticado) ─────────────────────────────
    Route::prefix('conta')->group(function () {
        Route::get('resumo',               [\App\Http\Controllers\ContaController::class, 'resumo']);
        Route::put('perfil',               [\App\Http\Controllers\ContaController::class, 'atualizarPerfil']);
        Route::put('senha',                [\App\Http\Controllers\ContaController::class, 'alterarSenha']);
        Route::get('pedidos',              [\App\Http\Controllers\ContaController::class, 'pedidos']);
        Route::get('enderecos',            [\App\Http\Controllers\ContaController::class, 'enderecos']);
        Route::get('ultimo-endereco',      [\App\Http\Controllers\ContaController::class, 'ultimoEnderecoPedido']);
        Route::post('enderecos',           [\App\Http\Controllers\ContaController::class, 'criarEndereco']);
        Route::put('enderecos/{endereco}', [\App\Http\Controllers\ContaController::class, 'atualizarEndereco']);
        Route::delete('enderecos/{endereco}', [\App\Http\Controllers\ContaController::class, 'removerEndereco']);
        Route::get('cartoes',              [\App\Http\Controllers\ContaController::class, 'cartoes']);
        Route::post('cartoes',             [\App\Http\Controllers\ContaController::class, 'criarCartao']);
        Route::delete('cartoes/{cartao}',  [\App\Http\Controllers\ContaController::class, 'removerCartao']);
        Route::get('favoritos',            [\App\Http\Controllers\ContaController::class, 'favoritos']);
        Route::post('favoritos/sincronizar',[\App\Http\Controllers\ContaController::class, 'sincronizarFavoritos']);
        Route::post('favoritos/{produto}', [\App\Http\Controllers\ContaController::class, 'toggleFavorito']);
        Route::delete('excluir',           [\App\Http\Controllers\ContaController::class, 'excluirConta']);
    });

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

        // ── Gestão de Pedidos (Administração) ─────────────────────────────
        Route::get('admin/pedidos',                 [PedidoController::class, 'indexAdmin']);
        Route::patch('admin/pedidos/{pedido}/status', [PedidoController::class, 'updateStatus']);

        // ── Cupons de desconto (Administração) ────────────────────────────
        Route::get('admin/cupons',            [\App\Http\Controllers\CupomController::class, 'index']);
        Route::post('admin/cupons',           [\App\Http\Controllers\CupomController::class, 'store']);
        Route::put('admin/cupons/{cupom}',    [\App\Http\Controllers\CupomController::class, 'update']);
        Route::delete('admin/cupons/{cupom}', [\App\Http\Controllers\CupomController::class, 'destroy']);

        // ── Gestão de Estoque Rápida (Administração) ─────────────────────
        Route::get('admin/estoque',                      [\App\Http\Controllers\EstoqueController::class, 'index']);
        Route::patch('admin/estoque/{variacao}',         [\App\Http\Controllers\EstoqueController::class, 'update']);

        // ── Relatórios e Faturamento (Administração) ─────────────────────
        Route::get('admin/relatorios',                   [\App\Http\Controllers\RelatorioController::class, 'index']);

        // ── Configurações da Loja (Administração) ────────────────────────
        Route::get('admin/configuracoes',                [\App\Http\Controllers\ConfiguracaoController::class, 'index']);
        Route::put('admin/configuracoes',                [\App\Http\Controllers\ConfiguracaoController::class, 'updateBatch']);

        // ── Dashboard Inicial (Administração) ─────────────────────────────
        Route::get('admin/dashboard', [\App\Http\Controllers\AdminDashboardController::class, 'index']);

        // ── Moderação de Avaliações (Administração) ───────────────────────
        Route::get('admin/avaliacoes',               [\App\Http\Controllers\AvaliacaoController::class, 'adminIndex']);
        Route::delete('admin/avaliacoes/{avaliacao}', [\App\Http\Controllers\AvaliacaoController::class, 'destroy']);
    });
});
