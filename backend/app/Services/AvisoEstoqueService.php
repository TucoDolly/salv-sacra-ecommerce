<?php

namespace App\Services;

use App\Mail\ProdutoDisponivelMail;
use App\Models\AvisoEstoque;
use App\Models\Variacao;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class AvisoEstoqueService
{
    /**
     * Dispara avisos para todos os clientes que aguardavam a reposição da variação dada.
     */
    public static function processarReposicao(Variacao $variacao): int
    {
        if ((int) $variacao->estoque <= 0) {
            return 0;
        }

        $variacao->loadMissing('produto');

        $query = AvisoEstoque::with(['user', 'produto'])
            ->where('produto_id', $variacao->produto_id)
            ->whereNull('notificado_em')
            ->whereRaw('UPPER(TRIM(tamanho)) = ?', [strtoupper(trim($variacao->tamanho))]);

        // Se o aviso tiver cor especificada, deve bater com a cor da variação
        if (!empty($variacao->cor)) {
            $query->where(function ($q) use ($variacao) {
                $q->whereNull('cor')
                  ->orWhere('cor', '')
                  ->orWhereRaw('LOWER(TRIM(cor)) = ?', [strtolower(trim($variacao->cor))]);
            });
        }

        // Se o aviso tiver modelo especificado, deve bater com o modelo da variação
        if (!empty($variacao->modelo)) {
            $query->where(function ($q) use ($variacao) {
                $q->whereNull('modelo')
                  ->orWhere('modelo', '')
                  ->orWhereRaw('LOWER(TRIM(modelo)) = ?', [strtolower(trim($variacao->modelo))]);
            });
        }

        $avisos = $query->get();
        $disparados = 0;

        foreach ($avisos as $aviso) {
            if (!$aviso->user || !$aviso->user->email) {
                continue;
            }

            try {
                Mail::to($aviso->user->email)->send(new ProdutoDisponivelMail($aviso->user, $variacao));
                $aviso->update([
                    'notificado_em' => now(),
                    'variacao_id'   => $variacao->id,
                ]);
                $disparados++;
                Log::info("Aviso de reposição de estoque enviado com sucesso para {$aviso->user->email} sobre a variação #{$variacao->id}");
            } catch (\Throwable $e) {
                Log::error("Erro ao enviar e-mail de reposição de estoque para {$aviso->user->email}: " . $e->getMessage());
            }
        }

        return $disparados;
    }
}

