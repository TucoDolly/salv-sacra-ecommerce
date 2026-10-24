<?php

namespace App\Http\Controllers;

use App\Models\Pedido;
use App\Models\User;
use App\Models\Variacao;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    /**
     * Retorna os dados estatísticos reais e as séries temporais (7 dias e 30 dias)
     * em uma única requisição rápida, permitindo alternância instantânea no frontend sem delay.
     */
    public function index(Request $request): JsonResponse
    {
        $inicioDoMes = Carbon::now()->startOfMonth();
        $fimDoMes    = Carbon::now()->endOfMonth();

        // 1. Faturamento Total (soma real de pedidos com pagamento ou não cancelados)
        $faturamentoTotal = (float) Pedido::where('status', '!=', 'Cancelado')
            ->sum('valor_total');

        // 2. Total de Pedidos Mensais (pedidos criados no mês atual)
        $pedidosMensais = (int) Pedido::whereBetween('data_pedido', [$inicioDoMes, $fimDoMes])->count();

        // 3. Novos Clientes cadastrados
        $novosClientes = (int) User::where('papel', 'cliente')->count();

        // 4. Itens com Estoque Crítico (variações com estoque <= 5 unidades)
        $itensEstoqueCritico = (int) Variacao::where('estoque', '<=', 5)->count();

        // 5. Cálculo das séries de 30 dias (abrange tanto 7d quanto 30d de uma só vez)
        $diasAbreviados = [
            0 => 'Dom',
            1 => 'Seg',
            2 => 'Ter',
            3 => 'Qua',
            4 => 'Qui',
            5 => 'Sex',
            6 => 'Sáb',
        ];

        $inicio30Dias = Carbon::today()->subDays(29);

        // Agrupa pedidos dos últimos 30 dias
        $vendasPorDia = Pedido::where('status', '!=', 'Cancelado')
            ->whereDate('data_pedido', '>=', $inicio30Dias)
            ->get()
            ->groupBy(function ($pedido) {
                return Carbon::parse($pedido->data_pedido)->format('Y-m-d');
            });

        $serie30Dias = [];
        for ($i = 29; $i >= 0; $i--) {
            $dataDia = Carbon::today()->subDays($i);
            $chave = $dataDia->format('Y-m-d');
            $diaSemana = $diasAbreviados[$dataDia->dayOfWeek];

            $totalDia = isset($vendasPorDia[$chave])
                ? (float) $vendasPorDia[$chave]->sum('valor_total')
                : 0.0;

            $serie30Dias[] = [
                'data'     => $chave,
                'dia'      => $diaSemana,
                'data_fmt' => $dataDia->format('d/m'),
                'valor'    => $totalDia,
            ];
        }

        // Os últimos 7 dias são os últimos 7 elementos da série de 30 dias
        $serie7Dias = array_slice($serie30Dias, -7);

        return response()->json([
            'cards' => [
                'faturamento_total'     => $faturamentoTotal,
                'pedidos_mensais'       => $pedidosMensais,
                'novos_clientes'        => $novosClientes,
                'itens_estoque_critico' => $itensEstoqueCritico,
            ],
            // Entrega os dois períodos juntos para alternância instantânea com zero delay
            'graficos' => [
                '7dias'  => $serie7Dias,
                '30dias' => $serie30Dias,
            ],
            // Compatibilidade com o formato anterior
            'grafico_vendas' => $serie7Dias,
        ]);
    }
}
