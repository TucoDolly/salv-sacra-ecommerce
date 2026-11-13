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
        // Remove 'Regular Fit' e 'Oversized' de coleções, pois são modelos de camiseta
        DB::table('colecoes')->whereIn('nome', ['Regular Fit', 'Oversized'])->delete();

        if (!Schema::hasTable('modelos_camiseta')) {
            Schema::create('modelos_camiseta', function (Blueprint $table) {
                $table->id();
                $table->string('nome')->unique();
                $table->string('slug')->nullable();
                $table->text('descricao')->nullable();
                $table->timestamps();
            });

            // Modelos padrão de camiseta solicitados pelo usuário
            $modelosIniciais = [
                'Regular Fit',
                'Oversized',
            ];

            foreach ($modelosIniciais as $nome) {
                DB::table('modelos_camiseta')->insert([
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
        Schema::dropIfExists('modelos_camiseta');
    }
};

