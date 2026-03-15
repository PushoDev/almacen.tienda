<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cierre_cajas', function (Blueprint $table) {
            $table->json('snapshot_cuentas')->nullable();
            $table->json('snapshot_clientes')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('cierre_cajas', function (Blueprint $table) {
            $table->dropColumn(['snapshot_cuentas', 'snapshot_clientes']);
        });
    }
};
