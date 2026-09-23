<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adiciona a coluna `papel` à tabela de usuários.
     * Valores possíveis: 'cliente' | 'admin'
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('papel')->default('cliente')->after('password');
        });
    }

    /**
     * Reverte a adição da coluna `papel`.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('papel');
        });
    }
};
