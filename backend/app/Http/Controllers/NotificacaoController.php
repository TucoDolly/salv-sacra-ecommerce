<?php

namespace App\Http\Controllers;

use App\Models\Devolucao;
use App\Models\Notificacao;
use App\Models\Pedido;
use App\Models\Variacao;
use App\Services\NotificacaoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificacaoController extends Controller
{
    /**
     * Lista as notificações do cliente autenticado e verifica lembretes importantes.
     */
    public function indexCliente(Request $request): JsonResponse
    {
        $user = $request->user();

        // 1. Verifica se há pedido pendente expirando (alerta de pagamento / carrinho)
        $pedidoPendente = Pedido::where('user_id', $user->id)
            ->where('status', 'Pendente')
            ->where('data_pedido', '>=', now()->subMinutes(30))
            ->latest('id')
            ->first();

        if ($pedidoPendente) {
            $cacheKey = "carrinho_notif_{$user->id}_{$pedidoPendente->id}";
            if (!cache()->has($cacheKey)) {
                $jaNotificado = Notificacao::where('user_id', $user->id)
                    ->where('categoria', 'carrinho')
                    ->where('referencia_id', $pedidoPendente->id)
                    ->exists();

                if (!$jaNotificado) {
                    NotificacaoService::notificarCliente(
                        $user->id,
                        'carrinho',
                        "Você possui um pedido aguardando pagamento!",
                        "O Pedido #{$pedidoPendente->id} no valor de R$ " . number_format($pedidoPendente->valor_total, 2, ',', '.') . " foi gerado e aguarda pagamento via PIX. Garanta suas peças antes do cancelamento automático.",
                        "/minha-conta?aba=pedidos&pedido={$pedidoPendente->id}",
                        $pedidoPendente->id
                    );
                    cache()->put($cacheKey, true, now()->addHours(6));
                }
            }
        }

        $notificacoes = Notificacao::where('user_id', $user->id)
            ->where('tipo', 'cliente')
            ->latest()
            ->take(30)
            ->get();

        $totalNaoLidas = Notificacao::where('user_id', $user->id)
            ->where('tipo', 'cliente')
            ->where('lida', false)
            ->count();

        return response()->json([
            'notificacoes'     => $notificacoes,
            'total_nao_lidas'  => $totalNaoLidas,
        ]);
    }

    /**
     * Marca uma notificação do cliente como lida.
     */
    public function marcarLidaCliente(Request $request, Notificacao $notificacao): JsonResponse
    {
        $user = $request->user();

        if ($notificacao->user_id !== $user->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $notificacao->update([
            'lida'         => true,
            'data_leitura' => now(),
        ]);

        $totalNaoLidas = Notificacao::where('user_id', $user->id)
            ->where('tipo', 'cliente')
            ->where('lida', false)
            ->count();

        return response()->json([
            'message'         => 'Notificação marcada como lida.',
            'notificacao'     => $notificacao,
            'total_nao_lidas' => $totalNaoLidas,
        ]);
    }

    /**
     * Marca todas as notificações do cliente como lidas.
     */
    public function marcarTodasLidasCliente(Request $request): JsonResponse
    {
        $user = $request->user();

        Notificacao::where('user_id', $user->id)
            ->where('tipo', 'cliente')
            ->where('lida', false)
            ->update([
                'lida'         => true,
                'data_leitura' => now(),
            ]);

        return response()->json([
            'message'         => 'Todas as notificações foram marcadas como lidas.',
            'total_nao_lidas' => 0,
        ]);
    }

    /**
     * Exclui uma notificação do cliente.
     */
    public function destroyCliente(Request $request, Notificacao $notificacao): JsonResponse
    {
        $user = $request->user();

        if ($notificacao->user_id !== $user->id) {
            return response()->json(['message' => 'Não autorizado.'], 403);
        }

        $notificacao->delete();

        $totalNaoLidas = Notificacao::where('user_id', $user->id)
            ->where('tipo', 'cliente')
            ->where('lida', false)
            ->count();

        return response()->json([
            'message'         => 'Notificação removida.',
            'total_nao_lidas' => $totalNaoLidas,
        ]);
    }

    /**
     * Apaga todas as notificações do cliente de uma só vez (limpa histórico).
     */
    public function limparTodasCliente(Request $request): JsonResponse
    {
        $user = $request->user();

        Notificacao::where('user_id', $user->id)
            ->where('tipo', 'cliente')
            ->delete();

        return response()->json([
            'message'         => 'Todas as notificações foram apagadas.',
            'total_nao_lidas' => 0,
            'notificacoes'    => [],
        ]);
    }

    /**
     * Lista as notificações do painel do Administrador.
     */
    public function indexAdmin(Request $request): JsonResponse
    {
        // Sincroniza alertas de estoque baixo automaticamente
        NotificacaoService::sincronizarEstoqueBaixo();

        $notificacoes = Notificacao::where('tipo', 'admin')
            ->latest()
            ->take(50)
            ->get();

        $totalNaoLidas = Notificacao::where('tipo', 'admin')
            ->where('lida', false)
            ->count();

        $estoqueBaixoNaoLidas = Notificacao::where('tipo', 'admin')
            ->where('categoria', 'estoque')
            ->where('lida', false)
            ->count();

        $devolucoesPendentes = Devolucao::where('status', 'Pendente')->count();
        $novosPedidos = Pedido::whereIn('status', ['Pendente', 'Pago'])->count();

        return response()->json([
            'notificacoes'              => $notificacoes,
            'total_nao_lidas'           => $totalNaoLidas,
            'estoque_baixo_count'       => $estoqueBaixoNaoLidas,
            'devolucoes_pendentes_count'=> $devolucoesPendentes,
            'novos_pedidos_count'       => $novosPedidos,
        ]);
    }

    /**
     * Retorna contadores rápidos para atualização periódica da barra lateral e topo do admin.
     */
    public function contadoresAdmin(Request $request): JsonResponse
    {
        $totalNaoLidas = Notificacao::where('tipo', 'admin')
            ->where('lida', false)
            ->count();

        $estoqueBaixoNaoLidas = Notificacao::where('tipo', 'admin')
            ->where('categoria', 'estoque')
            ->where('lida', false)
            ->count();

        $devolucoesPendentes = Devolucao::where('status', 'Pendente')->count();
        $novosPedidos = Pedido::whereIn('status', ['Pendente', 'Pago'])->count();

        return response()->json([
            'total_nao_lidas'           => $totalNaoLidas,
            'estoque_baixo_count'       => $estoqueBaixoNaoLidas,
            'devolucoes_pendentes_count'=> $devolucoesPendentes,
            'novos_pedidos_count'       => $novosPedidos,
        ]);
    }

    /**
     * Marca uma notificação do admin como lida.
     */
    public function marcarLidaAdmin(Request $request, Notificacao $notificacao): JsonResponse
    {
        $notificacao->update([
            'lida'         => true,
            'data_leitura' => now(),
        ]);

        return $this->contadoresAdmin($request);
    }

    /**
     * Marca todas as notificações do admin como lidas.
     */
    public function marcarTodasLidasAdmin(Request $request): JsonResponse
    {
        Notificacao::where('tipo', 'admin')
            ->where('lida', false)
            ->update([
                'lida'         => true,
                'data_leitura' => now(),
            ]);

        return $this->contadoresAdmin($request);
    }

    /**
     * Exclui uma notificação do admin.
     */
    public function destroyAdmin(Request $request, Notificacao $notificacao): JsonResponse
    {
        if ($notificacao->categoria === 'estoque' && $notificacao->referencia_id) {
            cache()->put("notif_estoque_dispensada_{$notificacao->referencia_id}", true, now()->addDays(7));
        }

        $notificacao->delete();
        return $this->contadoresAdmin($request);
    }

    /**
     * Apaga todas as notificações do painel do admin de uma só vez (limpa histórico).
     */
    public function limparTodasAdmin(Request $request): JsonResponse
    {
        $estoqueRefs = Notificacao::where('tipo', 'admin')
            ->where('categoria', 'estoque')
            ->pluck('referencia_id')
            ->filter();

        foreach ($estoqueRefs as $refId) {
            cache()->put("notif_estoque_dispensada_{$refId}", true, now()->addDays(7));
        }

        Notificacao::where('tipo', 'admin')->delete();

        return response()->json([
            'message'                    => 'Todas as notificações do administrador foram apagadas.',
            'total_nao_lidas'           => 0,
            'estoque_baixo_count'       => 0,
            'devolucoes_pendentes_count'=> Devolucao::where('status', 'Pendente')->count(),
            'novos_pedidos_count'       => Pedido::whereIn('status', ['Pendente', 'Pago'])->count(),
            'notificacoes'              => [],
        ]);
    }
}

