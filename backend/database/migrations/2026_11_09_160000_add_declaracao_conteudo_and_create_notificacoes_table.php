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
        // 1. Adicionar campos de declaração de conteúdo na tabela devolucoes
        Schema::table('devolucoes', function (Blueprint $table) {
            $table->string('declaracao_conteudo_path', 255)->nullable()->after('fotos');
            $table->text('declaracao_conteudo_url')->nullable()->after('declaracao_conteudo_path');
            $table->string('declaracao_conteudo_nome', 255)->nullable()->after('declaracao_conteudo_url');
        });

        // 2. Criar tabela de notificações (central para cliente e administrador)
        Schema::create('notificacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->string('tipo', 20)->default('cliente'); // 'cliente' ou 'admin'
            $table->string('categoria', 30)->default('pedido'); // 'pedido', 'devolucao', 'estoque', 'carrinho', 'geral'
            $table->unsignedBigInteger('referencia_id')->nullable();
            $table->string('titulo', 255);
            $table->text('mensagem');
            $table->string('link', 255)->nullable();
            $table->boolean('lida')->default(false);
            $table->timestamp('data_leitura')->nullable();
            $table->timestamps();

            $table->index(['tipo', 'lida']);
            $table->index(['user_id', 'lida']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notificacoes');

        Schema::table('devolucoes', function (Blueprint $table) {
            $table->dropColumn(['declaracao_conteudo_path', 'declaracao_conteudo_url', 'declaracao_conteudo_nome']);
        });
    }
};

