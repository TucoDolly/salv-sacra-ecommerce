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
        Schema::create('item_pedidos', function (Blueprint $table) {
            $table->id();
            
            // Relacionamento de composição com o Pedido
            $table->foreignId('pedido_id')->constrained('pedidos')->onDelete('cascade');
            
            // Relacionamento apontando qual variação (tamanho/cor) o cliente comprou
            // (Apontamos para a tabela 'variacaos' que criamos anteriormente)
            $table->foreignId('variacao_produto_id')->constrained('variacaos')->onDelete('cascade');
            
            // Atributos exatos do seu diagrama
            $table->integer('quantidade');
            $table->decimal('preco_unitario', 10, 2);
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('item_pedidos');
    }
};
