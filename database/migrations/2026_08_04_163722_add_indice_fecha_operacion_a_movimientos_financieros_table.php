<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * fecha_operacion ya está indexada, pero solo dentro de índices compuestos junto con
     * cuenta_origen_id/cuenta_destino_id/cliente_origen_id/cliente_destino_id (ver migración
     * 2026_01_19_201849_add_balance_tracking_to_movimientos_financieros). Por la regla del
     * prefijo izquierdo, esos índices no sirven para consultas que ordenan/filtran solo por
     * fecha_operacion (como Rastreo de Operaciones) — hace falta un índice standalone.
     */
    public function up(): void
    {
        Schema::table('movimientos_financieros', function (Blueprint $table) {
            $table->index('fecha_operacion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('movimientos_financieros', function (Blueprint $table) {
            $table->dropIndex(['fecha_operacion']);
        });
    }
};
