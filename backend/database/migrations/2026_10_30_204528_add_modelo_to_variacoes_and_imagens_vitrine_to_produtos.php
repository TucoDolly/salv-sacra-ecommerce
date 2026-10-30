<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('variacaos', function (Blueprint $table) {
            $table->string('modelo', 100)->default('Regular Fit')->after('produto_id');
        });

        Schema::table('produtos', function (Blueprint $table) {
            $table->json('imagens_vitrine')->nullable()->after('imagens');
        });
    }

    public function down(): void
    {
        Schema::table('variacaos', function (Blueprint $table) {
            $table->dropColumn('modelo');
        });

        Schema::table('produtos', function (Blueprint $table) {
            $table->dropColumn('imagens_vitrine');
        });
    }
};
