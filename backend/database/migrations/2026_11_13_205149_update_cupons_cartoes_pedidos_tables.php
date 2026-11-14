<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Atualizar constraint da tabela 'cupons' para aceitar 'troca'
        try {
            DB::statement("ALTER TABLE cupons DROP CONSTRAINT IF EXISTS cupons_tipo_check");
            DB::statement("ALTER TABLE cupons ADD CONSTRAINT cupons_tipo_check CHECK (tipo IN ('produto', 'frete', 'troca'))");
        } catch (\Throwable $e) {
            // Em outros drivers ou se a constraint não existir
        }

        // 2. Adicionar campo 'cpf' na tabela 'cartoes'
        if (Schema::hasTable('cartoes') && ! Schema::hasColumn('cartoes', 'cpf')) {
            Schema::table('cartoes', function (Blueprint $table) {
                $table->string('cpf', 20)->nullable()->after('titular');
            });
        }

        // 3. Adicionar campos de parcelamento na tabela 'pedidos'
        if (Schema::hasTable('pedidos')) {
            Schema::table('pedidos', function (Blueprint $table) {
                if (! Schema::hasColumn('pedidos', 'cartao_parcelas')) {
                    $table->integer('cartao_parcelas')->default(1)->nullable()->after('metodo_pagamento');
                }
                if (! Schema::hasColumn('pedidos', 'cartao_valor_parcela')) {
                    $table->decimal('cartao_valor_parcela', 10, 2)->nullable()->after('cartao_parcelas');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('pedidos')) {
            Schema::table('pedidos', function (Blueprint $table) {
                if (Schema::hasColumn('pedidos', 'cartao_valor_parcela')) {
                    $table->dropColumn('cartao_valor_parcela');
                }
                if (Schema::hasColumn('pedidos', 'cartao_parcelas')) {
                    $table->dropColumn('cartao_parcelas');
                }
            });
        }

        if (Schema::hasTable('cartoes') && Schema::hasColumn('cartoes', 'cpf')) {
            Schema::table('cartoes', function (Blueprint $table) {
                $table->dropColumn('cpf');
            });
        }

        try {
            DB::statement("ALTER TABLE cupons DROP CONSTRAINT IF EXISTS cupons_tipo_check");
            DB::statement("ALTER TABLE cupons ADD CONSTRAINT cupons_tipo_check CHECK (tipo IN ('produto', 'frete'))");
        } catch (\Throwable $e) {
        }
    }
};
