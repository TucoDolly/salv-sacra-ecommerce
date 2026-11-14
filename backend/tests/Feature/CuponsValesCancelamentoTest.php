<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\Configuracao;
use App\Models\Cupom;
use App\Models\CupomHistorico;
use App\Models\Devolucao;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\User;
use App\Models\Variacao;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CuponsValesCancelamentoTest extends TestCase
{
    use DatabaseTransactions;

    protected User $cliente;
    protected User $admin;
    protected Produto $produto;
    protected Variacao $variacao;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();
        Http::fake([
            'https://api.mercadopago.com/*' => Http::response(['id' => 998877, 'status' => 'approved'], 200),
            '*'                             => Http::response([], 200),
        ]);

        // Mantém gateway em modo simulado durante os testes sem depender de credenciais externas
        Configuracao::whereIn('chave', ['mercadopago_access_token', 'mercadopago_modo_pagamento'])->delete();

        $sufixo = uniqid();
        $this->cliente = User::create([
            'name'     => 'Cliente Teste Salv Sacra',
            'email'    => "cliente.{$sufixo}@test.local",
            'password' => bcrypt('senha123456'),
            'papel'    => 'cliente',
        ]);

        $this->admin = User::create([
            'name'     => 'Admin Teste Salv Sacra',
            'email'    => "admin.{$sufixo}@test.local",
            'password' => bcrypt('senha123456'),
            'papel'    => 'admin',
        ]);

        $categoria = Categoria::create([
            'nome'      => "Camisetas {$sufixo}",
            'descricao' => 'Categoria de teste automatizado',
        ]);

        $this->produto = Produto::create([
            'nome'         => 'Camiseta Católica Teste',
            'descricao'    => 'Peça de teste',
            'preco_base'   => 100.00,
            'disponivel'   => true,
            'categoria_id' => $categoria->id,
        ]);

        $this->variacao = Variacao::create([
            'produto_id' => $this->produto->id,
            'modelo'     => 'Tradicional',
            'tamanho'    => 'M',
            'cor'        => 'Preta',
            'estoque'    => 20,
        ]);
    }

    private function criarCupom(string $codigo, string $tipo, float $percentual, array $extras = []): Cupom
    {
        return Cupom::create(array_merge([
            'codigo'              => strtoupper($codigo),
            'descricao'           => "Cupom {$codigo}",
            'percentual'          => $percentual,
            'valor_fixo'          => 0,
            'valor_inicial'       => 0,
            'saldo_atual'         => 0,
            'tipo'                => $tipo,
            'todos_produtos'      => true,
            'ativo'               => true,
            'status'              => Cupom::STATUS_ATIVO,
            'validade'            => now()->addDays(30),
            'valor_minimo_pedido' => 0,
            'limite_usos'         => 5,
            'usos_atuais'         => 0,
        ], $extras));
    }

    private function criarVale(float $valor, ?User $dono = null, ?string $codigo = null, array $extras = []): Cupom
    {
        $codigoFinal = strtoupper($codigo ?: ('VALE-' . substr(uniqid(), -6)));
        return Cupom::create(array_merge([
            'codigo'              => $codigoFinal,
            'descricao'           => "Vale-compra teste R$ {$valor}",
            'percentual'          => 0,
            'valor_fixo'          => $valor,
            'valor_inicial'       => $valor,
            'saldo_atual'         => $valor,
            'tipo'                => Cupom::TIPO_VALE_COMPRA,
            'todos_produtos'      => true,
            'ativo'               => true,
            'status'              => Cupom::STATUS_ATIVO,
            'validade'            => now()->addDays(180),
            'valor_minimo_pedido' => 0,
            'limite_usos'         => null,
            'usos_atuais'         => 0,
            'user_id'             => ($dono ?? $this->cliente)->id,
        ], $extras));
    }

    private function payloadCheckout(float $precoProduto, float $frete = 0.0, array $extras = []): array
    {
        return array_merge([
            'email_contato'    => $this->cliente->email,
            'telefone'         => '11999998888',
            'cep'              => '01001000',
            'logradouro'       => 'Praça da Sé',
            'numero'           => '100',
            'bairro'           => 'Sé',
            'cidade'           => 'São Paulo',
            'estado'           => 'SP',
            'tipo_frete'       => 'PAC',
            'valor_frete'      => $frete,
            'metodo_pagamento' => 'cartao',
            'itens'            => [
                [
                    'produto_id'  => $this->produto->id,
                    'variacao_id' => $this->variacao->id,
                    'quantidade'  => 1,
                    'preco'       => $precoProduto,
                ],
            ],
        ], $extras);
    }

    public function test_01_nao_permite_combinar_dois_cupons_promocionais_mas_permite_combinar_cupom_e_vale_compra(): void
    {
        Sanctum::actingAs($this->cliente);

        $cupomProd = $this->criarCupom('PROD20', Cupom::TIPO_PRODUTO, 20);
        $cupomFrete = $this->criarCupom('FRETE100', Cupom::TIPO_FRETE, 100);
        $vale = $this->criarVale(50.00);

        $itens = [['produto_id' => $this->produto->id, 'quantidade' => 1, 'preco' => 100.00]];

        // Bloqueia combinação de cupom de produto + cupom de frete na validação
        $respBloq = $this->postJson('/api/cupons/validar', [
            'codigos'     => [$cupomProd->codigo, $cupomFrete->codigo],
            'itens'       => $itens,
            'valor_frete' => 20.00,
        ]);
        $respBloq->assertStatus(422);

        // Permite cupom de produto + vale-compra
        $respProdVale = $this->postJson('/api/cupons/validar', [
            'codigos'     => [$cupomProd->codigo, $vale->codigo],
            'itens'       => $itens,
            'valor_frete' => 20.00,
        ]);
        $respProdVale->assertOk()
            ->assertJsonPath('valido', true)
            ->assertJsonPath('valor_desconto_produto', 20)
            ->assertJsonPath('valor_vale_compra', 50)
            ->assertJsonPath('valor_pago_dinheiro', 50);

        // Permite cupom de frete + vale-compra
        $respFreteVale = $this->postJson('/api/cupons/validar', [
            'codigos'     => [$cupomFrete->codigo, $vale->codigo],
            'itens'       => $itens,
            'valor_frete' => 20.00,
        ]);
        $respFreteVale->assertOk()
            ->assertJsonPath('valido', true)
            ->assertJsonPath('valor_desconto_frete', 20)
            ->assertJsonPath('valor_frete_pago', 0)
            ->assertJsonPath('valor_vale_compra', 50)
            ->assertJsonPath('valor_pago_dinheiro', 50);

        // Bloqueia também no checkout direto
        $respCheckout = $this->postJson('/api/pedidos', $this->payloadCheckout(100.00, 20.00, [
            'codigos' => [$cupomProd->codigo, $cupomFrete->codigo],
        ]));
        $respCheckout->assertStatus(422);
    }

    public function test_02_uso_parcial_de_vale_compra_mantem_saldo_restante_ativo_e_registra_historico(): void
    {
        Sanctum::actingAs($this->cliente);

        $vale = $this->criarVale(50.00, $this->cliente, 'VALE50');

        $resp = $this->postJson('/api/pedidos', $this->payloadCheckout(20.00, 0.00, [
            'vale_compra_codigo' => $vale->codigo,
            'metodo_pagamento'   => 'vale_compra',
        ]));

        $resp->assertStatus(201);
        $pedidoId = $resp->json('pedido.id');
        $pedido = Pedido::findOrFail($pedidoId);

        $this->assertEquals('Pago', $pedido->status);
        $this->assertEquals(20.00, (float) $pedido->valor_vale_compra);
        $this->assertEquals(0.00, (float) $pedido->valor_pago_dinheiro);

        $vale->refresh();
        $this->assertEquals(Cupom::STATUS_ATIVO, $vale->status);
        $this->assertTrue($vale->ativo);
        $this->assertEquals(30.00, (float) $vale->saldo_atual);
        $this->assertEquals(30.00, (float) $vale->valor_fixo);
        $this->assertEquals(50.00, (float) $vale->valor_inicial);

        $historico = CupomHistorico::where('cupom_id', $vale->id)
            ->where('pedido_id', $pedido->id)
            ->where('tipo_evento', 'utilizacao')
            ->first();

        $this->assertNotNull($historico);
        $this->assertEquals(20.00, (float) $historico->valor);
        $this->assertEquals(50.00, (float) $historico->saldo_anterior);
        $this->assertEquals(30.00, (float) $historico->saldo_novo);
    }

    public function test_03_cenario_a_cancelamento_com_cupom_desconto_em_ambas_opcoes_e_cupom_100_por_cento(): void
    {
        Sanctum::actingAs($this->cliente);

        // Subcaso 1: Cupom 20% + Pagamento em dinheiro (R$ 80,00) + Reembolso
        $cupom = $this->criarCupom('DESC20A', Cupom::TIPO_PRODUTO, 20, ['limite_usos' => 1]);
        $respPedido1 = $this->postJson('/api/pedidos', $this->payloadCheckout(100.00, 0.00, [
            'cupom_codigo' => $cupom->codigo,
        ]))->assertStatus(201);
        $pedido1 = Pedido::findOrFail($respPedido1->json('pedido.id'));

        $cupom->refresh();
        $this->assertEquals(1, $cupom->usos_atuais);
        $this->assertEquals(Cupom::STATUS_ESGOTADO, $cupom->status);

        $this->getJson("/api/pedidos/{$pedido1->id}/opcoes-restituicao")
            ->assertOk()
            ->assertJsonPath('permite_reembolso_dinheiro', true)
            ->assertJsonPath('opcao_reembolso.valor_reembolso_dinheiro', 80)
            ->assertJsonPath('opcao_vale_compra.valor_novo_vale', 80);

        $this->postJson("/api/pedidos/{$pedido1->id}/cancelar", ['tipo_restituicao' => 'reembolso'])
            ->assertOk()
            ->assertJsonPath('tipo_restituicao', 'reembolso')
            ->assertJsonPath('valor_reembolsado_dinheiro', 80)
            ->assertJsonPath('cupom_restaurado', true);

        $cupom->refresh();
        $this->assertEquals(0, $cupom->usos_atuais);
        $this->assertEquals(Cupom::STATUS_ATIVO, $cupom->status);
        $this->assertTrue($cupom->ativo);
        $this->assertEquals(20, $this->variacao->fresh()->estoque);

        // Subcaso 2: Mesmo cupom reutilizado após restauração, agora cancelado escolhendo vale_compra
        $respPedido2 = $this->postJson('/api/pedidos', $this->payloadCheckout(100.00, 0.00, [
            'cupom_codigo' => $cupom->codigo,
        ]))->assertStatus(201);
        $pedido2 = Pedido::findOrFail($respPedido2->json('pedido.id'));

        $respCanc2 = $this->postJson("/api/pedidos/{$pedido2->id}/cancelar", ['tipo_restituicao' => 'vale_compra'])
            ->assertOk()
            ->assertJsonPath('tipo_restituicao', 'vale_compra')
            ->assertJsonPath('cupom_restaurado', true);

        $novoValeId = $respCanc2->json('novo_vale_compra.id');
        $novoVale = Cupom::findOrFail($novoValeId);
        $this->assertEquals(Cupom::TIPO_VALE_COMPRA, $novoVale->tipo);
        $this->assertEquals(80.00, (float) $novoVale->valor_inicial);
        $this->assertEquals(80.00, (float) $novoVale->saldo_atual);
        $this->assertEquals($pedido2->id, $novoVale->pedido_origem_id);
        $this->assertEquals(0, $cupom->fresh()->usos_atuais);

        // Subcaso 3: Cupom 100% (valor_pago_dinheiro == 0)
        $cupom100 = $this->criarCupom('CEM100', Cupom::TIPO_PRODUTO, 100, ['limite_usos' => 1]);
        $respPedido3 = $this->postJson('/api/pedidos', $this->payloadCheckout(100.00, 0.00, [
            'cupom_codigo' => $cupom100->codigo,
        ]))->assertStatus(201);
        $pedido3 = Pedido::findOrFail($respPedido3->json('pedido.id'));
        $this->assertEquals(0.00, (float) $pedido3->valor_pago_dinheiro);

        $this->getJson("/api/pedidos/{$pedido3->id}/opcoes-restituicao")
            ->assertOk()
            ->assertJsonPath('permite_reembolso_dinheiro', false)
            ->assertJsonPath('opcao_vale_compra.disponivel', false);

        // Solicitar reembolso em dinheiro quando pago == 0 retorna 422
        $this->postJson("/api/pedidos/{$pedido3->id}/cancelar", ['tipo_restituicao' => 'reembolso'])
            ->assertStatus(422);

        // Cancelamento padrão restaura apenas o cupom 100%, sem emitir vale-compra
        $this->postJson("/api/pedidos/{$pedido3->id}/cancelar")
            ->assertOk()
            ->assertJsonPath('valor_reembolsado_dinheiro', 0)
            ->assertJsonPath('cupom_restaurado', true)
            ->assertJsonPath('novo_vale_compra', null);

        $this->assertEquals(0, $cupom100->fresh()->usos_atuais);
        $this->assertEquals(Cupom::STATUS_ATIVO, $cupom100->fresh()->status);
        $this->assertEquals(0, Cupom::where('pedido_origem_id', $pedido3->id)->count());
    }

    public function test_04_cenario_b_compra_100_por_cento_vale_compra_bloqueia_reembolso_e_restaura_vale_original_sem_duplicar(): void
    {
        Sanctum::actingAs($this->cliente);

        $vale = $this->criarVale(70.00, $this->cliente, 'VALE70B');

        $respPedido = $this->postJson('/api/pedidos', $this->payloadCheckout(70.00, 0.00, [
            'vale_compra_codigo' => $vale->codigo,
            'metodo_pagamento'   => 'vale_compra',
        ]))->assertStatus(201);

        $pedido = Pedido::findOrFail($respPedido->json('pedido.id'));
        $this->assertEquals(70.00, (float) $pedido->valor_vale_compra);
        $this->assertEquals(0.00, (float) $pedido->valor_pago_dinheiro);

        $vale->refresh();
        $this->assertEquals(0.00, (float) $vale->saldo_atual);
        $this->assertEquals(Cupom::STATUS_ESGOTADO, $vale->status);

        $this->getJson("/api/pedidos/{$pedido->id}/opcoes-restituicao")
            ->assertOk()
            ->assertJsonPath('permite_reembolso_dinheiro', false)
            ->assertJsonPath('opcao_reembolso.disponivel', false)
            ->assertJsonPath('opcao_reembolso.valor_vale_restaurar', 70)
            ->assertJsonPath('opcao_vale_compra.restaura_vale_original', true);

        // Tentativa explícita de reembolso em dinheiro deve falhar claramente (422)
        $this->postJson("/api/pedidos/{$pedido->id}/cancelar", ['tipo_restituicao' => 'reembolso'])
            ->assertStatus(422);

        // Cancelamento restaura o vale original de R$ 70,00 sem gerar um segundo vale-compra
        $this->postJson("/api/pedidos/{$pedido->id}/cancelar")
            ->assertOk()
            ->assertJsonPath('valor_reembolsado_dinheiro', 0)
            ->assertJsonPath('valor_vale_restaurado', 70)
            ->assertJsonPath('novo_vale_compra', null);

        $vale->refresh();
        $this->assertEquals(70.00, (float) $vale->saldo_atual);
        $this->assertEquals(Cupom::STATUS_ATIVO, $vale->status);
        $this->assertTrue($vale->ativo);
        $this->assertEquals(
            1,
            Cupom::where('tipo', Cupom::TIPO_VALE_COMPRA)->where('user_id', $this->cliente->id)->count()
        );
        $this->assertTrue(
            CupomHistorico::where('cupom_id', $vale->id)->where('pedido_id', $pedido->id)->where('tipo_evento', 'restauracao')->exists()
        );
    }

    public function test_05_cenario_c_vale_parcial_dinheiro_opcoes_mutuamente_exclusivas(): void
    {
        Sanctum::actingAs($this->cliente);

        // Opção 1: Produto 100, Vale 70, Dinheiro Cartão 30 em 3x -> Cancelar escolhendo REEMBOLSO
        $vale1 = $this->criarVale(70.00, $this->cliente, 'VALE70C1');
        $resp1 = $this->postJson('/api/pedidos', $this->payloadCheckout(100.00, 0.00, [
            'vale_compra_codigo' => $vale1->codigo,
            'metodo_pagamento'   => 'cartao',
            'cartao_dados'       => [
                'titular'  => 'APRO TESTE',
                'numero'   => '4111111111111111',
                'validade' => '12/30',
                'cvv'      => '123',
                'parcelas' => 3,
            ],
        ]))->assertStatus(201);
        $pedido1 = Pedido::findOrFail($resp1->json('pedido.id'));

        $this->assertEquals(70.00, (float) $pedido1->valor_vale_compra);
        $this->assertEquals(30.00, (float) $pedido1->valor_pago_dinheiro);

        $this->getJson("/api/pedidos/{$pedido1->id}/opcoes-restituicao")
            ->assertOk()
            ->assertJsonPath('permite_reembolso_dinheiro', true)
            ->assertJsonPath('opcao_reembolso.valor_reembolso_dinheiro', 30)
            ->assertJsonPath('opcao_reembolso.valor_vale_restaurar', 70)
            ->assertJsonPath('opcao_vale_compra.valor_novo_vale', 100)
            ->assertJsonPath('parcelamento_cartao.aplicavel', true)
            ->assertJsonPath('parcelamento_cartao.parcelas', 3)
            ->assertJsonPath('parcelamento_cartao.valor_parcela', 10);

        $this->postJson("/api/pedidos/{$pedido1->id}/cancelar", ['tipo_restituicao' => 'reembolso'])
            ->assertOk()
            ->assertJsonPath('valor_reembolsado_dinheiro', 30)
            ->assertJsonPath('valor_vale_restaurado', 70)
            ->assertJsonPath('novo_vale_compra', null);

        $this->assertEquals(70.00, (float) $vale1->fresh()->saldo_atual);
        $this->assertEquals(Cupom::STATUS_ATIVO, $vale1->fresh()->status);

        // Opção 2: Produto 100, Vale 70, Dinheiro 30 -> Cancelar escolhendo VALE-COMPRA (novo vale 100, sem restaurar vale original)
        $vale2 = $this->criarVale(70.00, $this->cliente, 'VALE70C2');
        $resp2 = $this->postJson('/api/pedidos', $this->payloadCheckout(100.00, 0.00, [
            'vale_compra_codigo' => $vale2->codigo,
        ]))->assertStatus(201);
        $pedido2 = Pedido::findOrFail($resp2->json('pedido.id'));

        $canc2 = $this->postJson("/api/pedidos/{$pedido2->id}/cancelar", ['tipo_restituicao' => 'vale_compra'])
            ->assertOk()
            ->assertJsonPath('tipo_restituicao', 'vale_compra')
            ->assertJsonPath('valor_reembolsado_dinheiro', 0)
            ->assertJsonPath('valor_vale_restaurado', 0);

        $novoVale = Cupom::findOrFail($canc2->json('novo_vale_compra.id'));
        $this->assertEquals(100.00, (float) $novoVale->valor_inicial);
        $this->assertEquals(100.00, (float) $novoVale->saldo_atual);
        $this->assertEquals($this->cliente->id, $novoVale->user_id);
        $this->assertEquals($pedido2->id, $novoVale->pedido_origem_id);

        // Vale original NÃO foi restaurado separadamente
        $vale2->refresh();
        $this->assertEquals(0.00, (float) $vale2->saldo_atual);
        $this->assertEquals(Cupom::STATUS_ESGOTADO, $vale2->status);
    }

    public function test_06_cenario_d_combinado_cupom_vale_dinheiro_nunca_converte_desconto_promocional_em_vale(): void
    {
        Sanctum::actingAs($this->cliente);

        // Subcaso 1: Reembolso (Produto 100 - Cupom 10% [10] - Vale 70 = 20 dinheiro)
        $cupom1 = $this->criarCupom('PROMO10D1', Cupom::TIPO_PRODUTO, 10);
        $vale1 = $this->criarVale(70.00, $this->cliente, 'VALE70D1');

        $resp1 = $this->postJson('/api/pedidos', $this->payloadCheckout(100.00, 0.00, [
            'codigos' => [$cupom1->codigo, $vale1->codigo],
        ]))->assertStatus(201);
        $pedido1 = Pedido::findOrFail($resp1->json('pedido.id'));

        $this->assertEquals(10.00, (float) $pedido1->valor_desconto_produto);
        $this->assertEquals(70.00, (float) $pedido1->valor_vale_compra);
        $this->assertEquals(20.00, (float) $pedido1->valor_pago_dinheiro);

        $this->postJson("/api/pedidos/{$pedido1->id}/cancelar", ['tipo_restituicao' => 'reembolso'])
            ->assertOk()
            ->assertJsonPath('valor_reembolsado_dinheiro', 20)
            ->assertJsonPath('valor_vale_restaurado', 70)
            ->assertJsonPath('cupom_restaurado', true)
            ->assertJsonPath('novo_vale_compra', null);

        $this->assertEquals(70.00, (float) $vale1->fresh()->saldo_atual);
        $this->assertEquals(0, $cupom1->fresh()->usos_atuais);

        // Subcaso 2: Vale-compra (novo vale deve ser exatamente R$ 90,00 = 70 vale + 20 dinheiro, NUNCA 100) + cupom 10% restaurado
        $cupom2 = $this->criarCupom('PROMO10D2', Cupom::TIPO_PRODUTO, 10);
        $vale2 = $this->criarVale(70.00, $this->cliente, 'VALE70D2');

        $resp2 = $this->postJson('/api/pedidos', $this->payloadCheckout(100.00, 0.00, [
            'codigos' => [$cupom2->codigo, $vale2->codigo],
        ]))->assertStatus(201);
        $pedido2 = Pedido::findOrFail($resp2->json('pedido.id'));

        $canc2 = $this->postJson("/api/pedidos/{$pedido2->id}/cancelar", ['tipo_restituicao' => 'vale_compra'])
            ->assertOk()
            ->assertJsonPath('valor_reembolsado_dinheiro', 0)
            ->assertJsonPath('valor_vale_restaurado', 0)
            ->assertJsonPath('cupom_restaurado', true);

        $novoVale = Cupom::findOrFail($canc2->json('novo_vale_compra.id'));
        $this->assertEquals(90.00, (float) $novoVale->valor_inicial);
        $this->assertEquals(90.00, (float) $novoVale->saldo_atual);

        // Vale original permanece consumido (incorporado ao novo vale de 90) e cupom 10% restaurado
        $this->assertEquals(0.00, (float) $vale2->fresh()->saldo_atual);
        $this->assertEquals(0, $cupom2->fresh()->usos_atuais);
        $this->assertEquals(Cupom::STATUS_ATIVO, $cupom2->fresh()->status);
    }

    public function test_07_cenario_e_cupom_frete_gratis_e_frete_pago_na_restituicao(): void
    {
        Sanctum::actingAs($this->cliente);

        // 1. Com cupom de frete grátis 100%: Produto 100 + Frete 25 - Frete 25 = 100 pago (não converte frete grátis em vale)
        $cupomFrete = $this->criarCupom('FRETE100E', Cupom::TIPO_FRETE, 100, ['limite_usos' => 1]);
        $resp1 = $this->postJson('/api/pedidos', $this->payloadCheckout(100.00, 25.00, [
            'cupom_codigo' => $cupomFrete->codigo,
        ]))->assertStatus(201);
        $pedido1 = Pedido::findOrFail($resp1->json('pedido.id'));

        $this->assertEquals(25.00, (float) $pedido1->valor_desconto_frete);
        $this->assertEquals(0.00, (float) $pedido1->valor_frete_pago);
        $this->assertEquals(100.00, (float) $pedido1->valor_pago_dinheiro);

        $canc1 = $this->postJson("/api/pedidos/{$pedido1->id}/cancelar", ['tipo_restituicao' => 'vale_compra'])
            ->assertOk()
            ->assertJsonPath('cupom_restaurado', true);

        $novoVale1 = Cupom::findOrFail($canc1->json('novo_vale_compra.id'));
        $this->assertEquals(100.00, (float) $novoVale1->valor_inicial);
        $this->assertEquals(0, $cupomFrete->fresh()->usos_atuais);
        $this->assertEquals(Cupom::STATUS_ATIVO, $cupomFrete->fresh()->status);

        // 2. Com frete efetivamente pago pelo cliente: Produto 100 + Frete pago 25 = 125 pago (entra integralmente na restituição)
        $resp2 = $this->postJson('/api/pedidos', $this->payloadCheckout(100.00, 25.00))->assertStatus(201);
        $pedido2 = Pedido::findOrFail($resp2->json('pedido.id'));

        $this->assertEquals(25.00, (float) $pedido2->valor_frete_pago);
        $this->assertEquals(125.00, (float) $pedido2->valor_pago_dinheiro);

        $this->postJson("/api/pedidos/{$pedido2->id}/cancelar", ['tipo_restituicao' => 'reembolso'])
            ->assertOk()
            ->assertJsonPath('valor_reembolsado_dinheiro', 125);
    }

    public function test_08_cancelamento_pelo_admin_aplica_reembolso_automatico_e_restaura_vale_e_cupom(): void
    {
        Sanctum::actingAs($this->cliente);

        $cupom = $this->criarCupom('ADMIN10', Cupom::TIPO_PRODUTO, 10);
        $vale = $this->criarVale(70.00, $this->cliente, 'VALE70ADM');

        $respPedido = $this->postJson('/api/pedidos', $this->payloadCheckout(100.00, 0.00, [
            'codigos' => [$cupom->codigo, $vale->codigo],
        ]))->assertStatus(201);
        $pedido = Pedido::findOrFail($respPedido->json('pedido.id'));

        // Admin cancela via painel administrativo
        Sanctum::actingAs($this->admin);
        $respAdmin = $this->patchJson("/api/admin/pedidos/{$pedido->id}/status", [
            'status' => 'Cancelado',
        ])->assertOk();

        $respAdmin->assertJsonPath('pedido.status', 'Cancelado')
            ->assertJsonPath('restituicao.tipo_restituicao', 'reembolso')
            ->assertJsonPath('restituicao.valor_reembolsado_dinheiro', 20)
            ->assertJsonPath('restituicao.valor_vale_restaurado', 70)
            ->assertJsonPath('restituicao.cupom_restaurado', true);

        $this->assertEquals(70.00, (float) $vale->fresh()->saldo_atual);
        $this->assertEquals(Cupom::STATUS_ATIVO, $vale->fresh()->status);
        $this->assertEquals(0, $cupom->fresh()->usos_atuais);
        $this->assertEquals(20, $this->variacao->fresh()->estoque);
        $this->assertEquals(0, Cupom::where('pedido_origem_id', $pedido->id)->count());
    }

    public function test_09_devolucao_pos_entrega_segue_regras_de_reembolso_e_vale_compra_para_cenarios_b_c_d(): void
    {
        // --- Cenário D após entrega escolhendo vale_compra ---
        // Mesmo com preco_base > preco_unitario, o desconto promocional de 10% NUNCA vira vale-compra
        $this->produto->update(['preco_base' => 150.00]);

        Sanctum::actingAs($this->cliente);
        $cupomD = $this->criarCupom('DEV10D', Cupom::TIPO_PRODUTO, 10);
        $valeD = $this->criarVale(70.00, $this->cliente, 'VALEDEV70');

        $respD = $this->postJson('/api/pedidos', $this->payloadCheckout(100.00, 0.00, [
            'codigos' => [$cupomD->codigo, $valeD->codigo],
        ]))->assertStatus(201);
        $pedidoD = Pedido::findOrFail($respD->json('pedido.id'));
        $pedidoD->update(['status' => 'Entregue']);

        $respSolD = $this->postJson("/api/pedidos/{$pedidoD->id}/devolucoes", [
            'tipo_solicitacao' => 'vale_compra',
            'motivo'           => 'Tamanho incorreto',
        ])->assertStatus(201);
        $devolucaoD = Devolucao::findOrFail($respSolD->json('devolucao.id'));
        $this->assertEquals(90.00, (float) $devolucaoD->valor_estorno);

        Sanctum::actingAs($this->admin);
        $respConcD = $this->putJson("/api/admin/devolucoes/{$devolucaoD->id}/concluir")
            ->assertOk()
            ->assertJsonPath('cupom_restaurado', true)
            ->assertJsonPath('valor_vale_restaurado', 0);

        $novoValeD = Cupom::findOrFail($respConcD->json('novo_vale_compra.id'));
        $this->assertEquals(90.00, (float) $novoValeD->valor_inicial);
        $this->assertEquals(90.00, (float) $novoValeD->saldo_atual);
        $this->assertEquals(0.00, (float) $valeD->fresh()->saldo_atual);
        $this->assertEquals(0, $cupomD->fresh()->usos_atuais);

        // --- Cenário B após entrega (100% vale-compra) ---
        Sanctum::actingAs($this->cliente);
        $valeB = $this->criarVale(70.00, $this->cliente, 'VALEDEVB70');
        $respB = $this->postJson('/api/pedidos', $this->payloadCheckout(70.00, 0.00, [
            'vale_compra_codigo' => $valeB->codigo,
            'metodo_pagamento'   => 'vale_compra',
        ]))->assertStatus(201);
        $pedidoB = Pedido::findOrFail($respB->json('pedido.id'));
        $pedidoB->update(['status' => 'Entregue']);

        // Solicitar reembolso em dinheiro quando pago == 0 é bloqueado
        $this->postJson("/api/pedidos/{$pedidoB->id}/devolucoes", [
            'tipo_solicitacao' => 'reembolso',
            'motivo'           => 'Arrependimento',
        ])->assertStatus(422);

        $respSolB = $this->postJson("/api/pedidos/{$pedidoB->id}/devolucoes", [
            'tipo_solicitacao' => 'vale_compra',
            'motivo'           => 'Arrependimento',
        ])->assertStatus(201);
        $devolucaoB = Devolucao::findOrFail($respSolB->json('devolucao.id'));

        Sanctum::actingAs($this->admin);
        $this->putJson("/api/admin/devolucoes/{$devolucaoB->id}/concluir")
            ->assertOk()
            ->assertJsonPath('valor_vale_restaurado', 70)
            ->assertJsonPath('novo_vale_compra', null);

        $this->assertEquals(70.00, (float) $valeB->fresh()->saldo_atual);
        $this->assertEquals(Cupom::STATUS_ATIVO, $valeB->fresh()->status);
        $this->assertEquals(0, Cupom::where('pedido_origem_id', $pedidoB->id)->count());

        // --- Cenário C após entrega escolhendo reembolso (Vale 70 + Dinheiro 30) ---
        Sanctum::actingAs($this->cliente);
        $valeC = $this->criarVale(70.00, $this->cliente, 'VALEDEVC70');
        $respC = $this->postJson('/api/pedidos', $this->payloadCheckout(100.00, 0.00, [
            'vale_compra_codigo' => $valeC->codigo,
        ]))->assertStatus(201);
        $pedidoC = Pedido::findOrFail($respC->json('pedido.id'));
        $pedidoC->update(['status' => 'Entregue']);

        $respSolC = $this->postJson("/api/pedidos/{$pedidoC->id}/devolucoes", [
            'tipo_solicitacao' => 'reembolso',
            'motivo'           => 'Defeito',
        ])->assertStatus(201);
        $devolucaoC = Devolucao::findOrFail($respSolC->json('devolucao.id'));
        $this->assertEquals(30.00, (float) $devolucaoC->valor_estorno);

        Sanctum::actingAs($this->admin);
        $this->putJson("/api/admin/devolucoes/{$devolucaoC->id}/concluir")
            ->assertOk()
            ->assertJsonPath('valor_reembolsado_dinheiro', 30)
            ->assertJsonPath('valor_vale_restaurado', 70)
            ->assertJsonPath('novo_vale_compra', null);

        $this->assertEquals(70.00, (float) $valeC->fresh()->saldo_atual);
        $this->assertEquals(0, Cupom::where('pedido_origem_id', $pedidoC->id)->count());
    }

    public function test_10_cupom_expirado_durante_pedido_recebe_extensao_de_validade_ao_restaurar_e_bloqueio_chargeback(): void
    {
        Sanctum::actingAs($this->cliente);

        $cupom = $this->criarCupom('EXPIRAR30', Cupom::TIPO_PRODUTO, 20, ['limite_usos' => 1]);
        $respPedido = $this->postJson('/api/pedidos', $this->payloadCheckout(100.00, 0.00, [
            'cupom_codigo' => $cupom->codigo,
        ]))->assertStatus(201);
        $pedido = Pedido::findOrFail($respPedido->json('pedido.id'));

        // Simula expiração do cupom enquanto o pedido estava em processamento
        $cupom->update([
            'validade' => now()->subDay(),
            'status'   => Cupom::STATUS_EXPIRADO,
            'ativo'    => false,
        ]);

        // Ao cancelar escolhendo vale_compra, o cupom recebe nova validade (+30 dias) e gera vale com pedido_origem_id
        $canc = $this->postJson("/api/pedidos/{$pedido->id}/cancelar", ['tipo_restituicao' => 'vale_compra'])
            ->assertOk()
            ->assertJsonPath('cupom_restaurado', true);

        $cupom->refresh();
        $this->assertEquals(Cupom::STATUS_ATIVO, $cupom->status);
        $this->assertTrue($cupom->ativo);
        $this->assertTrue($cupom->validade->greaterThan(now()->addDays(25)));
        $this->assertEquals(0, $cupom->usos_atuais);

        $valeGerado = Cupom::findOrFail($canc->json('novo_vale_compra.id'));
        $this->assertEquals($pedido->id, $valeGerado->pedido_origem_id);

        // Contestação bancária / Chargeback / MED: admin bloqueia os vales originados do pedido
        Sanctum::actingAs($this->admin);
        $this->postJson("/api/admin/pedidos/{$pedido->id}/bloquear-vales", [
            'motivo' => 'Chargeback / MED contestado no banco',
        ])->assertOk();

        $valeGerado->refresh();
        $this->assertEquals(Cupom::STATUS_REVOGADO, $valeGerado->status);
        $this->assertFalse($valeGerado->ativo);

        // Cliente não consegue mais validar/utilizar o vale bloqueado
        Sanctum::actingAs($this->cliente);
        $this->postJson('/api/cupons/validar', [
            'codigo'      => $valeGerado->codigo,
            'itens'       => [['produto_id' => $this->produto->id, 'quantidade' => 1, 'preco' => 100.00]],
            'valor_frete' => 0.00,
        ])->assertStatus(422);
    }

    public function test_11_idempotencia_em_cancelamento_e_devolucao_concluida_repetidos(): void
    {
        // 1. Idempotência no cancelamento repetido
        Sanctum::actingAs($this->cliente);
        $cupom = $this->criarCupom('IDEMP10', Cupom::TIPO_PRODUTO, 10, ['limite_usos' => 2]);
        $respPedido = $this->postJson('/api/pedidos', $this->payloadCheckout(100.00, 0.00, [
            'cupom_codigo' => $cupom->codigo,
        ]))->assertStatus(201);
        $pedido = Pedido::findOrFail($respPedido->json('pedido.id'));
        $this->assertEquals(19, $this->variacao->fresh()->estoque);

        $this->postJson("/api/pedidos/{$pedido->id}/cancelar", ['tipo_restituicao' => 'vale_compra'])
            ->assertOk();

        // Segundo clique repetido deve ser rejeitado sem duplicar vale, estoque nem restauração
        $this->postJson("/api/pedidos/{$pedido->id}/cancelar", ['tipo_restituicao' => 'vale_compra'])
            ->assertStatus(422)
            ->assertJsonPath('ja_cancelado', true);

        $this->assertEquals(20, $this->variacao->fresh()->estoque);
        $this->assertEquals(0, $cupom->fresh()->usos_atuais);
        $this->assertEquals(1, Cupom::where('pedido_origem_id', $pedido->id)->count());

        // 2. Idempotência na conclusão repetida da devolução pelo admin
        $respPedido2 = $this->postJson('/api/pedidos', $this->payloadCheckout(100.00, 0.00))->assertStatus(201);
        $pedido2 = Pedido::findOrFail($respPedido2->json('pedido.id'));
        $pedido2->update(['status' => 'Entregue']);

        $respSol = $this->postJson("/api/pedidos/{$pedido2->id}/devolucoes", [
            'tipo_solicitacao' => 'vale_compra',
            'motivo'           => 'Troca de modelo',
        ])->assertStatus(201);
        $devolucao = Devolucao::findOrFail($respSol->json('devolucao.id'));

        Sanctum::actingAs($this->admin);
        $this->putJson("/api/admin/devolucoes/{$devolucao->id}/concluir")
            ->assertOk();

        // Segunda chamada de conclusão não pode gerar segundo vale-compra nem somar estoque duas vezes
        $this->putJson("/api/admin/devolucoes/{$devolucao->id}/concluir")
            ->assertStatus(422)
            ->assertJsonPath('ja_concluida', true);

        $this->assertEquals(20, $this->variacao->fresh()->estoque);
        $this->assertEquals(1, Cupom::where('devolucao_id', $devolucao->id)->count());
    }
}
