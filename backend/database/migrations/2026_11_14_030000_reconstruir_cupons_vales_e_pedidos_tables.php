<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1.1. Atualização da tabela 'cupons'
        try {
            DB::statement('ALTER TABLE cupons ALTER COLUMN percentual DROP NOT NULL');
            DB::statement('ALTER TABLE cupons ALTER COLUMN percentual SET DEFAULT 0');
        } catch (\Throwable $e) {
            // Fallback para drivers não PostgreSQL
        }

        try {
            DB::statement('ALTER TABLE cupons DROP CONSTRAINT IF EXISTS cupons_tipo_check');
            DB::statement("ALTER TABLE cupons ADD CONSTRAINT cupons_tipo_check CHECK (tipo IN ('produto', 'frete', 'vale_compra', 'troca'))");
        } catch (\Throwable $e) {
            // Fallback para drivers sem CHECK constraint nomeada
        }

        Schema::table('cupons', function (Blueprint $table) {
            if (! Schema::hasColumn('cupons', 'valor_inicial')) {
                $table->decimal('valor_inicial', 10, 2)->nullable()->after('valor_fixo');
            }
            if (! Schema::hasColumn('cupons', 'saldo_atual')) {
                $table->decimal('saldo_atual', 10, 2)->nullable()->after('valor_inicial');
            }
            if (! Schema::hasColumn('cupons', 'validade')) {
                $table->timestamp('validade')->nullable()->after('ativo');
            }
            if (! Schema::hasColumn('cupons', 'valor_minimo_pedido')) {
                $table->decimal('valor_minimo_pedido', 10, 2)->nullable()->default(0)->after('validade');
            }
            if (! Schema::hasColumn('cupons', 'limite_usos')) {
                $table->integer('limite_usos')->nullable()->after('valor_minimo_pedido');
            }
            if (! Schema::hasColumn('cupons', 'usos_atuais')) {
                $table->integer('usos_atuais')->default(0)->after('limite_usos');
            }
            if (! Schema::hasColumn('cupons', 'condicoes_utilizacao')) {
                $table->text('condicoes_utilizacao')->nullable()->after('usos_atuais');
            }
            if (! Schema::hasColumn('cupons', 'user_id')) {
                $table->foreignId('user_id')->nullable()->after('condicoes_utilizacao')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('cupons', 'pedido_origem_id')) {
                $table->foreignId('pedido_origem_id')->nullable()->after('user_id')->constrained('pedidos')->nullOnDelete();
            }
            if (! Schema::hasColumn('cupons', 'devolucao_id')) {
                $table->foreignId('devolucao_id')->nullable()->after('pedido_origem_id')->constrained('devolucoes')->nullOnDelete();
            }
            if (! Schema::hasColumn('cupons', 'status')) {
                $table->string('status', 30)->default('ativo')->after('devolucao_id');
            }
            if (! Schema::hasColumn('cupons', 'motivo_bloqueio')) {
                $table->text('motivo_bloqueio')->nullable()->after('status');
            }
            if (! Schema::hasColumn('cupons', 'bloqueado_em')) {
                $table->timestamp('bloqueado_em')->nullable()->after('motivo_bloqueio');
            }
        });

        // Migrar registros existentes na tabela 'cupons'
        DB::table('cupons')
            ->where(function ($q) {
                $q->where('tipo', 'troca')
                  ->orWhere('codigo', 'like', 'TROCA-%')
                  ->orWhere('codigo', 'like', 'VALE-%');
            })
            ->update([
                'tipo'          => 'vale_compra',
                'valor_inicial' => DB::raw('COALESCE(valor_inicial, valor_fixo, 0)'),
                'saldo_atual'   => DB::raw('COALESCE(saldo_atual, valor_fixo, 0)'),
            ]);

        // Vincular pedido_origem_id, devolucao_id e user_id a partir de 'devolucoes'
        if (Schema::hasTable('devolucoes')) {
            $devolucoesComCupom = DB::table('devolucoes')
                ->whereNotNull('cupom_gerado_codigo')
                ->where('cupom_gerado_codigo', '!=', '')
                ->get(['id', 'pedido_id', 'user_id', 'cupom_gerado_codigo']);

            foreach ($devolucoesComCupom as $dev) {
                DB::table('cupons')
                    ->where('codigo', strtoupper(trim((string) $dev->cupom_gerado_codigo)))
                    ->update([
                        'pedido_origem_id' => $dev->pedido_id,
                        'devolucao_id'     => $dev->id,
                        'user_id'          => $dev->user_id,
                    ]);
            }
        }

        // Sincronizar status inicial dos cupons existentes
        DB::table('cupons')
            ->where('ativo', true)
            ->update(['status' => 'ativo']);

        DB::table('cupons')
            ->where('ativo', false)
            ->update(['status' => 'inativo']);

        // 1.2. Atualização da tabela 'pedidos'
        Schema::table('pedidos', function (Blueprint $table) {
            if (! Schema::hasColumn('pedidos', 'cupom_id')) {
                $table->foreignId('cupom_id')->nullable()->after('valor_desconto_cupom')->constrained('cupons')->nullOnDelete();
            }
            if (! Schema::hasColumn('pedidos', 'cupom_tipo')) {
                $table->string('cupom_tipo', 20)->nullable()->after('cupom_codigo');
            }
            if (! Schema::hasColumn('pedidos', 'valor_desconto_produto')) {
                $table->decimal('valor_desconto_produto', 10, 2)->default(0)->after('valor_desconto_cupom');
            }
            if (! Schema::hasColumn('pedidos', 'valor_desconto_frete')) {
                $table->decimal('valor_desconto_frete', 10, 2)->default(0)->after('valor_desconto_produto');
            }
            if (! Schema::hasColumn('pedidos', 'vale_compra_id')) {
                $table->foreignId('vale_compra_id')->nullable()->after('valor_desconto_frete')->constrained('cupons')->nullOnDelete();
            }
            if (! Schema::hasColumn('pedidos', 'vale_compra_codigo')) {
                $table->string('vale_compra_codigo', 50)->nullable()->after('vale_compra_id');
            }
            if (! Schema::hasColumn('pedidos', 'valor_vale_compra')) {
                $table->decimal('valor_vale_compra', 10, 2)->default(0)->after('vale_compra_codigo');
            }
            if (! Schema::hasColumn('pedidos', 'valor_frete_pago')) {
                $table->decimal('valor_frete_pago', 10, 2)->default(0)->after('valor_frete');
            }
            if (! Schema::hasColumn('pedidos', 'valor_pago_dinheiro')) {
                $table->decimal('valor_pago_dinheiro', 10, 2)->default(0)->after('valor_total');
            }
            if (! Schema::hasColumn('pedidos', 'beneficios_restaurados')) {
                $table->boolean('beneficios_restaurados')->default(false)->after('valor_vale_compra');
            }
        });

        // Backfill dos pedidos existentes
        DB::table('pedidos')->update([
            'valor_frete_pago'    => DB::raw('COALESCE(valor_frete, 0)'),
            'valor_pago_dinheiro' => DB::raw('COALESCE(valor_total, 0)'),
        ]);

        // 1.3. Criação da tabela 'cupom_historicos'
        if (! Schema::hasTable('cupom_historicos')) {
            Schema::create('cupom_historicos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('cupom_id')->constrained('cupons')->cascadeOnDelete();
                $table->foreignId('pedido_id')->nullable()->constrained('pedidos')->nullOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('tipo_evento', 40);
                $table->decimal('valor', 10, 2)->default(0);
                $table->decimal('saldo_anterior', 10, 2)->nullable();
                $table->decimal('saldo_novo', 10, 2)->nullable();
                $table->text('descricao')->nullable();
                $table->timestamps();

                $table->index(['cupom_id', 'tipo_evento']);
                $table->index('pedido_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('cupom_historicos');

        Schema::table('pedidos', function (Blueprint $table) {
            if (Schema::hasColumn('pedidos', 'cupom_id')) {
                $table->dropForeign(['cupom_id']);
            }
            if (Schema::hasColumn('pedidos', 'vale_compra_id')) {
                $table->dropForeign(['vale_compra_id']);
            }

            $colsPedidos = array_values(array_filter([
                'cupom_id',
                'cupom_tipo',
                'valor_desconto_produto',
                'valor_desconto_frete',
                'vale_compra_id',
                'vale_compra_codigo',
                'valor_vale_compra',
                'valor_frete_pago',
                'valor_pago_dinheiro',
                'beneficios_restaurados',
            ], fn ($col) => Schema::hasColumn('pedidos', $col)));

            if (! empty($colsPedidos)) {
                $table->dropColumn($colsPedidos);
            }
        });

        Schema::table('cupons', function (Blueprint $table) {
            if (Schema::hasColumn('cupons', 'user_id')) {
                $table->dropForeign(['user_id']);
            }
            if (Schema::hasColumn('cupons', 'pedido_origem_id')) {
                $table->dropForeign(['pedido_origem_id']);
            }
            if (Schema::hasColumn('cupons', 'devolucao_id')) {
                $table->dropForeign(['devolucao_id']);
            }

            $colsCupons = array_values(array_filter([
                'valor_inicial',
                'saldo_atual',
                'validade',
                'valor_minimo_pedido',
                'limite_usos',
                'usos_atuais',
                'condicoes_utilizacao',
                'user_id',
                'pedido_origem_id',
                'devolucao_id',
                'status',
                'motivo_bloqueio',
                'bloqueado_em',
            ], fn ($col) => Schema::hasColumn('cupons', $col)));

            if (! empty($colsCupons)) {
                $table->dropColumn($colsCupons);
            }
        });

        try {
            DB::table('cupons')->where('tipo', 'vale_compra')->update(['tipo' => 'troca']);
            DB::statement('ALTER TABLE cupons DROP CONSTRAINT IF EXISTS cupons_tipo_check');
            DB::statement("ALTER TABLE cupons ADD CONSTRAINT cupons_tipo_check CHECK (tipo IN ('produto', 'frete', 'troca'))");
        } catch (\Throwable $e) {
            // Ignorar em outros drivers
        }
    }
};
