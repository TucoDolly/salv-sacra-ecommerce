<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cupons', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 50)->unique();
            $table->string('descricao')->nullable();
            $table->decimal('percentual', 5, 2);
            $table->enum('tipo', ['produto', 'frete'])->default('produto');
            $table->boolean('todos_produtos')->default(true);
            $table->boolean('ativo')->default(true);
            $table->timestamps();
        });

        Schema::create('cupom_produto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cupom_id')->constrained('cupons')->cascadeOnDelete();
            $table->foreignId('produto_id')->constrained('produtos')->cascadeOnDelete();
            $table->unique(['cupom_id', 'produto_id']);
        });

        Schema::table('pedidos', function (Blueprint $table) {
            $table->string('cupom_codigo', 50)->nullable();
            $table->decimal('valor_desconto_cupom', 10, 2)->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn(['cupom_codigo', 'valor_desconto_cupom']);
        });
        Schema::dropIfExists('cupom_produto');
        Schema::dropIfExists('cupons');
    }
};

