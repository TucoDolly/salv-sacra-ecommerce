<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->string('pagamento_id')->nullable()->after('metodo_pagamento');
            $table->text('pix_copia_e_cola')->nullable()->after('pagamento_id');
            $table->longText('pix_qr_code_base64')->nullable()->after('pix_copia_e_cola');
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropColumn(['pagamento_id', 'pix_copia_e_cola', 'pix_qr_code_base64']);
        });
    }
};
