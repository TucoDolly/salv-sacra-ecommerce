<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // ── Dados de referência ───────────────────────────────────────────────
        $this->call([
            CategoriaSeeder::class,
            DevocaoSeeder::class,
            AdminSeeder::class,
            TestClientSeeder::class,
        ]);
    }
}

