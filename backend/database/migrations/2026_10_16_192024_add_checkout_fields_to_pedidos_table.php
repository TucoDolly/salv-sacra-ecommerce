<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->string('email_contato')->nullable()->after('user_id');
            $table->string('telefone')->nullable()->after('email_contato');
            $table->string('metodo_pagamento')->default('pix')->after('status');
            $table->string('tipo_frete')->nullable()->after('metodo_pagamento');
            $table->text('observacoes')->nullable()->after('tipo_frete');
            
            // Dados de endereço resumidos no pedido para rastreio imutável
            $table->string('cep')->nullable()->after('observacoes');
            $table->string('logradouro')->nullable()->after('cep');
            $table->string('numero')->nullable()->after('logradouro');
            $table->string('complemento')->nullable()->after('numero');
            $table->string('bairro')->nullable()->after('complemento');
            $table->string('cidade')->nullable()->after('bairro');
            $table->string('estado', 2)->nullable()->after('cidade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn([
                'email_contato',
                'telefone',
                'metodo_pagamento',
                'tipo_frete',
                'observacoes',
                'cep',
                'logradouro',
                'numero',
                'complemento',
                'bairro',
                'cidade',
                'estado',
            ]);
        });
    }
};
