<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('configuracoes', function (Blueprint $table) {
            $table->string('chave')->primary();
            $table->text('valor')->nullable();
            $table->string('grupo')->default('geral'); // 'loja', 'frete', 'pagamento', 'contato'
            $table->string('descricao')->nullable();
            $table->timestamps();
        });

        // Configurações padrão da Salv Sacra
        $defaults = [
            // Loja
            ['chave' => 'nome_loja',           'valor' => 'Salv Sacra',                    'grupo' => 'loja',      'descricao' => 'Nome oficial da loja'],
            ['chave' => 'slogan_loja',         'valor' => 'Vestindo a Fé com Elegância',   'grupo' => 'loja',      'descricao' => 'Slogan institucional'],
            
            // Frete & Avisos
            ['chave' => 'frete_gratis_minimo', 'valor' => '500.00',                        'grupo' => 'frete',     'descricao' => 'Valor mínimo de pedido para frete grátis'],
            ['chave' => 'aviso_topo_texto',    'valor' => '✦ FRETE GRÁTIS PARA COMPRAS ACIMA DE R$500 ✦', 'grupo' => 'frete', 'descricao' => 'Texto do banner no topo do site'],
            ['chave' => 'aviso_topo_ativo',    'valor' => '1',                             'grupo' => 'frete',     'descricao' => 'Exibir banner de topo (1=sim, 0=não)'],

            // Pagamento
            ['chave' => 'pix_chave',           'valor' => 'salvsacra@gmail.com',           'grupo' => 'pagamento', 'descricao' => 'Chave PIX padrão'],
            ['chave' => 'pix_beneficiario',    'valor' => 'SALV SACRA ECOMMERCE LTDA',     'grupo' => 'pagamento', 'descricao' => 'Nome do titular da chave PIX'],
            ['chave' => 'pix_cidade',          'valor' => 'Tubarão',                       'grupo' => 'pagamento', 'descricao' => 'Cidade do titular PIX'],
            ['chave' => 'pix_desconto_pct',    'valor' => '5',                             'grupo' => 'pagamento', 'descricao' => 'Desconto percentual para pagamento via PIX'],

            // Contato & Atendimento
            ['chave' => 'contato_email',       'valor' => 'salvsacra@gmail.com',           'grupo' => 'contato',   'descricao' => 'E-mail oficial de contato'],
            ['chave' => 'contato_telefone',    'valor' => '(48) 99620-5153',               'grupo' => 'contato',   'descricao' => 'Telefone fixo/celular'],
            ['chave' => 'contato_whatsapp',    'valor' => '5548996205153',                 'grupo' => 'contato',   'descricao' => 'WhatsApp com DDI/DDD'],
            ['chave' => 'contato_endereco',    'valor' => 'Rua Manoel Antunes Corrêa, 2171', 'grupo' => 'contato', 'descricao' => 'Endereço físico'],
            ['chave' => 'instagram_url',       'valor' => 'https://instagram.com/salvsacra', 'grupo' => 'contato', 'descricao' => 'Perfil do Instagram'],
        ];

        foreach ($defaults as $item) {
            DB::table('configuracoes')->insert(array_merge($item, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('configuracoes');
    }
};
