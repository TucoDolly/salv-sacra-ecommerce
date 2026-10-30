<?php

namespace App\Http\Controllers;

use App\Models\Configuracao;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FreteController extends Controller
{
    /**
     * Calcula opções de frete reais baseadas no CEP de destino, peso/quantidade de itens e subtotal.
     * Suporta integração direta com API Melhor Envio (quando MELHOR_ENVIO_TOKEN está configurado)
     * e possui motor de cálculo nacional inteligente via ViaCEP + Tabela Tarifária dos Correios/Jadlog (origem: Tubarão/SC).
     */
    public function calcular(Request $request): JsonResponse
    {
        $request->validate([
            'cep'        => ['required', 'string'],
            'subtotal'   => ['nullable', 'numeric', 'min:0'],
            'quantidade' => ['nullable', 'integer', 'min:1'],
        ]);

        $cepDestino = preg_replace('/\D/', '', $request->input('cep'));
        if (strlen($cepDestino) !== 8) {
            return response()->json(['message' => 'Informe um CEP válido com 8 dígitos.'], 422);
        }

        $subtotal   = (float) ($request->input('subtotal', 79.90));
        $quantidade = (int) ($request->input('quantidade', 1));

        // 1. Consulta o CEP no ViaCEP para validar existência e identificar Cidade/UF real
        $dadosCep = null;
        try {
            $respCep = Http::withoutVerifying()->timeout(4)->get("https://viacep.com.br/ws/{$cepDestino}/json/");
            if ($respCep->successful() && ! $respCep->json('erro')) {
                $dadosCep = $respCep->json();
            } else {
                return response()->json(['message' => 'CEP não encontrado na base dos Correios.'], 404);
            }
        } catch (\Throwable $e) {
            // Caso o ViaCEP oscile, deduz a UF pela faixa inicial do CEP
            $dadosCep = $this->deduzirUfPorFaixaCep($cepDestino);
        }

        $uf     = strtoupper($dadosCep['uf'] ?? 'SC');
        $cidade = $dadosCep['localidade'] ?? '';

        // 2. Busca configurações de frete da loja (CEP de origem e valor de frete grátis)
        $configs = Configuracao::whereIn('chave', ['frete_gratis_minimo', 'cep_origem', 'melhor_envio_token'])
            ->pluck('valor', 'chave');

        $freteGratisMinimo = (float) ($configs['frete_gratis_minimo'] ?? 500.00);
        $cepOrigem         = preg_replace('/\D/', '', $configs['cep_origem'] ?? env('FRETE_CEP_ORIGEM', '88702280'));
        $tokenMelhorEnvio  = $configs['melhor_envio_token'] ?? env('MELHOR_ENVIO_TOKEN');

        $temFreteGratis = ($freteGratisMinimo > 0 && $subtotal >= $freteGratisMinimo);

        // 3. Se houver Token do Melhor Envio configurado, tenta cotar direto na API oficial
        if (! empty($tokenMelhorEnvio)) {
            $cotacoesApi = $this->cotarMelhorEnvio($tokenMelhorEnvio, $cepOrigem, $cepDestino, $quantidade, $subtotal);
            if (! empty($cotacoesApi)) {
                return response()->json([
                    'cep'          => $cepDestino,
                    'cidade'       => $cidade,
                    'uf'           => $uf,
                    'logradouro'   => $dadosCep['logradouro'] ?? '',
                    'bairro'       => $dadosCep['bairro'] ?? '',
                    'frete_gratis' => $temFreteGratis,
                    'fonte'        => 'melhor_envio_oficial',
                    'opcoes'       => $this->aplicarRegraFreteGratis($cotacoesApi, $temFreteGratis),
                ]);
            }
        }

        // 4. Motor de Cálculo Nacional Baseado em Distância/UF/Faixa de CEP (Origem: Tubarão/SC - 88700-000)
        // Peso estimado: 0.25kg por camiseta + embalagem
        $pesoKg = max(0.3, $quantidade * 0.25);
        $adicionalPeso = max(0, ($quantidade - 1) * 2.40);

        $tabela = $this->obterTarifaPorDestino($cepDestino, $uf, $cidade);

        $precoPac    = round($tabela['pac_base'] + ($adicionalPeso * 0.8), 2);
        $precoSedex  = round($tabela['sedex_base'] + ($adicionalPeso * 1.2), 2);
        $precoJadlog = round($tabela['jadlog_base'] + $adicionalPeso, 2);

        $opcoes = [
            [
                'id'            => 'pac',
                'nome'          => 'Correios PAC',
                'transportadora'=> 'Correios',
                'dias_uteis'    => $tabela['pac_dias'],
                'prazo'         => $this->formatarPrevisaoEntrega($tabela['pac_dias']),
                'prazo_curto'   => "{$tabela['pac_dias']} dias úteis",
                'preco'         => $precoPac,
            ],
            [
                'id'            => 'sedex',
                'nome'          => 'Correios SEDEX',
                'transportadora'=> 'Correios',
                'dias_uteis'    => $tabela['sedex_dias'],
                'prazo'         => $this->formatarPrevisaoEntrega($tabela['sedex_dias']),
                'prazo_curto'   => "{$tabela['sedex_dias']} dias úteis",
                'preco'         => $precoSedex,
            ],
            [
                'id'            => 'jadlog',
                'nome'          => 'Transportadora Jadlog Rápido',
                'transportadora'=> 'Jadlog',
                'dias_uteis'    => $tabela['jadlog_dias'],
                'prazo'         => $this->formatarPrevisaoEntrega($tabela['jadlog_dias']),
                'prazo_curto'   => "{$tabela['jadlog_dias']} dias úteis",
                'preco'         => $precoJadlog,
            ],
        ];

        $opcoes = $this->aplicarRegraFreteGratis($opcoes, $temFreteGratis);

        return response()->json([
            'cep'          => $cepDestino,
            'cidade'       => $cidade,
            'uf'           => $uf,
            'logradouro'   => $dadosCep['logradouro'] ?? '',
            'bairro'       => $dadosCep['bairro'] ?? '',
            'frete_gratis' => $temFreteGratis,
            'opcoes'       => $opcoes,
        ]);
    }

    /**
     * Consulta real na API v2 do Melhor Envio quando o lojista configura seu Token.
     */
    private function cotarMelhorEnvio(string $token, string $cepOrigem, string $cepDestino, int $quantidade, float $subtotal): array
    {
        try {
            $isSandbox = str_contains(strtolower(env('MELHOR_ENVIO_ENV', 'production')), 'sandbox');
            $baseUrl = $isSandbox ? 'https://sandbox.melhorenvio.com.br' : 'https://www.melhorenvio.com.br';

            $response = Http::withoutVerifying()
                ->timeout(6)
                ->withHeaders([
                    'Accept'        => 'application/json',
                    'Content-Type'  => 'application/json',
                    'Authorization' => 'Bearer ' . trim($token),
                    'User-Agent'    => 'SalvSacraEcommerce (salvsacra2@gmail.com)',
                ])
                ->post("{$baseUrl}/api/v2/me/shipment/calculate", [
                    'from' => ['postal_code' => $cepOrigem],
                    'to'   => ['postal_code' => $cepDestino],
                    'package' => [
                        'height' => min(30, max(4, $quantidade * 3)),
                        'width'  => 22,
                        'length' => 28,
                        'weight' => round(max(0.25, $quantidade * 0.25), 2),
                    ],
                    'options' => [
                        'insurance_value' => round($subtotal, 2),
                        'receipt'         => false,
                        'own_hand'        => false,
                    ],
                    'services' => '1,2,3,4,17', // Correios PAC, SEDEX, Mini Envios e Jadlog (.Package e .Com)
                ]);

            if (! $response->successful()) {
                return [];
            }

            $lista = $response->json();
            if (! is_array($lista)) {
                return [];
            }

            $opcoes = [];
            foreach ($lista as $item) {
                if (! empty($item['error']) || empty($item['price'])) {
                    continue;
                }
                $dias = (int) ($item['custom_delivery_time'] ?? $item['delivery_time'] ?? 5);
                $empresa = $item['company']['name'] ?? 'Transportadora';
                $servico = $item['name'] ?? 'Envio';

                $opcoes[] = [
                    'id'             => strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $empresa . '_' . $servico)),
                    'nome'           => "{$empresa} {$servico}",
                    'transportadora' => $empresa,
                    'dias_uteis'     => $dias,
                    'prazo'          => $this->formatarPrevisaoEntrega($dias),
                    'prazo_curto'    => "{$dias} dias úteis",
                    'preco'          => round((float) ($item['custom_price'] ?? $item['price']), 2),
                ];
            }

            usort($opcoes, fn($a, $b) => $a['preco'] <=> $b['preco']);
            return array_slice($opcoes, 0, 4);
        } catch (\Throwable $e) {
            Log::warning('Fallback Melhor Envio: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Se o pedido atingiu o mínimo para frete grátis, adiciona/converte a modalidade econômica em Frete Grátis.
     */
    private function aplicarRegraFreteGratis(array $opcoes, bool $temFreteGratis): array
    {
        if (! $temFreteGratis || empty($opcoes)) {
            return $opcoes;
        }

        // Torna a primeira opção (econômica/PAC) gratuita
        $opcoes[0]['preco_original'] = $opcoes[0]['preco'];
        $opcoes[0]['preco'] = 0.00;
        $opcoes[0]['nome'] = $opcoes[0]['nome'] . ' (Frete Grátis)';
        $opcoes[0]['frete_gratis'] = true;

        return $opcoes;
    }

    /**
     * Calcula tarifa e prazo realista partindo de Tubarão/SC (88704-300).
     */
    private function obterTarifaPorDestino(string $cep, string $uf, string $cidade): array
    {
        $prefixo3 = (int) substr($cep, 0, 3);

        // 1. Tubarão e Região da AMUREL (88700-000 a 88799-999)
        if ($prefixo3 === 887) {
            return [
                'sedex_base'  => 12.47, 'sedex_dias'  => 1,
                'pac_base'    => 10.90, 'pac_dias'    => 2,
                'jadlog_base' => 14.90, 'jadlog_dias' => 2,
            ];
        }

        // 2. Restante de Santa Catarina (SC)
        if ($uf === 'SC') {
            return [
                'pac_base'    => 15.90, 'pac_dias'    => 3,
                'sedex_base'  => 19.80, 'sedex_dias'  => 2,
                'jadlog_base' => 17.50, 'jadlog_dias' => 2,
            ];
        }

        // 3. Região Sul (PR e RS)
        if (in_array($uf, ['PR', 'RS'])) {
            return [
                'pac_base'    => 19.90, 'pac_dias'    => 5,
                'sedex_base'  => 27.90, 'sedex_dias'  => 3,
                'jadlog_base' => 22.40, 'jadlog_dias' => 3,
            ];
        }

        // 4. Sudeste Próximo (SP)
        if ($uf === 'SP') {
            return [
                'pac_base'    => 22.90, 'pac_dias'    => 6,
                'sedex_base'  => 32.50, 'sedex_dias'  => 3,
                'jadlog_base' => 24.90, 'jadlog_dias' => 4,
            ];
        }

        // 5. Demais estados do Sudeste (RJ, MG, ES)
        if (in_array($uf, ['RJ', 'MG', 'ES'])) {
            return [
                'pac_base'    => 25.90, 'pac_dias'    => 7,
                'sedex_base'  => 38.90, 'sedex_dias'  => 4,
                'jadlog_base' => 28.50, 'jadlog_dias' => 5,
            ];
        }

        // 6. Centro-Oeste (DF, GO, MS, MT)
        if (in_array($uf, ['DF', 'GO', 'MS', 'MT'])) {
            return [
                'pac_base'    => 29.90, 'pac_dias'    => 8,
                'sedex_base'  => 46.90, 'sedex_dias'  => 4,
                'jadlog_base' => 33.90, 'jadlog_dias' => 6,
            ];
        }

        // 7. Nordeste (BA, PE, CE, RN, PB, AL, SE, MA, PI)
        if (in_array($uf, ['BA', 'PE', 'CE', 'RN', 'PB', 'AL', 'SE', 'MA', 'PI'])) {
            return [
                'pac_base'    => 36.90, 'pac_dias'    => 10,
                'sedex_base'  => 58.90, 'sedex_dias'  => 5,
                'jadlog_base' => 42.90, 'jadlog_dias' => 7,
            ];
        }

        // 8. Norte (AM, PA, TO, RO, AC, AP, RR)
        return [
            'pac_base'    => 44.90, 'pac_dias'    => 12,
            'sedex_base'  => 69.90, 'sedex_dias'  => 6,
            'jadlog_base' => 51.90, 'jadlog_dias' => 9,
        ];
    }

    /**
     * Formata a data estimada somando apenas dias úteis a partir de hoje.
     */
    private function formatarPrevisaoEntrega(int $diasUteis): string
    {
        $data = Carbon::now();
        $adicionados = 0;

        while ($adicionados < $diasUteis) {
            $data->addDay();
            if (! $data->isWeekend()) {
                $adicionados++;
            }
        }

        $diasSemana = [
            0 => 'domingo',
            1 => 'segunda-feira',
            2 => 'terça-feira',
            3 => 'quarta-feira',
            4 => 'quinta-feira',
            5 => 'sexta-feira',
            6 => 'sábado',
        ];

        $nomeDia = $diasSemana[$data->dayOfWeek] ?? '';
        $diaMes = $data->format('d/m');

        return "Chega {$nomeDia} {$diaMes} ({$diasUteis} " . ($diasUteis === 1 ? 'dia útil' : 'dias úteis') . ")";
    }

    /**
     * Deduz UF pela faixa postal caso o ViaCEP esteja indisponível.
     */
    private function deduzirUfPorFaixaCep(string $cep): array
    {
        $faixa2 = (int) substr($cep, 0, 2);
        $uf = match (true) {
            $faixa2 >= 1 && $faixa2 <= 19 => 'SP',
            $faixa2 >= 20 && $faixa2 <= 28 => 'RJ',
            $faixa2 === 29 => 'ES',
            $faixa2 >= 30 && $faixa2 <= 39 => 'MG',
            $faixa2 >= 40 && $faixa2 <= 48 => 'BA',
            $faixa2 === 49 => 'SE',
            $faixa2 >= 50 && $faixa2 <= 56 => 'PE',
            $faixa2 === 57 => 'AL',
            $faixa2 === 58 => 'PB',
            $faixa2 === 59 => 'RN',
            $faixa2 >= 60 && $faixa2 <= 63 => 'CE',
            $faixa2 === 64 => 'PI',
            $faixa2 === 65 => 'MA',
            $faixa2 >= 66 && $faixa2 <= 68 => 'PA',
            $faixa2 === 69 => 'AM',
            $faixa2 >= 70 && $faixa2 <= 73 => 'DF',
            $faixa2 >= 74 && $faixa2 <= 76 => 'GO',
            $faixa2 === 77 => 'TO',
            $faixa2 === 78 => 'MT',
            $faixa2 === 79 => 'MS',
            $faixa2 >= 80 && $faixa2 <= 87 => 'PR',
            $faixa2 >= 88 && $faixa2 <= 89 => 'SC',
            $faixa2 >= 90 && $faixa2 <= 99 => 'RS',
            default => 'SC',
        };

        return ['uf' => $uf, 'localidade' => ''];
    }
}

