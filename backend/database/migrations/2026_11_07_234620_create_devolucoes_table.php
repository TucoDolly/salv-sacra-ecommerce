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
        Schema::create('devolucoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedido_id')->constrained('pedidos')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('status', 30)->default('Pendente'); // Pendente, Aprovada, Em transporte, Recebida, Concluida, Recusada
            $table->string('tipo_solicitacao', 20)->default('cupom'); // cupom, reembolso
            $table->string('motivo', 100); // Arrependimento (7 dias), Tamanho incorreto, Defeito de fabricação, Produto divergente, Outro
            $table->text('descricao')->nullable();
            $table->json('itens_devolvidos');
            $table->json('fotos')->nullable();
            $table->string('codigo_postagem_reversa', 100)->nullable();
            $table->string('prazo_postagem', 100)->nullable();
            $table->text('instrucoes_admin')->nullable();
            $table->text('motivo_recusa')->nullable();
            $table->decimal('valor_estorno', 10, 2)->default(0);
            $table->string('cupom_gerado_codigo', 50)->nullable();
            $table->timestamp('data_aprovacao')->nullable();
            $table->timestamp('data_conclusao')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('devolucoes');
    }
};
