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
        Schema::table('pago_ventas', function (Blueprint $table) {
            $table->double('saldo_anterior', 15, 2)->nullable()->after('monto_equivalente');
            $table->double('saldo_posterior', 15, 2)->nullable()->after('saldo_anterior');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pago_ventas', function (Blueprint $table) {
            $table->dropColumn(['saldo_anterior', 'saldo_posterior']);
        });
    }
};
