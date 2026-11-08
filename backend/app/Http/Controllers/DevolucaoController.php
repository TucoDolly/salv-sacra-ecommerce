<?php

namespace App\Http\Controllers;

use App\Mail\DevolucaoAprovadaMail;
use App\Mail\DevolucaoConcluidaMail;
use App\Mail\DevolucaoSolicitadaMail;
use App\Models\Cupom;
use App\Models\Devolucao;
use App\Models\Pedido;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
            'tipo_solicitacao' => ['required', 'string', 'in:cupom,reembolso'],
            'motivo'           => ['required', 'string', 'max:100'],
            'descricao'        => ['nullable', 'string', 'max:1500'],
            'itens'            => ['required', 'array', 'min:1'],
            'itens.*.item_id'  => ['required'],
            'itens.*.quantidade' => ['required', 'integer', 'min:1'],
            'fotos'            => ['nullable'],
            'fotos.*'          => ['nullable', 'file', 'image', 'max:5120'],
        ]);

        $pedido->load('itens.variacao.produto');

        $itensDevolvidos = [];
        $valorTotalItens = 0.0;

        foreach ($validated['itens'] as $itemSol) {
            $itemDb = $pedido->itens->firstWhere('id', (int) $itemSol['item_id']);
            if (!$itemDb) continue;

            $qtd = min((int) $itemSol['quantidade'], (int) $itemDb->quantidade);
            $precoUnitario = (float) $itemDb->preco_unitario;
            $subtotalItem = round($qtd * $precoUnitario, 2);
            $valorTotalItens += $subtotalItem;

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

        // Envia e-mail de confirmação para o cliente
        try {
            $destinatario = $user->email ?: $pedido->email_contato;
            if ($destinatario) {
                Mail::to($destinatario)->send(new DevolucaoSolicitadaMail($devolucao));
            }
        } catch (\Throwable $e) {
            Log::warning("Falha ao enviar e-mail de devolução solicitada (#{$devolucao->id}): " . $e->getMessage());
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
        ]);

        $devolucao->update([
            'status'                  => 'Aprovada',
            'codigo_postagem_reversa' => trim($validated['codigo_postagem_reversa']),
            'prazo_postagem'          => $validated['prazo_postagem'] ?: '7 dias corridos',
            'instrucoes_admin'        => $validated['instrucoes_admin'] ?? null,
            'data_aprovacao'          => now(),
        ]);

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
            'message'   => 'Devolução aprovada com sucesso! Código de postagem reversa enviado ao cliente.',
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

        return response()->json([
            'message'   => 'Solicitação de devolução recusada.',
            'devolucao' => $devolucao->fresh(),
        ]);
    }

    /**
     * Admin conclui a devolução (peças conferidas).
     * Se o cliente pediu cupom, gera um cupom automático no valor exato.
     */
    public function adminConcluir(Request $request, Devolucao $devolucao): JsonResponse
    {
        $cupomCodigo = null;

        if ($devolucao->tipo_solicitacao === 'cupom' && empty($devolucao->cupom_gerado_codigo)) {
            $cupomCodigo = 'TROCA-' . strtoupper(Str::random(6));

            Cupom::create([
                'codigo'         => $cupomCodigo,
                'descricao'      => "Vale-Compras referente à Devolução/Troca do Pedido #{$devolucao->pedido_id}",
                'percentual'     => 100,
                'valor_fixo'     => $devolucao->valor_estorno,
                'tipo'           => 'produto',
                'todos_produtos' => true,
                'ativo'          => true,
            ]);
        }

        $devolucao->update([
            'status'              => 'Concluida',
            'cupom_gerado_codigo' => $cupomCodigo ?: $devolucao->cupom_gerado_codigo,
            'data_conclusao'      => now(),
        ]);

        // Dispara e-mail avisando conclusão (e entregando o cupom ou comprovando estorno)
        try {
            $destinatario = $devolucao->user?->email ?: $devolucao->pedido?->email_contato;
            if ($destinatario) {
                Mail::to($destinatario)->send(new DevolucaoConcluidaMail($devolucao));
            }
        } catch (\Throwable $e) {
            Log::warning("Falha ao enviar e-mail de devolução concluída (#{$devolucao->id}): " . $e->getMessage());
        }

        return response()->json([
            'message'   => 'Processo de devolução concluído com sucesso!',
            'devolucao' => $devolucao->fresh(),
        ]);
    }
}

