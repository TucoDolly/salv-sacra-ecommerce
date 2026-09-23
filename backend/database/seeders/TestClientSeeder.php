<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestClientSeeder extends Seeder
{
    /**
     * Remove contas de teste antigas e insere o usuário cliente de testes.
     */
    public function run(): void
    {
        // ── Remove contas legadas ──────────────────────────────────────────────
        User::whereIn('email', [
            'tucopaes@gmail.com',
            'artur.paes@ifsc.edu.br',
        ])->delete();

        // ── Cria / atualiza a conta de cliente de testes ───────────────────────
        User::updateOrCreate(
            ['email' => 'testecliente@gmail.com'],
            [
                'name'     => 'testecliente',
                'password' => Hash::make('testecliente'),
                'papel'    => 'cliente',
            ]
        );

        $this->command->info('Usuário cliente de teste criado: testecliente@gmail.com');
    }
}
