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
        Schema::create('produtos', function (Blueprint $table) {
            $table->id();
            
            // Colunas básicas do produto
            $table->string('nome');
            $table->text('descricao')->nullable();
            
            // Colunas com os nomes atualizados conforme o seu diagrama
            $table->decimal('preco_base', 10, 2);
            $table->string('imagem_url')->nullable();
            
            // Novos atributos
            $table->boolean('disponivel')->default(true);
            $table->string('colecao')->nullable();
            
            // Relacionamento com a tabela categorias (que foi criada no passo anterior)
            $table->foreignId('categoria_id')->constrained('categorias')->onDelete('cascade');
            
            // Relacionamento com a tabela devocaos
            $table->foreignId('devocao_id')->nullable()->constrained('devocaos')->onDelete('cascade');
            
            $table->timestamps();
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