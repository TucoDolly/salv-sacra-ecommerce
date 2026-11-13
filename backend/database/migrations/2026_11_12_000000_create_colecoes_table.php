<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('colecoes')) {
            Schema::create('colecoes', function (Blueprint $table) {
                $table->id();
                $table->string('nome')->unique();
                $table->string('slug')->nullable();
                $table->text('descricao')->nullable();
                $table->timestamps();
            });

            // Coleções padrão já existentes na Salv Sacra
            $iniciais = [
                'Regular Fit',
                'Oversized',
                'Santos',
                'Datas Comemorativas',
                'Inverno',
                'Verão',
                'Geral',
            ];

            foreach ($iniciais as $nome) {
                DB::table('colecoes')->insert([
                    'nome'       => $nome,
                    'slug'       => Str::slug($nome),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('colecoes');
    }
};

