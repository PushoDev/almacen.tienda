<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Feature "Atendido por" / Turnos, extendida a Gasto/Ingreso/Transferencia (Compras no
     * la necesita — solo admin las crea, que nunca captura turno). Nullable a propósito:
     * movimientos anteriores a esta feature, o creados por admin, quedan sin turno asociado.
     */
    public function up(): void
    {
        Schema::table('movimientos_financieros', function (Blueprint $table) {
            $table->foreignId('turno_vendedor_id')
                ->nullable()
                ->after('user_id')
                ->constrained('turnos_vendedor')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('movimientos_financieros', function (Blueprint $table) {
            $table->dropConstrainedForeignId('turno_vendedor_id');
        });
    }
};
