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
        Schema::create('cartoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('tipo', ['credito', 'debito'])->default('credito');
            $table->string('titular');
            $table->string('numero'); // Salvo com máscara ou número (ex: **** **** **** 1234 ou completo se desejado, sem CVV)
            $table->string('ultimos_digitos', 4);
            $table->string('bandeira', 50)->nullable();
            $table->string('validade', 7); // MM/AA ou MM/AAAA
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cartoes');
    }
};
