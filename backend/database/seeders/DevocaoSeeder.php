<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DevocaoSeeder extends Seeder
{
    public function run(): void
    {
        $devocaos = [
            ['nome' => 'São Bento'],
            ['nome' => 'Nossa Senhora'],
            ['nome' => 'São Francisco'],
        ];

        foreach ($devocaos as $devocao) {
            DB::table('devocaos')->updateOrInsert(
                ['nome' => $devocao['nome']],
                array_merge($devocao, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
