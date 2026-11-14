<?php

namespace App\Http\Controllers;

use App\Mail\DevolucaoAprovadaMail;
use App\Mail\DevolucaoConcluidaMail;
use App\Mail\DevolucaoSolicitadaMail;
use App\Models\Cupom;
use App\Models\Devolucao;
use App\Models\Pedido;
use App\Services\NotificacaoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class DevolucaoController extends Controller
{
    /**
     * Cliente solicita devolução ou troca para um pedido que foi entregue.
     */
    public function solicitar(Request $request, Pedido $pedido): JsonResponse
    {
        $user = $request->user();

        // 1. Valida se o pedido pertence ao usuário (ou se é admin)
        if ($pedido->user_id !== $user->id && $user->papel !== 'admin') {
            return response()->json(['message' => 'Você não tem permissão para solicitar devolução deste pedido.'], 403);
        }

        // 2. O pedido precisa estar com status 'Entregue'
        if ($pedido->status !== 'Entregue') {
            return response()->json(['message' => 'Apenas pedidos entregues podem ter solicitação de devolução ou troca.'], 422);
        }

        // 3. Verifica se já existe uma solicitação ativa em andamento para este pedido
        $devolucaoExistente = Devolucao::where('pedido_id', $pedido->id)
            ->whereNotIn('status', ['Recusada'])
            ->first();

        if ($devolucaoExistente) {
            return response()->json([
                'message'   => "Este pedido já possui uma solicitação de devolução em andamento (Status: {$devolucaoExistente->status}).",
                'devolucao' => $devolucaoExistente,
            ], 422);
        }

        // Trata itens caso tenham sido enviados como string JSON via FormData
        $itensInput = $request->input('itens');
        if (is_string($itensInput)) {
            $itensDecoded = json_decode($itensInput, true);
            if (is_array($itensDecoded)) {
                $request->merge(['itens' => $itensDecoded]);
            }
        }

        $validated = $request->validate([
            'tipo_solicitacao'   => ['required', 'string', 'in:cupom,vale_compra,reembolso'],
            'motivo'             => ['required', 'string', 'max:100'],
            'descricao'          => ['nullable', 'string', 'max:1500'],
            'itens'              => ['nullable', 'array', 'min:1'],
            'itens.*.item_id'    => ['required'],
            'itens.*.quantidade' => ['required', 'integer', 'min:1'],
            'fotos'              => ['nullable'],
            'fotos.*'            => ['nullable', 'file', 'image', 'max:5120'],
        ]);

        $valorDinheiroPedido = round(max(0.0, (float) ($pedido->valor_pago_dinheiro ?? 0)), 2);
        $valorValePedido = round(max(0.0, (float) ($pedido->valor_vale_compra ?? 0)), 2);
        $ehModalidadeVale = in_array($validated['tipo_solicitacao'], ['cupom', 'vale_compra'], true);

        if ($validated['tipo_solicitacao'] === 'reembolso' && $valorDinheiroPedido <= 0) {
            return response()->json([
                'message' => 'Este pedido não possui valor pago em dinheiro (R$ 0,00) para reembolso. Apenas a restauração dos benefícios originais utilizados é aplicável.',
            ], 422);
        }

        $pedido->load('itens.variacao.produto');

        $itensSolicitados = $validated['itens'] ?? $pedido->itens->map(fn ($item) => [
            'item_id'    => $item->id,
            'quantidade' => (int) $item->quantidade,
        ])->values()->all();

        $itensDevolvidos = [];
        $valorBrutoDevolvido = 0.0;

        foreach ($itensSolicitados as $itemSol) {
            $itemDb = $pedido->itens->firstWhere('id', (int) $itemSol['item_id']);
            if (! $itemDb) {
                continue;
            }

            $qtd = max(1, min((int) $itemSol['quantidade'], (int) $itemDb->quantidade));
            // Nunca inflar devolução com preco_base: usa estritamente o preço praticado no item do pedido
            $precoUnitario = round((float) $itemDb->preco_unitario, 2);
            $subtotalItem = round($qtd * $precoUnitario, 2);
            $valorBrutoDevolvido += $subtotalItem;

            $produtoNome = $itemDb->variacao?->produto?->nome ?? 'Camiseta Salv Sacra';
            $tamCor = trim(($itemDb->variacao?->tamanho ?? '') . ' / ' . ($itemDb->variacao?->cor ?? ''), ' /');

            $itensDevolvidos[] = [
                'item_pedido_id' => $itemDb->id,
                'produto_id'     => $itemDb->variacao?->produto_id,
                'nome'           => $produtoNome,
                'variacao'       => $tamCor,
                'quantidade'     => $qtd,
                'preco_unitario' => $precoUnitario,
                'subtotal'       => $subtotalItem,
            ];
        }

        if (empty($itensDevolvidos)) {
            return response()->json(['message' => 'Nenhum item válido selecionado para devolução.'], 422);
        }

        // Deduz proporcionalmente o desconto promocional de produto para nunca converter cupom promocional em vale-compra
        $somaBrutaPedido = round((float) $pedido->itens->sum(fn ($it) => (float) $it->preco_unitario * (int) $it->quantidade), 2);
        $descontoProdutos = round(max(0.0, (float) ($pedido->valor_desconto_produto ?? 0)), 2);
        if ($descontoProdutos <= 0 && ($pedido->cupom_tipo ?? '') !== 'frete' && (float) ($pedido->valor_desconto_cupom ?? 0) > 0) {
            $descontoProdutos = round((float) $pedido->valor_desconto_cupom, 2);
        }

        $proporcaoItens = $somaBrutaPedido > 0 ? min(1.0, $valorBrutoDevolvido / $somaBrutaPedido) : 1.0;
        $descontoProporcional = round($descontoProdutos * $proporcaoItens, 2);
        $valorLiquidoItens = max(0.0, round($valorBrutoDevolvido - $descontoProporcional, 2));

        // Apenas o frete efetivamente pago pelo cliente (valor_frete_pago) compõe o cálculo de restituição
        $fretePago = round(max(0.0, (float) ($pedido->valor_frete_pago ?? 0)), 2);
        $valorTotalEstorno = round($valorLiquidoItens + $fretePago, 2);

        if ($ehModalidadeVale) {
            // Para vale-compra, o teto máximo restituível é valor_pago_dinheiro + valor_vale_compra (excluindo descontos promocionais)
            $tetoVale = round($valorDinheiroPedido + $valorValePedido, 2);
            if ($tetoVale > 0 || $valorDinheiroPedido > 0 || $valorValePedido > 0) {
                $valorTotalEstorno = min($valorTotalEstorno, $tetoVale);
            }
        } else {
            // Para reembolso em dinheiro, o teto é exclusivamente o valor efetivamente pago em dinheiro
            $valorTotalEstorno = min($valorTotalEstorno, $valorDinheiroPedido);
        }

        $valorTotalItens = round(max(0.0, $valorTotalEstorno), 2);

        // Upload de fotos anexadas pelo cliente (se houver)
        $fotosUrls = [];
        if ($request->hasFile('fotos')) {
            foreach ($request->file('fotos') as $file) {
                if ($file && $file->isValid()) {
                    $ext = $file->getClientOriginalExtension() ?: 'jpg';
                    $nome = Str::random(24) . '.' . strtolower($ext);
                    $caminho = $file->storeAs('devolucoes', $nome, 'public');
                    $fotosUrls[] = url('storage/' . $caminho);
                }
            }
        }

        $devolucao = Devolucao::create([
            'pedido_id'        => $pedido->id,
            'user_id'          => $user->id,
            'status'           => 'Pendente',
            'tipo_solicitacao' => $validated['tipo_solicitacao'],
            'motivo'           => $validated['motivo'],
            'descricao'        => $validated['descricao'] ?? null,
            'itens_devolvidos' => $itensDevolvidos,
            'fotos'            => $fotosUrls,
            'valor_estorno'    => $valorTotalItens,
        ]);

        // Notificações no sistema (Admin e Cliente)
        $rotuloModalidade = in_array($devolucao->tipo_solicitacao, ['cupom', 'vale_compra'], true) ? 'Vale-Compras' : 'Estorno';
        NotificacaoService::notificarAdmin(
            'devolucao',
            "Nova Devolução Solicitada · Pedido #{$pedido->id}",
            "O cliente {$user->name} solicitou devolução/troca no valor de R$ " . number_format($devolucao->valor_estorno, 2, ',', '.') . " ({$rotuloModalidade}). Motivo: {$devolucao->motivo}.",
            "/admin/devolucoes",
            $devolucao->id
        );

        NotificacaoService::notificarCliente(
            $user->id,
            'devolucao',
            "Devolução Solicitada · Pedido #{$pedido->id}",
            "Sua solicitação de devolução/troca foi enviada para análise da nossa equipe. Em breve você receberá as instruções e o código de postagem reversa dos Correios.",
            "/minha-conta?aba=pedidos&pedido={$pedido->id}",
            $devolucao->id
        );

        // Envia e-mail de confirmação para o cliente
        try {
            $destinatario = $user->email ?: $pedido->email_contato;
            if ($destinatario) {
                Mail::to($destinatario)->send(new DevolucaoSolicitadaMail($devolucao));
            }
        } catch (\Throwable $e) {
            Log::warning("Falha ao enviar e-mail de devolução solicitada (#{$devolucao->id}): " . $e->getMessage());
        }

        // Envia e-mail de notificação para o administrador da loja
        try {
            Mail::to('salvsacra2@gmail.com')->send(new \App\Mail\NovaDevolucaoAdminMail($devolucao->load('user')));
        } catch (\Throwable $e) {
            Log::error("Falha ao enviar e-mail de nova devolução para o admin (#{$devolucao->id}): " . $e->getMessage());
        }

        return response()->json([
            'message'   => 'Solicitação de devolução registrada com sucesso! Nossa equipe analisará e enviará as instruções por e-mail.',
            'devolucao' => $devolucao->load('pedido'),
        ], 201);
    }

    /**
     * Lista todas as devoluções cadastradas (Apenas Admin).
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = Devolucao::with(['pedido.user', 'user'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('busca')) {
            $busca = trim((string) $request->query('busca'));
            $query->where(function ($q) use ($busca) {
                $q->where('pedido_id', 'like', "%{$busca}%")
                  ->orWhere('codigo_postagem_reversa', 'like', "%{$busca}%")
                  ->orWhereHas('user', function ($uq) use ($busca) {
                      $uq->where('name', 'like', "%{$busca}%")
                         ->orWhere('email', 'like', "%{$busca}%");
                  });
            });
        }

        $devolucoes = $query->paginate(20);
        return response()->json($devolucoes);
    }

    /**
     * Admin aprova a devolução e insere o código de postagem reversa dos Correios.
     */
    public function adminAprovar(Request $request, Devolucao $devolucao): JsonResponse
    {
        $validated = $request->validate([
            'codigo_postagem_reversa' => ['required', 'string', 'max:100'],
            'prazo_postagem'          => ['nullable', 'string', 'max:100'],
            'instrucoes_admin'        => ['nullable', 'string', 'max:2000'],
            'declaracao_conteudo'     => ['nullable', 'file', 'max:10240'],
        ]);

        if (! $request->hasFile('declaracao_conteudo') && empty($devolucao->declaracao_conteudo_path)) {
            return response()->json([
                'message' => 'O arquivo da declaração de conteúdo é obrigatório para aprovação da devolução.',
                'errors'  => ['declaracao_conteudo' => ['O arquivo da declaração de conteúdo é obrigatório.']],
            ], 422);
        }

        $dadosUpdate = [
            'status'                  => 'Aprovada',
            'codigo_postagem_reversa' => trim($validated['codigo_postagem_reversa']),
            'prazo_postagem'          => $validated['prazo_postagem'] ?: '7 dias corridos',
            'instrucoes_admin'        => $validated['instrucoes_admin'] ?? null,
            'data_aprovacao'          => now(),
        ];

        // Processa anexo da declaração de conteúdo se fornecido
        if ($request->hasFile('declaracao_conteudo')) {
            $file = $request->file('declaracao_conteudo');
            if ($file && $file->isValid()) {
                $ext = $file->getClientOriginalExtension() ?: 'pdf';
                $nomeOriginal = $file->getClientOriginalName() ?: ("declaracao_conteudo_pedido_" . $devolucao->pedido_id . "." . $ext);
                $nomeSalvo = 'dc_' . $devolucao->pedido_id . '_' . Str::random(12) . '.' . strtolower($ext);
                $caminho = $file->storeAs('devolucoes_documentos', $nomeSalvo, 'public');
                $dadosUpdate['declaracao_conteudo_path'] = $caminho;
                $dadosUpdate['declaracao_conteudo_url']  = url('storage/' . $caminho);
                $dadosUpdate['declaracao_conteudo_nome'] = $nomeOriginal;
            }
        }

        $devolucao->update($dadosUpdate);
        $devolucao->refresh();

        // Notificação para o cliente no painel da loja
        $temDc = !empty($devolucao->declaracao_conteudo_url);
        NotificacaoService::notificarCliente(
            $devolucao->user_id,
            'devolucao',
            "Devolução Aprovada! · Pedido #{$devolucao->pedido_id}",
            "Seu código de postagem reversa (rastreio) dos Correios é {$devolucao->codigo_postagem_reversa} (Válido por {$devolucao->prazo_postagem})" . ($temDc ? " e a Declaração de Conteúdo está disponível para download." : "."),
            "/minha-conta?aba=pedidos&pedido={$devolucao->pedido_id}",
            $devolucao->id
        );

        // Dispara e-mail com autorização de postagem reversa para o cliente
        try {
            $destinatario = $devolucao->user?->email ?: $devolucao->pedido?->email_contato;
            if ($destinatario) {
                Mail::to($destinatario)->send(new DevolucaoAprovadaMail($devolucao));
            }
        } catch (\Throwable $e) {
            Log::warning("Falha ao enviar e-mail de devolução aprovada (#{$devolucao->id}): " . $e->getMessage());
        }

        return response()->json([
            'message'   => 'Devolução aprovada com sucesso! Código de postagem reversa' . ($temDc ? ' e declaração de conteúdo' : '') . ' enviados ao cliente.',
            'devolucao' => $devolucao->fresh(),
        ]);
    }

    /**
     * Admin recusa a devolução com justificativa.
     */
    public function adminRecusar(Request $request, Devolucao $devolucao): JsonResponse
    {
        $validated = $request->validate([
            'motivo_recusa' => ['required', 'string', 'max:1500'],
        ]);

        $devolucao->update([
            'status'        => 'Recusada',
            'motivo_recusa' => trim($validated['motivo_recusa']),
        ]);
        $devolucao->refresh();

        // Notificação interna na plataforma para o cliente
        NotificacaoService::notificarCliente(
            $devolucao->user_id,
            'devolucao',
            "Devolução Não Aprovada · Pedido #{$devolucao->pedido_id}",
            "Sua solicitação de devolução foi recusada. Motivo: " . Str::limit($devolucao->motivo_recusa, 140),
            "/minha-conta?aba=pedidos&pedido={$devolucao->pedido_id}",
            $devolucao->id
        );

        // Dispara e-mail formal com justificativa e canal WhatsApp para o cliente
        try {
            $destinatario = $devolucao->user?->email ?: $devolucao->pedido?->email_contato;
            if ($destinatario) {
                Mail::to($destinatario)->send(new \App\Mail\DevolucaoRecusadaMail($devolucao));
            }
        } catch (\Throwable $e) {
            Log::warning("Falha ao enviar e-mail de devolução recusada (#{$devolucao->id}): " . $e->getMessage());
        }

        return response()->json([
            'message'   => 'Solicitação de devolução recusada. Notificação e e-mail enviados ao cliente.',
            'devolucao' => $devolucao->fresh(),
        ]);
    }

    /**
     * Admin conclui a devolução (peças conferidas).
     * Se o cliente pediu cupom, gera um cupom automático no valor exato.
     */
    public function adminConcluir(Request $request, Devolucao $devolucao): JsonResponse
    {
        $resultado = DB::transaction(function () use ($devolucao) {
            $devolucaoLocked = Devolucao::lockForUpdate()->findOrFail($devolucao->id);

            if ($devolucaoLocked->status === 'Concluida') {
                return [
                    'erro_status' => 422,
                    'payload'     => [
                        'message'      => 'Esta devolução já foi concluída anteriormente. Nenhuma nova restituição foi gerada.',
                        'ja_concluida' => true,
                        'devolucao'    => $devolucaoLocked,
                    ],
                ];
            }

            if ($devolucaoLocked->status === 'Recusada') {
                return [
                    'erro_status' => 422,
                    'payload'     => [
                        'message' => 'Não é possível concluir uma devolução recusada.',
                    ],
                ];
            }

            $pedido = $devolucaoLocked->pedido_id
                ? Pedido::lockForUpdate()->find($devolucaoLocked->pedido_id)
                : null;

            $ehModalidadeVale = in_array($devolucaoLocked->tipo_solicitacao, ['cupom', 'vale_compra'], true);
            $pedidoController = app(PedidoController::class);

            $cupomCodigo = null;
            $novoVale = null;
            $infoEstorno = null;
            $valorReembolsado = 0.0;
            $resumoBeneficios = [
                'vale_restaurado'  => 0.0,
                'cupom_restaurado' => false,
            ];

            if ($pedido) {
                $valorDinheiroPedido = round(max(0.0, (float) ($pedido->valor_pago_dinheiro ?? 0)), 2);
                $valorValePedido = round(max(0.0, (float) ($pedido->valor_vale_compra ?? 0)), 2);

                if ($ehModalidadeVale) {
                    if ($valorDinheiroPedido <= 0) {
                        // Cenário B (100% vale) ou cupom 100%: restaura benefícios originais sem emitir novo vale duplicado
                        $resumoBeneficios = $pedidoController->restaurarBeneficiosPedido(
                            $pedido,
                            "Conclusão da Devolução #{$devolucaoLocked->id} (restauração de benefícios originais)",
                            true,
                            true
                        );
                    } else {
                        // Cenários A, C, D, E em vale-compra: incorpora vale consumido + dinheiro pago no novo vale e restaura cupom promocional
                        $resumoBeneficios = $pedidoController->restaurarBeneficiosPedido(
                            $pedido,
                            "Conclusão da Devolução #{$devolucaoLocked->id} (convertida em vale-compra)",
                            false,
                            true
                        );
                        $tetoVale = round($valorDinheiroPedido + $valorValePedido, 2);
                        $valorNovoVale = round(min((float) $devolucaoLocked->valor_estorno, $tetoVale), 2);
                        if ($valorNovoVale > 0 && empty($devolucaoLocked->cupom_gerado_codigo)) {
                            $novoVale = $pedidoController->emitirValeCompraRestituicao(
                                $pedido,
                                $valorNovoVale,
                                "Vale-Compras referente à Devolução/Troca #{$devolucaoLocked->id} (Pedido #{$pedido->id}).",
                                $devolucaoLocked->id,
                                'TROCA-'
                            );
                            $cupomCodigo = $novoVale->codigo;
                        }
                    }
                } else {
                    // Modalidade Reembolso: restaura vale original + cupom promocional + estorna o valor efetivamente pago em dinheiro
                    $resumoBeneficios = $pedidoController->restaurarBeneficiosPedido(
                        $pedido,
                        "Conclusão da Devolução #{$devolucaoLocked->id} (reembolso)",
                        true,
                        true
                    );

                    if ($valorDinheiroPedido > 0) {
                        $valorReembolsar = round(min((float) $devolucaoLocked->valor_estorno, $valorDinheiroPedido), 2);
                        if ($valorReembolsar > 0) {
                            try {
                                $infoEstorno = $pedidoController->estornarPagamentoMercadoPago($pedido, $valorReembolsar);
                            } catch (\Throwable $e) {
                                Log::warning("Erro ao solicitar estorno MP na conclusão da devolução #{$devolucaoLocked->id}: " . $e->getMessage());
                            }
                            $valorReembolsado = $valorReembolsar;
                        }
                    }
                }
            } elseif ($ehModalidadeVale && empty($devolucaoLocked->cupom_gerado_codigo)) {
                do {
                    $cupomCodigo = 'TROCA-' . strtoupper(Str::random(6));
                } while (Cupom::where('codigo', $cupomCodigo)->exists());

                $novoVale = Cupom::create([
                    'codigo'               => $cupomCodigo,
                    'descricao'            => "Vale-Compras referente à Devolução/Troca do Pedido #{$devolucaoLocked->pedido_id}",
                    'percentual'           => 0,
                    'valor_fixo'           => $devolucaoLocked->valor_estorno,
                    'valor_inicial'        => $devolucaoLocked->valor_estorno,
                    'saldo_atual'          => $devolucaoLocked->valor_estorno,
                    'tipo'                 => Cupom::TIPO_VALE_COMPRA,
                    'todos_produtos'       => true,
                    'ativo'                => true,
                    'status'               => Cupom::STATUS_ATIVO,
                    'validade'             => now()->addYear(),
                    'condicoes_utilizacao' => 'Crédito válido para futuras compras na loja.',
                    'user_id'              => $devolucaoLocked->user_id,
                    'pedido_origem_id'     => $devolucaoLocked->pedido_id,
                    'devolucao_id'         => $devolucaoLocked->id,
                ]);
            }

            // Restaura os itens devolvidos ao estoque
            if (! empty($devolucaoLocked->itens_devolvidos)) {
                foreach ($devolucaoLocked->itens_devolvidos as $itemDev) {
                    if (! empty($itemDev['item_pedido_id'])) {
                        $itemPedido = \App\Models\ItemPedido::find($itemDev['item_pedido_id']);
                        if ($itemPedido && $itemPedido->variacao) {
                            $qtd = (int) ($itemDev['quantidade'] ?? 1);
                            $itemPedido->variacao->increment('estoque', $qtd);
                        }
                    }
                }
            }

            $devolucaoLocked->update([
                'status'              => 'Concluida',
                'cupom_gerado_codigo' => $cupomCodigo ?: $devolucaoLocked->cupom_gerado_codigo,
                'data_conclusao'      => now(),
            ]);

            return [
                'erro_status'                => null,
                'devolucao'                  => $devolucaoLocked->fresh(),
                'cupom_codigo'               => $cupomCodigo,
                'novo_vale_compra'           => $novoVale,
                'valor_reembolsado_dinheiro' => $valorReembolsado,
                'resumo_beneficios'          => $resumoBeneficios,
                'estorno'                    => $infoEstorno,
            ];
        });

        if (! empty($resultado['erro_status'])) {
            return response()->json($resultado['payload'], $resultado['erro_status']);
        }

        $devolucaoAtualizada = $resultado['devolucao'];
        $cupomCodigo = $resultado['cupom_codigo'];

        if (! empty($devolucaoAtualizada->itens_devolvidos)) {
            try {
                NotificacaoService::sincronizarEstoqueBaixo();
            } catch (\Throwable $e) {
                // ignorar
            }
        }

        // Notificação para o cliente
        if ($cupomCodigo) {
            $msgConclusao = "Sua devolução foi concluída com sucesso! Seu Vale-Compras no valor de R$ " . number_format((float) ($resultado['novo_vale_compra']?->valor_inicial ?? $devolucaoAtualizada->valor_estorno), 2, ',', '.') . " foi gerado ({$cupomCodigo}). Resgate em sua próxima compra!";
        } elseif (($resultado['valor_reembolsado_dinheiro'] ?? 0) <= 0 && ($resultado['resumo_beneficios']['vale_restaurado'] ?? 0) > 0) {
            $msgConclusao = "Sua devolução foi concluída! O saldo de R$ " . number_format((float) $resultado['resumo_beneficios']['vale_restaurado'], 2, ',', '.') . " utilizado no seu vale-compra original foi restaurado.";
        } else {
            $msgConclusao = "Sua devolução foi concluída! O estorno de R$ " . number_format((float) ($resultado['valor_reembolsado_dinheiro'] ?? $devolucaoAtualizada->valor_estorno), 2, ',', '.') . " foi solicitado na sua forma de pagamento.";
        }

        NotificacaoService::notificarCliente(
            $devolucaoAtualizada->user_id,
            'devolucao',
            "Devolução Concluída · Pedido #{$devolucaoAtualizada->pedido_id}",
            $msgConclusao,
            "/minha-conta?aba=pedidos&pedido={$devolucaoAtualizada->pedido_id}",
            $devolucaoAtualizada->id
        );

        // Dispara e-mail avisando conclusão (e entregando o cupom ou comprovando estorno)
        try {
            $destinatario = $devolucaoAtualizada->user?->email ?: $devolucaoAtualizada->pedido?->email_contato;
            if ($destinatario) {
                Mail::to($destinatario)->send(new DevolucaoConcluidaMail($devolucaoAtualizada));
            }
        } catch (\Throwable $e) {
            Log::warning("Falha ao enviar e-mail de devolução concluída (#{$devolucaoAtualizada->id}): " . $e->getMessage());
        }

        return response()->json([
            'message'                    => 'Processo de devolução concluído com sucesso!',
            'devolucao'                  => $devolucaoAtualizada,
            'novo_vale_compra'           => $resultado['novo_vale_compra'],
            'valor_reembolsado_dinheiro' => $resultado['valor_reembolsado_dinheiro'],
            'valor_vale_restaurado'      => $resultado['resumo_beneficios']['vale_restaurado'] ?? 0.0,
            'cupom_restaurado'           => $resultado['resumo_beneficios']['cupom_restaurado'] ?? false,
            'estorno'                    => $resultado['estorno'],
        ]);
    }
}

