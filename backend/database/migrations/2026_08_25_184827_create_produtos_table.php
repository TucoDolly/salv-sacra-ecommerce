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
        Schema::table('produtos', function (Blueprint $table) {
            // Remove o estoque geral (pois agora o estoque fica na Variação)
            $table->dropColumn('quantidade_estoque');
            
            // Renomeia as colunas para o padrão exato do diagrama
            $table->renameColumn('preco', 'preco_base');
            $table->renameColumn('imagem', 'imagem_url');
            
            // Adiciona os novos atributos
            $table->boolean('disponivel')->default(true);
            $table->string('colecao')->nullable();
            
            // Conecta o Produto à Devoção
            $table->foreignId('devocao_id')->nullable()->constrained('devocaos')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('produtos');
    }
};
