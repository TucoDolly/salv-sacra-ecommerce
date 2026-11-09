<?php

namespace App\Services;

use App\Models\Notificacao;
use App\Models\Variacao;
use Illuminate\Support\Facades\Log;

class NotificacaoService
{
    /**
     * Cria notificação direcionada aos administradores da loja.
     */
    public static function notificarAdmin(
        string $categoria,
        string $titulo,
        string $mensagem,
        ?string $link = null,
        ?int $referenciaId = null
    ): Notificacao {
        try {
            return Notificacao::create([
                'user_id'       => null,
                'tipo'          => 'admin',
                'categoria'     => $categoria,
                'referencia_id' => $referenciaId,
                'titulo'        => $titulo,
                'mensagem'      => $mensagem,
                'link'          => $link,
                'lida'          => false,
            ]);
        } catch (\Throwable $e) {
            Log::warning("Erro ao criar notificação de admin: " . $e->getMessage());
            return new Notificacao();
        }
    }

    /**
     * Cria notificação direcionada a um cliente específico.
     */
    public static function notificarCliente(
        int $userId,
        string $categoria,
        string $titulo,
        string $mensagem,
        ?string $link = null,
        ?int $referenciaId = null
    ): Notificacao {
        try {
            return Notificacao::create([
                'user_id'       => $userId,
                'tipo'          => 'cliente',
                'categoria'     => $categoria,
                'referencia_id' => $referenciaId,
                'titulo'        => $titulo,
                'mensagem'      => $mensagem,
                'link'          => $link,
                'lida'          => false,
            ]);
        } catch (\Throwable $e) {
            Log::warning("Erro ao criar notificação para cliente #{$userId}: " . $e->getMessage());
            return new Notificacao();
        }
    }

    /**
     * Sincroniza avisos de estoque baixo para o painel administrativo.
     * Retorna a quantidade de variações com estoque crítico (<= 3).
     */
    public static function sincronizarEstoqueBaixo(): int
    {
        try {
            $variacoesCriticas = Variacao::with('produto')
                ->where('estoque', '<=', 3)
                ->get();

            foreach ($variacoesCriticas as $variacao) {
                // Se o administrador já dispensou/excluiu o aviso deste item recentemente, respeita a decisão
                if (cache()->has("notif_estoque_dispensada_{$variacao->id}")) {
                    continue;
                }

                // Verifica se já existe qualquer notificação de estoque para esta variação (lida ou não)
                $jaExiste = Notificacao::where('tipo', 'admin')
                    ->where('categoria', 'estoque')
                    ->where('referencia_id', $variacao->id)
                    ->exists();

                if (!$jaExiste) {
                    $produtoNome = $variacao->produto?->nome ?? 'Produto';
                    $detalhes = trim(($variacao->tamanho ?? '') . ' ' . ($variacao->cor ?? ''));
                    $msg = "Apenas {$variacao->estoque} unidade(s) restante(s) do produto \"{$produtoNome}\" ({$detalhes}).";

                    self::notificarAdmin(
                        'estoque',
                        "⚠️ Estoque Baixo: {$produtoNome}",
                        $msg,
                        '/admin/estoque',
                        $variacao->id
                    );
                }
            }

            return $variacoesCriticas->count();
        } catch (\Throwable $e) {
            Log::warning("Erro ao sincronizar estoque baixo: " . $e->getMessage());
            return 0;
        }
    }
}

