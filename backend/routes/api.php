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
Route::get('colecoes',           [\App\Http\Controllers\ColecaoController::class, 'index']);
Route::get('modelos',            [\App\Http\Controllers\ModeloCamisetaController::class, 'index']);

// Pedidos / Checkout: exigem usuário autenticado (ver grupo auth:sanctum abaixo)

// Configurações públicas da loja (banner de topo, frete grátis, contatos)
Route::get('configuracoes',          [\App\Http\Controllers\ConfiguracaoController::class, 'publicas']);
Route::get('configuracoes/publicas', [\App\Http\Controllers\ConfiguracaoController::class, 'publicas']);

// Cálculo real de frete e prazo por CEP
Route::post('frete/calcular', [\App\Http\Controllers\FreteController::class, 'calcular']);

// Formulário de contato (com reCAPTCHA)
Route::post('contato', [\App\Http\Controllers\ContatoController::class, 'enviar']);

// Webhooks de notificação
Route::post('webhooks/mercadopago',  [PedidoController::class, 'webhookMercadoPago']);
Route::post('webhooks/melhor-envio', [PedidoController::class, 'webhookMelhorEnvio']);

// Cupons ativos disponíveis para o cliente
Route::get('cupons/disponiveis', [\App\Http\Controllers\CupomController::class, 'disponiveis']);

// Validação em tempo real do estoque dos itens no carrinho do cliente
Route::post('carrinho/verificar-estoque', [\App\Http\Controllers\ProdutoController::class, 'verificarEstoqueCarrinho']);

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
    Route::post('pedidos/{pedido}/cancelar',           [PedidoController::class, 'cancelarPeloCliente']);
    Route::post('pedidos/{pedido}/devolucoes',         [\App\Http\Controllers\DevolucaoController::class, 'solicitar']);
    Route::delete('pedidos/{pedido}',                  [PedidoController::class, 'destroy']);

    // Central de Notificações (Cliente)
    Route::get('notificacoes',                       [\App\Http\Controllers\NotificacaoController::class, 'indexCliente']);
    Route::patch('notificacoes/{notificacao}/lida',  [\App\Http\Controllers\NotificacaoController::class, 'marcarLidaCliente']);
    Route::patch('notificacoes/marcar-todas-lidas',  [\App\Http\Controllers\NotificacaoController::class, 'marcarTodasLidasCliente']);
    Route::delete('notificacoes/limpar-todas',       [\App\Http\Controllers\NotificacaoController::class, 'limparTodasCliente']);
    Route::delete('notificacoes/{notificacao}',      [\App\Http\Controllers\NotificacaoController::class, 'destroyCliente']);

    // Avisos de Reposição de Estoque (cliente autenticado)
    Route::get('avisos-estoque',                 [\App\Http\Controllers\AvisoEstoqueController::class, 'index']);
    Route::post('avisos-estoque',                [\App\Http\Controllers\AvisoEstoqueController::class, 'toggle']);
    Route::post('produtos/{produto}/avaliacoes', [\App\Http\Controllers\AvaliacaoController::class, 'store']);
    Route::delete('avaliacoes/{avaliacao}',      [\App\Http\Controllers\AvaliacaoController::class, 'destroy']);

    // ── Minha Conta (cliente autenticado) ─────────────────────────────
    Route::prefix('conta')->group(function () {
        Route::get('resumo',               [\App\Http\Controllers\ContaController::class, 'resumo']);
        Route::put('perfil',               [\App\Http\Controllers\ContaController::class, 'atualizarPerfil']);
        Route::put('senha',                [\App\Http\Controllers\ContaController::class, 'alterarSenha']);
        Route::get('pedidos',              [\App\Http\Controllers\ContaController::class, 'pedidos']);
        Route::post('pedidos/{pedido}/devolucoes', [\App\Http\Controllers\DevolucaoController::class, 'solicitar']);
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

        // ── Gestão de Coleções (CRUD completo) ────────────────────────────
        Route::apiResource('colecoes', \App\Http\Controllers\ColecaoController::class)
            ->except(['index']);

        // ── Gestão de Modelos de Camiseta (CRUD completo) ───────────────────
        Route::apiResource('modelos', \App\Http\Controllers\ModeloCamisetaController::class)
            ->except(['index']);

        // ── Gestão de Pedidos (Administração) ─────────────────────────────
        Route::get('admin/pedidos',                               [PedidoController::class, 'indexAdmin']);
        Route::patch('admin/pedidos/{pedido}/status',             [PedidoController::class, 'updateStatus']);
        Route::post('admin/pedidos/{pedido}/melhor-envio/enviar', [PedidoController::class, 'enviarMelhorEnvio']);
        Route::post('admin/pedidos/{pedido}/rastreio/consultar',  [PedidoController::class, 'consultarRastreio']);
        Route::post('admin/pedidos/rastreio/sincronizar-todos',   [PedidoController::class, 'sincronizarTodosRastreios']);
        Route::delete('admin/pedidos/limpar-finalizados',         [PedidoController::class, 'limparFinalizados']);

        // ── Gestão de Devoluções & Trocas (Administração) ─────────────────
        Route::get('admin/devolucoes',                      [\App\Http\Controllers\DevolucaoController::class, 'adminIndex']);
        Route::put('admin/devolucoes/{devolucao}/aprovar',  [\App\Http\Controllers\DevolucaoController::class, 'adminAprovar']);
        Route::post('admin/devolucoes/{devolucao}/aprovar', [\App\Http\Controllers\DevolucaoController::class, 'adminAprovar']); // Suporta FormData com arquivo
        Route::put('admin/devolucoes/{devolucao}/recusar',  [\App\Http\Controllers\DevolucaoController::class, 'adminRecusar']);
        Route::put('admin/devolucoes/{devolucao}/concluir', [\App\Http\Controllers\DevolucaoController::class, 'adminConcluir']);

        // ── Central de Notificações (Administração) ────────────────────────
        Route::get('admin/notificacoes',                      [\App\Http\Controllers\NotificacaoController::class, 'indexAdmin']);
        Route::get('admin/contadores',                        [\App\Http\Controllers\NotificacaoController::class, 'contadoresAdmin']);
        Route::patch('admin/notificacoes/{notificacao}/lida', [\App\Http\Controllers\NotificacaoController::class, 'marcarLidaAdmin']);
        Route::patch('admin/notificacoes/marcar-todas-lidas', [\App\Http\Controllers\NotificacaoController::class, 'marcarTodasLidasAdmin']);
        Route::delete('admin/notificacoes/limpar-todas',       [\App\Http\Controllers\NotificacaoController::class, 'limparTodasAdmin']);
        Route::delete('admin/notificacoes/{notificacao}',     [\App\Http\Controllers\NotificacaoController::class, 'destroyAdmin']);

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

        // ── Upload de Arquivos / Imagens ──────────────────────────────────
        Route::post('admin/upload', [\App\Http\Controllers\UploadController::class, 'upload']);
    });
});
