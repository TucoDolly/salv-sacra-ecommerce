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
            
            // Relacionamento (Chave Estrangeira)
            $table->foreignId('categoria_id')->constrained('categorias')->onDelete('cascade');
            
            // Dados do produto
            $table->string('nome');
            $table->text('descricao')->nullable();
            $table->decimal('preco', 10, 2); // Formato de moeda (ex: 150.50)
            $table->integer('quantidade_estoque')->default(0);
            $table->string('imagem')->nullable(); // Para salvar o caminho da foto da roupa
            
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
