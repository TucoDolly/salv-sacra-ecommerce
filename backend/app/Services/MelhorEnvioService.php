<?php

namespace App\Services;

use App\Models\Configuracao;
use App\Models\Pedido;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MelhorEnvioService
{
    /**
     * Identifica se está operando em sandbox ou produção.
     */
    private function getAmbiente(): string
    {
        $amb = Configuracao::where('chave', 'melhor_envio_ambiente')->value('valor')
            ?: env('MELHOR_ENVIO_ENV', 'production');
        return str_contains(strtolower($amb), 'sandbox') ? 'sandbox' : 'production';
    }

    /**
     * URL base da API do Melhor Envio (produção ou sandbox).
     */
    private function getBaseUrl(): string
    {
        return $this->getAmbiente() === 'sandbox'
            ? 'https://sandbox.melhorenvio.com.br'
            : 'https://www.melhorenvio.com.br';
    }

    /**
     * Obtém o token de acesso da loja conforme o ambiente ativo.
     */
    private function getToken(): ?string
    {
        if ($this->getAmbiente() === 'sandbox') {
            $sandboxToken = Configuracao::where('chave', 'melhor_envio_sandbox_token')->value('valor');
            if (!empty($sandboxToken)) return $sandboxToken;
        }

        return Configuracao::where('chave', 'melhor_envio_token')->value('valor')
            ?: env('MELHOR_ENVIO_TOKEN');
    }

    /**
     * Envia o pedido diretamente para o Carrinho do Melhor Envio via API v2.
     * Assim, o administrador só precisa entrar no site do Melhor Envio para pagar e imprimir,
     * sem precisar digitar dados de destinatário, endereço ou medidas manualmente.
     */
    public function inserirNoCarrinho(Pedido $pedido, ?string $cpfSobrescrito = null): array
    {
        $token = $this->getToken();
        if (empty($token)) {
            return [
                'sucesso'  => false,
                'mensagem' => 'Token do Melhor Envio não configurado no painel da loja.',
            ];
        }

        $cpfDestinatario = preg_replace('/\D/', '', $cpfSobrescrito ?: ($pedido->user?->cpf ?? ''));
        if (strlen($cpfDestinatario) !== 11) {
            return [
                'sucesso'  => false,
                'mensagem' => 'O cliente não possui um CPF válido de 11 dígitos cadastrado. Verifique ou informe o CPF do cliente.',
            ];
        }

        // Se veio CPF informado e o cliente ainda não possuía no banco, salva no perfil dele
        if ($pedido->user && (empty($pedido->user->cpf) || $pedido->user->cpf !== $cpfDestinatario)) {
            try {
                $pedido->user->update(['cpf' => $cpfDestinatario]);
            } catch (\Throwable $e) {
                Log::warning('Não foi possível salvar CPF no usuário: ' . $e->getMessage());
            }
        }

        $qtdTotal = $pedido->itens->sum('quantidade') ?: 1;
        $valorTotal = max(1.00, (float) $pedido->valor_total);

        // Identifica a modalidade: 2 = Correios SEDEX, 1 = Correios PAC
        $tipoFrete = strtolower($pedido->tipo_frete ?? '');
        $serviceId = str_contains($tipoFrete, 'sedex') ? 2 : 1;

        // Dimensões estimadas para camisetas (máximo 30cm altura para múltiplos itens)
        $alturaCm = min(30, max(4, $qtdTotal * 3));
        $pesoKg   = round(max(0.3, $qtdTotal * 0.25), 2);

        $payload = [
            'service' => $serviceId,
            'agency'  => null,
            'from'    => [
                'name'        => 'SALV SACRA ECOMMERCE',
                'phone'       => '48991234567',
                'email'       => 'salvsacra2@gmail.com',
                'document'    => '08459623963',
                'address'     => 'Rua Manoel Antunes Corrêa',
                'complement'  => '',
                'number'      => '2171',
                'district'    => 'Oficinas',
                'city'        => 'Tubarão',
                'country_id'  => 'BR',
                'postal_code' => '88702280',
                'state_abbr'  => 'SC',
                'note'        => '',
            ],
            'to'      => [
                'name'        => trim($pedido->user?->name ?: 'Cliente Salv Sacra'),
                'phone'       => preg_replace('/\D/', '', $pedido->telefone ?: $pedido->user?->telefone ?: '48999998888'),
                'email'       => trim($pedido->email_contato ?: $pedido->user?->email ?: 'cliente@salvsacra.com'),
                'document'    => $cpfDestinatario,
                'address'     => trim($pedido->logradouro ?: 'Rua Principal'),
                'complement'  => trim($pedido->complemento ?: ''),
                'number'      => trim($pedido->numero ?: 'S/N'),
                'district'    => trim($pedido->bairro ?: 'Centro'),
                'city'        => trim($pedido->cidade ?: 'Tubarão'),
                'country_id'  => 'BR',
                'postal_code' => preg_replace('/\D/', '', $pedido->cep),
                'state_abbr'  => strtoupper(trim($pedido->estado ?: 'SC')),
                'note'        => '',
            ],
            'products' => [
                [
                    'name'          => 'Camiseta Religiosa Salv Sacra',
                    'quantity'      => $qtdTotal,
                    'unitary_value' => round($valorTotal / $qtdTotal, 2),
                ],
            ],
            'volumes' => [
                [
                    'height' => $alturaCm,
                    'width'  => 22,
                    'length' => 28,
                    'weight' => $pesoKg,
                ],
            ],
            'options' => [
                'insurance_value' => round($valorTotal, 2),
                'receipt'         => false,
                'own_hand'        => false,
                'reverse'         => false,
                'non_commercial'  => true,
                'platform'        => 'Salv Sacra Ecommerce',
            ],
        ];

        try {
            $response = Http::withoutVerifying()
                ->withHeaders([
                    'Accept'        => 'application/json',
                    'Content-Type'  => 'application/json',
                    'Authorization' => 'Bearer ' . trim($token),
                    'User-Agent'    => 'SalvSacraEcommerce (salvsacra2@gmail.com)',
                ])
                ->timeout(10)
                ->post("{$this->getBaseUrl()}/api/v2/me/cart", $payload);

            if ($response->successful()) {
                $data = $response->json();
                $shipmentId = $data['id'] ?? null;
                $protocol   = $data['protocol'] ?? '';

                if ($shipmentId) {
                    $pedido->update([
                        'melhor_envio_id' => $shipmentId,
                        'status'          => 'Em separação', // Mantém Em separação enquanto embala
                    ]);
                }

                return [
                    'sucesso'         => true,
                    'mensagem'        => 'Pedido inserido no carrinho do Melhor Envio com sucesso! O pacote já está pronto para pagamento e impressão.',
                    'melhor_envio_id' => $shipmentId,
                    'protocol'        => $protocol,
                    'link_carrinho'   => 'https://app.melhorenvio.com.br/carrinho',
                ];
            }

            $erro = $response->json('message') ?? $response->json('error') ?? 'Erro ao conectar com o Melhor Envio.';
            Log::warning('Erro ao inserir no carrinho do Melhor Envio: ', $response->json() ?: [$response->body()]);

            return [
                'sucesso'  => false,
                'mensagem' => "O Melhor Envio recusou a requisição: {$erro}",
            ];
        } catch (\Throwable $e) {
            Log::error('Exceção ao inserir no carrinho Melhor Envio: ' . $e->getMessage());
            return [
                'sucesso'  => false,
                'mensagem' => 'Falha de comunicação com a API do Melhor Envio: ' . $e->getMessage(),
            ];
        }
    }
}

