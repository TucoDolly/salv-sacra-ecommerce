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
            ['email' => 'testeadmin@gmail.com'],
            [
                'name'     => 'testeadmin',
                'password' => Hash::make('testeadmin'),
                'papel'    => 'admin',
            ]
        );

        $this->command->info('Usuário admin criado: testeadmin@gmail.com');
    }
}
