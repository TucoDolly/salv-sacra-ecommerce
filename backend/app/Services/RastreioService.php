<?php

namespace App\Services;

use App\Mail\StatusPedidoMail;
use App\Models\Configuracao;
use App\Models\Pedido;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class RastreioService
{
    private static function getAmbiente(): string
    {
        $amb = Configuracao::where('chave', 'melhor_envio_ambiente')->value('valor')
            ?: env('MELHOR_ENVIO_ENV', 'production');
        return str_contains(strtolower($amb), 'sandbox') ? 'sandbox' : 'production';
    }

    private static function getBaseUrl(): string
    {
        return self::getAmbiente() === 'sandbox'
            ? 'https://sandbox.melhorenvio.com.br'
            : 'https://www.melhorenvio.com.br';
    }

    private static function getToken(): ?string
    {
        if (self::getAmbiente() === 'sandbox') {
            $sandboxToken = Configuracao::where('chave', 'melhor_envio_sandbox_token')->value('valor');
            if (!empty($sandboxToken)) return $sandboxToken;
        }

        return Configuracao::where('chave', 'melhor_envio_token')->value('valor')
            ?: env('MELHOR_ENVIO_TOKEN');
    }

    /**
     * Retorna a URL oficial de rastreamento dos Correios para um determinado código.
     */
    public static function obterLinkCorreios(?string $codigo): ?string
    {
        if (empty($codigo)) {
            return null;
        }

        $codigoLimpo = strtoupper(trim($codigo));
        return "https://rastreamento.correios.com.br/app/index.php?codigo={$codigoLimpo}";
    }

    /**
     * Consulta o status do rastreio de um pedido na API do Melhor Envio ou base dos Correios.
     */
    public function consultar(Pedido $pedido): array
    {
        $idMelhorEnvio = trim((string) $pedido->melhor_envio_id);
        $codigoRastreio = strtoupper(trim((string) $pedido->codigo_rastreio));
        $identificador = $idMelhorEnvio ?: $codigoRastreio;

        if (empty($identificador)) {
            return [
                'sucesso'       => false,
                'codigo'        => null,
                'status_pedido' => $pedido->status,
                'mensagem'      => 'Este pedido ainda não possui etiqueta ou código de rastreio cadastrado.',
                'link_correios' => null,
                'atualizado'    => false,
            ];
        }

        $linkCorreios = self::obterLinkCorreios($codigoRastreio ?: $identificador);
        $token = self::getToken();
        $baseUrl = self::getBaseUrl();

        $resultado = [
            'sucesso'       => true,
            'codigo'        => $codigoRastreio ?: $identificador,
            'status_pedido' => $pedido->status,
            'link_correios' => $linkCorreios,
            'ultimo_evento' => null,
            'data_evento'   => null,
            'atualizado'    => false,
            'novo_status'   => $pedido->status,
            'mensagem'      => 'Rastreio disponível no portal oficial dos Correios.',
        ];

        // 1. Se houver token do Melhor Envio configurado
        if (! empty($token)) {
            try {
                $isUuid = (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $identificador);
                $statusMe = null;
                $trackingOficial = null;
                $postedAt = null;
                $deliveredAt = null;

                if ($isUuid) {
                    // Consulta direta dos detalhes do pedido no Melhor Envio por ID
                    $orderResp = Http::withoutVerifying()
                        ->withHeaders([
                            'Accept'        => 'application/json',
                            'Authorization' => 'Bearer ' . trim($token),
                            'User-Agent'    => 'SalvSacraEcommerce (salvsacra2@gmail.com)',
                        ])
                        ->timeout(6)
                        ->get("{$baseUrl}/api/v2/me/orders/{$identificador}");

                    if ($orderResp->successful()) {
                        $orderData = $orderResp->json();
                        $statusMe = strtolower((string) ($orderData['status'] ?? ''));
                        $trackingOficial = $orderData['tracking'] ?? null;
                        $postedAt = $orderData['posted_at'] ?? null;
                        $deliveredAt = $orderData['delivered_at'] ?? null;
                    }

                    // Se não obteve status pelo /orders/{id}, tenta /shipment/tracking
                    if (empty($statusMe)) {
                        $resp = Http::withoutVerifying()
                            ->withHeaders([
                                'Accept'        => 'application/json',
                                'Content-Type'  => 'application/json',
                                'Authorization' => 'Bearer ' . trim($token),
                                'User-Agent'    => 'SalvSacraEcommerce (salvsacra2@gmail.com)',
                            ])
                            ->timeout(6)
                            ->post("{$baseUrl}/api/v2/me/shipment/tracking", [
                                'orders' => [$identificador],
                            ]);

                        if ($resp->successful() && isset($resp->json()[$identificador])) {
                            $dados = $resp->json()[$identificador];
                            $statusMe = strtolower((string) ($dados['status'] ?? ''));
                            $trackingOficial = $dados['tracking'] ?? $trackingOficial;
                            $postedAt = $dados['posted_at'] ?? $postedAt;
                            $deliveredAt = $dados['delivered_at'] ?? $deliveredAt;
                        }
                    }
                } else {
                    // Quando o lojista colou o código dos Correios (ex: NL123456789BR), busca o pedido correspondente no Melhor Envio
                    $searchResp = Http::withoutVerifying()
                        ->withHeaders([
                            'Accept'        => 'application/json',
                            'Authorization' => 'Bearer ' . trim($token),
                            'User-Agent'    => 'SalvSacraEcommerce (salvsacra2@gmail.com)',
                        ])
                        ->timeout(6)
                        ->get("{$baseUrl}/api/v2/me/orders/search?q={$identificador}");

                    if ($searchResp->successful()) {
                        $lista = $searchResp->json();
                        $orderData = null;
                        if (isset($lista['data']) && is_array($lista['data']) && isset($lista['data'][0])) {
                            $orderData = $lista['data'][0];
                        } elseif (is_array($lista) && isset($lista[0])) {
                            $orderData = $lista[0];
                        } elseif (is_array($lista) && isset($lista['id'])) {
                            $orderData = $lista;
                        }

                        if (! empty($orderData)) {
                            $statusMe = strtolower((string) ($orderData['status'] ?? ''));
                            $trackingOficial = $orderData['tracking'] ?? null;
                            $postedAt = $orderData['posted_at'] ?? null;
                            $deliveredAt = $orderData['delivered_at'] ?? null;
                        }
                    }
                }

                if ($trackingOficial) {
                    $resultado['codigo'] = $trackingOficial;
                    $resultado['link_correios'] = self::obterLinkCorreios($trackingOficial);
                    if ($pedido->codigo_rastreio !== $trackingOficial) {
                        $pedido->update(['codigo_rastreio' => $trackingOficial]);
                    }
                }

                if (! empty($statusMe)) {
                    $resultado['ultimo_evento'] = "Status Melhor Envio: " . ucfirst($statusMe);

                    // 1. Entregue
                    if ((in_array($statusMe, ['delivered', 'entregue'], true) || ! empty($deliveredAt)) && $pedido->status !== 'Entregue') {
                        $this->atualizarParaEntregue($pedido);
                        $resultado['atualizado'] = true;
                        $resultado['novo_status'] = 'Entregue';
                        $resultado['mensagem'] = 'Objeto entregue ao destinatário! Pedido finalizado com sucesso.';
                        return $resultado;
                    }

                    // 2. Em trânsito / Postado / Em transporte
                    $isEmTransito = in_array($statusMe, [
                        'in_transit', 'in-transit', 'transit', 'em_transporte', 'em transporte',
                        'em_transito', 'em transito', 'em trânsito', 'posted', 'postado', 'shipped', 'enviado'
                    ], true) || (! empty($postedAt) && empty($deliveredAt));

                    if ($isEmTransito && $pedido->status !== 'Em transporte' && $pedido->status !== 'Entregue' && $pedido->status !== 'Cancelado') {
                        $this->atualizarParaEmTransporte($pedido);
                        $resultado['atualizado'] = true;
                        $resultado['novo_status'] = 'Em transporte';
                        $resultado['mensagem'] = 'Pacote em trânsito para o destinatário.';
                        return $resultado;
                    }
                }
            } catch (\Throwable $e) {
                Log::warning("Erro ao consultar rastreio Melhor Envio: " . $e->getMessage());
            }
        }

        return $resultado;
    }

    /**
     * Atualiza o pedido para Enviado e dispara o e-mail de aviso de postagem para o cliente.
     */
    public function atualizarParaEnviado(Pedido $pedido): void
    {
        $statusAnterior = $pedido->status;
        $pedido->update(['status' => 'Enviado']);

        if ($statusAnterior !== 'Enviado') {
            try {
                $destinatario = $pedido->email_contato ?: $pedido->user?->email;
                if ($destinatario) {
                    Mail::to($destinatario)->send(new StatusPedidoMail($pedido->load('user')));
                }
            } catch (\Throwable $e) {
                Log::error("Erro ao enviar e-mail de postagem do pedido #{$pedido->id}: " . $e->getMessage());
            }

            if ($pedido->user_id) {
                NotificacaoService::notificarCliente(
                    $pedido->user_id,
                    'pedido',
                    "Pedido #{$pedido->id} Postado nos Correios!",
                    "Seu pedido foi postado nos Correios. Código de rastreio: " . ($pedido->codigo_rastreio ?: 'Disponível em breve') . ". Acompanhe a entrega!",
                    "/minha-conta?aba=pedidos&pedido={$pedido->id}",
                    $pedido->id
                );
            }
        }
    }

    /**
     * Atualiza o pedido para Em transporte e dispara o e-mail transacional para o cliente caso ainda não enviado.
     */
    public function atualizarParaEmTransporte(Pedido $pedido): void
    {
        $statusAnterior = $pedido->status;
        $pedido->update(['status' => 'Em transporte']);

        if ($statusAnterior !== 'Em transporte') {
            try {
                $destinatario = $pedido->email_contato ?: $pedido->user?->email;
                if ($destinatario) {
                    Mail::to($destinatario)->send(new StatusPedidoMail($pedido->load('user')));
                }
            } catch (\Throwable $e) {
                Log::error("Erro ao enviar e-mail de envio do pedido #{$pedido->id}: " . $e->getMessage());
            }

            if ($pedido->user_id) {
                NotificacaoService::notificarCliente(
                    $pedido->user_id,
                    'pedido',
                    "Pedido #{$pedido->id} Em Transporte!",
                    "Seu pacote já está a caminho do seu endereço! Acompanhe o rastreio " . ($pedido->codigo_rastreio ?: '') . ".",
                    "/minha-conta?aba=pedidos&pedido={$pedido->id}",
                    $pedido->id
                );
            }
        }
    }

    /**
     * Atualiza o pedido para Entregue e dispara o e-mail transacional para o cliente.
     */
    public function atualizarParaEntregue(Pedido $pedido): void
    {
        $statusAnterior = $pedido->status;
        $pedido->update(['status' => 'Entregue']);

        if ($statusAnterior !== 'Entregue') {
            try {
                $destinatario = $pedido->email_contato ?: $pedido->user?->email;
                if ($destinatario) {
                    Mail::to($destinatario)->send(new StatusPedidoMail($pedido->load('user')));
                }
            } catch (\Throwable $e) {
                Log::error("Erro ao enviar e-mail de entrega do pedido #{$pedido->id}: " . $e->getMessage());
            }

            if ($pedido->user_id) {
                NotificacaoService::notificarCliente(
                    $pedido->user_id,
                    'pedido',
                    "Pedido #{$pedido->id} Entregue!",
                    "Oba! Seu pedido foi entregue com sucesso. Esperamos que você ame suas peças Salv Sacra!",
                    "/minha-conta?aba=pedidos&pedido={$pedido->id}",
                    $pedido->id
                );
            }
        }
    }

    /**
     * Verifica e sincroniza em segundo plano throttled (permite sincronização a cada 5s ao recarregar a tela).
     */
    public static function sincronizarSeNecessario(bool $forcar = false): void
    {
        $ultimoSync = \Illuminate\Support\Facades\Cache::get('melhor_envio_ultimo_sync');
        if (! $forcar && $ultimoSync && (now()->timestamp - $ultimoSync) < 5) {
            return;
        }
        \Illuminate\Support\Facades\Cache::put('melhor_envio_ultimo_sync', now()->timestamp, 30);

        try {
            app(self::class)->sincronizarTodos();
        } catch (\Throwable $e) {
            Log::warning("Erro ao sincronizar automaticamente Melhor Envio: " . $e->getMessage());
        }
    }

    /**
     * Sincroniza em lote todos os pedidos com envios pendentes (Em separação, Em montagem, Enviado ou Em transporte).
     */
    public function sincronizarTodos(): array
    {
        $pedidos = Pedido::whereIn('status', ['Pago', 'Em separação', 'Em montagem', 'Enviado', 'Em transporte'])
            ->where(function ($q) {
                $q->where(function ($sub) {
                    $sub->whereNotNull('codigo_rastreio')->where('codigo_rastreio', '!=', '');
                })->orWhere(function ($sub) {
                    $sub->whereNotNull('melhor_envio_id')->where('melhor_envio_id', '!=', '');
                });
            })
            ->get();

        $total = $pedidos->count();
        $atualizados = 0;
        $detalhes = [];

        foreach ($pedidos as $pedido) {
            $res = $this->consultar($pedido);
            if ($res['atualizado']) {
                $atualizados++;
            }
            $detalhes[] = [
                'pedido_id'   => $pedido->id,
                'codigo'      => $pedido->codigo_rastreio,
                'status'      => $res['novo_status'] ?? $pedido->status,
                'atualizado'  => $res['atualizado'],
            ];
        }

        return [
            'total_verificados' => $total,
            'total_atualizados' => $atualizados,
            'pedidos'           => $detalhes,
        ];
    }
}

