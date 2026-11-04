<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('avisos_estoque', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('produto_id')->constrained('produtos')->onDelete('cascade');
            $table->string('tamanho', 50);
            $table->string('cor', 100)->nullable();
            $table->string('modelo', 100)->nullable();
            $table->foreignId('variacao_id')->nullable()->constrained('variacaos')->nullOnDelete();
            $table->timestamp('notificado_em')->nullable();
            $table->timestamps();

            $table->index(['produto_id', 'tamanho']);
            $table->index(['user_id', 'produto_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('avisos_estoque');
    }
};
