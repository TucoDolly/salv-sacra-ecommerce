<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CategoriaSeeder extends Seeder
{
    public function run(): void
    {
        $categorias = [
            ['nome' => 'Camisetas',   'descricao' => 'Camisetas com estampas religiosas artesanais.'],
            ['nome' => 'Acessórios',  'descricao' => 'Pulseiras, chaveiros e outros acessórios sacros.'],
            ['nome' => 'Terços',      'descricao' => 'Terços artesanais em diferentes materiais e estilos.'],
        ];

        foreach ($categorias as $categoria) {
            DB::table('categorias')->updateOrInsert(
                ['nome' => $categoria['nome']],
                array_merge($categoria, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
