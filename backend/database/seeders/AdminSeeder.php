<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Insere (ou atualiza) o usuário administrador master no banco de dados.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'salvsacra2@gmail.com'],
            [
                'name'     => 'Kinho',
                'password' => Hash::make('artp2004'),
                'papel'    => 'admin',
            ]
        );

        $this->command->info('Usuário admin criado: salvsacra2@gmail.com');
    }
}
