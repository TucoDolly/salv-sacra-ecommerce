<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            if (! Schema::hasColumn('pedidos', 'codigo_rastreio')) {
                $table->string('codigo_rastreio', 100)->nullable()->after('tipo_frete');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            if (Schema::hasColumn('pedidos', 'codigo_rastreio')) {
                $table->dropColumn('codigo_rastreio');
            }
        });
    }
};
