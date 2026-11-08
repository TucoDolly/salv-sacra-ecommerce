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

                if ($isUuid) {
                    $resp = Http::withoutVerifying()
                        ->withHeaders([
                            'Accept'        => 'application/json',
                            'Content-Type'  => 'application/json',
                            'Authorization' => 'Bearer ' . trim($token),
                            'User-Agent'    => 'SalvSacraEcommerce (salvsacra2@gmail.com)',
                        ])
                        ->timeout(8)
                        ->post("{$baseUrl}/api/v2/me/shipment/tracking", [
                            'orders' => [$identificador],
                        ]);

                    if ($resp->successful() && isset($resp->json()[$identificador])) {
                        $dados = $resp->json()[$identificador];
                        $statusMe = strtolower($dados['status'] ?? '');
                        $trackingOficial = $dados['tracking'] ?? null;

                        if ($trackingOficial) {
                            $resultado['codigo'] = $trackingOficial;
                            $resultado['link_correios'] = self::obterLinkCorreios($trackingOficial);
                            if ($pedido->codigo_rastreio !== $trackingOficial) {
                                $pedido->update(['codigo_rastreio' => $trackingOficial]);
                            }
                        }

                        $resultado['ultimo_evento'] = "Status Melhor Envio: " . ($dados['status'] ?? 'Em andamento');

                        // Entregue
                        if (in_array($statusMe, ['delivered', 'entregue'], true) && $pedido->status !== 'Entregue') {
                            $this->atualizarParaEntregue($pedido);
                            $resultado['atualizado'] = true;
                            $resultado['novo_status'] = 'Entregue';
                            $resultado['mensagem'] = 'Objeto entregue ao destinatário! Pedido finalizado com sucesso.';
                            return $resultado;
                        }

                        // Postado na agência (muda de Em separação / Pago para Enviado)
                        if (in_array($statusMe, ['posted', 'postado'], true) && in_array($pedido->status, ['Pago', 'Em separação'], true)) {
                            $this->atualizarParaEnviado($pedido);
                            $resultado['atualizado'] = true;
                            $resultado['novo_status'] = 'Enviado';
                            $resultado['mensagem'] = 'Pacote postado na agência dos Correios! Status atualizado para Enviado.';
                            return $resultado;
                        }

                        // Em trânsito
                        if (in_array($statusMe, ['in_transit', 'em_transporte'], true) && $pedido->status !== 'Em transporte' && $pedido->status !== 'Entregue') {
                            $pedido->update(['status' => 'Em transporte']);
                            $resultado['atualizado'] = true;
                            $resultado['novo_status'] = 'Em transporte';
                            $resultado['mensagem'] = 'Pacote em trânsito para a cidade de destino.';
                            return $resultado;
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
                        $orderData = is_array($lista) && isset($lista[0]) ? $lista[0] : (is_array($lista) ? $lista : null);
                        if (! empty($orderData) && ! empty($orderData['status'])) {
                            $statusMe = strtolower($orderData['status']);
                            $resultado['ultimo_evento'] = "Status Melhor Envio: " . ($orderData['status'] ?? 'Em andamento');

                            if (in_array($statusMe, ['delivered', 'entregue'], true) && $pedido->status !== 'Entregue') {
                                $this->atualizarParaEntregue($pedido);
                                $resultado['atualizado'] = true;
                                $resultado['novo_status'] = 'Entregue';
                                $resultado['mensagem'] = 'Objeto entregue ao destinatário! Pedido finalizado com sucesso.';
                                return $resultado;
                            }

                            if (in_array($statusMe, ['posted', 'postado'], true) && in_array($pedido->status, ['Pago', 'Em separação'], true)) {
                                $this->atualizarParaEnviado($pedido);
                                $resultado['atualizado'] = true;
                                $resultado['novo_status'] = 'Enviado';
                                $resultado['mensagem'] = 'Pacote postado na agência dos Correios! Status atualizado para Enviado.';
                                return $resultado;
                            }

                            if (in_array($statusMe, ['in_transit', 'em_transporte'], true) && $pedido->status !== 'Em transporte' && $pedido->status !== 'Entregue') {
                                $pedido->update(['status' => 'Em transporte']);
                                $resultado['atualizado'] = true;
                                $resultado['novo_status'] = 'Em transporte';
                                $resultado['mensagem'] = 'Pacote em trânsito para o destinatário.';
                                return $resultado;
                            }
                        }
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
        $pedido->update(['status' => 'Enviado']);

        try {
            $destinatario = $pedido->email_contato ?: $pedido->user?->email;
            if ($destinatario) {
                Mail::to($destinatario)->send(new StatusPedidoMail($pedido->load('user')));
            }
        } catch (\Throwable $e) {
            Log::error("Erro ao enviar e-mail de postagem do pedido #{$pedido->id}: " . $e->getMessage());
        }
    }

    /**
     * Atualiza o pedido para Entregue e dispara o e-mail transacional para o cliente.
     */
    public function atualizarParaEntregue(Pedido $pedido): void
    {
        $pedido->update(['status' => 'Entregue']);

        try {
            $destinatario = $pedido->email_contato ?: $pedido->user?->email;
            if ($destinatario) {
                Mail::to($destinatario)->send(new StatusPedidoMail($pedido->load('user')));
            }
        } catch (\Throwable $e) {
            Log::error("Erro ao enviar e-mail de entrega do pedido #{$pedido->id}: " . $e->getMessage());
        }
    }

    /**
     * Sincroniza em lote todos os pedidos com envios pendentes (Em separação, Enviado ou Em transporte).
     */
    public function sincronizarTodos(): array
    {
        $pedidos = Pedido::whereIn('status', ['Pago', 'Em separação', 'Enviado', 'Em transporte'])
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

