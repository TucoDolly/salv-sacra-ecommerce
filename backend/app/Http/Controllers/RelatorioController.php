<?php

namespace App\Http\Controllers;

use App\Models\ItemPedido;
use App\Models\Pedido;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RelatorioController extends Controller
{
    /**
     * Retorna métricas consolidadas de faturamento e vendas por período.
     * Suporta períodos: 'hoje', '7dias', '30dias', 'mes_atual', 'ano_atual' ou 'custom' (data_inicio e data_fim).
     */
    public function index(Request $request): JsonResponse
    {
        $periodo = $request->input('periodo', '30dias');
        $agora = Carbon::now();

        switch ($periodo) {
            case 'hoje':
                $inicio = Carbon::today()->startOfDay();
                $fim    = Carbon::today()->endOfDay();
                break;
            case '7dias':
                $inicio = Carbon::today()->subDays(6)->startOfDay();
                $fim    = Carbon::today()->endOfDay();
                break;
            case 'mes_atual':
                $inicio = Carbon::now()->startOfMonth()->startOfDay();
                $fim    = Carbon::now()->endOfMonth()->endOfDay();
                break;
            case 'ano_atual':
                $inicio = Carbon::now()->startOfYear()->startOfDay();
                $fim    = Carbon::now()->endOfYear()->endOfDay();
                break;
            case 'custom':
                $inicio = $request->filled('data_inicio')
                    ? Carbon::parse($request->input('data_inicio'))->startOfDay()
                    : Carbon::today()->subDays(29)->startOfDay();
                $fim    = $request->filled('data_fim')
                    ? Carbon::parse($request->input('data_fim'))->endOfDay()
                    : Carbon::today()->endOfDay();
                break;
            case '30dias':
            default:
                $inicio = Carbon::today()->subDays(29)->startOfDay();
                $fim    = Carbon::today()->endOfDay();
                break;
        }

        // Base de pedidos no período
        $pedidosQuery = Pedido::whereBetween('data_pedido', [$inicio, $fim]);

        // Total de pedidos realizados e pedidos pagos/concluídos
        $totalPedidosRealizados = (clone $pedidosQuery)->count();
        $pedidosValidos = (clone $pedidosQuery)->where('status', '!=', 'Cancelado')->get();
        $totalPedidosValidos = $pedidosValidos->count();
        $pedidosCancelados   = (clone $pedidosQuery)->where('status', 'Cancelado')->count();

        // Faturamento no período
        $faturamentoTotal = (float) $pedidosValidos->sum('valor_total');
        $faturamentoFrete = (float) $pedidosValidos->sum('valor_frete');
        $faturamentoLiquido = max(0, $faturamentoTotal - $faturamentoFrete);

        // Ticket Médio
        $ticketMedio = $totalPedidosValidos > 0 ? ($faturamentoTotal / $totalPedidosValidos) : 0;

        // Taxa de Conversão de Pedidos (Válidos / Realizados)
        $taxaAprovacao = $totalPedidosRealizados > 0
            ? round(($totalPedidosValidos / $totalPedidosRealizados) * 100, 1)
            : 0;

        // Distribuição por Método de Pagamento
        $pagamentosAgrupados = $pedidosValidos->groupBy('metodo_pagamento');
        $resumoPagamentos = [];
        $metodosNomes = [
            'pix'    => 'PIX',
            'cartao' => 'Cartão de Crédito',
            'boleto' => 'Boleto Bancário',
        ];

        foreach ($pagamentosAgrupados as $metodo => $pedidosGrupo) {
            $metodoKey = strtolower($metodo ?: 'outros');
            $nomeExibicao = $metodosNomes[$metodoKey] ?? ucfirst($metodoKey);
            $totalMetodo = (float) $pedidosGrupo->sum('valor_total');
            $qtdMetodo   = $pedidosGrupo->count();
            $porcentagem = $faturamentoTotal > 0 ? round(($totalMetodo / $faturamentoTotal) * 100, 1) : 0;

            $resumoPagamentos[] = [
                'metodo'      => $nomeExibicao,
                'total'       => $totalMetodo,
                'quantidade'  => $qtdMetodo,
                'porcentagem' => $porcentagem,
            ];
        }

        // Top 5 Produtos Mais Vendidos no Período
        $pedidosIdsValidos = $pedidosValidos->pluck('id');
        $topProdutosItens = ItemPedido::with(['variacao.produto'])
            ->whereIn('pedido_id', $pedidosIdsValidos)
            ->get();

        $produtosMaisVendidosMap = [];
        foreach ($topProdutosItens as $item) {
            $produto = $item->variacao?->produto;
            if (!$produto) continue;

            $prodId = $produto->id;
            if (!isset($produtosMaisVendidosMap[$prodId])) {
                $produtosMaisVendidosMap[$prodId] = [
                    'id'          => $produto->id,
                    'nome'        => $produto->nome,
                    'imagem_url'  => $produto->imagem_url,
                    'categoria'   => $produto->categoria?->nome ?? 'Camisetas',
                    'qtd_total'   => 0,
                    'valor_total' => 0,
                ];
            }

            $produtosMaisVendidosMap[$prodId]['qtd_total']   += (int) $item->quantidade;
            $produtosMaisVendidosMap[$prodId]['valor_total'] += (float) ($item->quantidade * $item->preco_unitario);
        }

        // Ordena pelos mais vendidos
        usort($produtosMaisVendidosMap, fn($a, $b) => $b['qtd_total'] <=> $a['qtd_total']);
        $topProdutos = array_slice(array_values($produtosMaisVendidosMap), 0, 5);

        // Lista detalhada dos pedidos do relatório para visualização ou exportação
        $listaPedidos = Pedido::with('user')
            ->whereBetween('data_pedido', [$inicio, $fim])
            ->orderBy('data_pedido', 'desc')
            ->get()
            ->map(function ($p) {
                return [
                    'id'               => $p->id,
                    'cliente'          => $p->user?->name ?? 'Cliente',
                    'email'            => $p->email_contato ?? $p->user?->email,
                    'data'             => $p->data_pedido?->format('d/m/Y H:i'),
                    'status'           => $p->status,
                    'metodo_pagamento' => strtoupper($p->metodo_pagamento ?? 'PIX'),
                    'valor_frete'      => (float) $p->valor_frete,
                    'valor_total'      => (float) $p->valor_total,
                ];
            });

        return response()->json([
            'periodo_selecionado' => $periodo,
            'intervalo' => [
                'inicio' => $inicio->format('d/m/Y'),
                'fim'    => $fim->format('d/m/Y'),
            ],
            'kpis' => [
                'faturamento_total'   => $faturamentoTotal,
                'faturamento_frete'   => $faturamentoFrete,
                'faturamento_liquido' => $faturamentoLiquido,
                'pedidos_realizados'  => $totalPedidosRealizados,
                'pedidos_validos'     => $totalPedidosValidos,
                'pedidos_cancelados'  => $pedidosCancelados,
                'ticket_medio'        => round($ticketMedio, 2),
                'taxa_aprovacao'      => $taxaAprovacao,
            ],
            'pagamentos'    => $resumoPagamentos,
            'top_produtos'  => $topProdutos,
            'pedidos'       => $listaPedidos,
        ]);
    }
}
