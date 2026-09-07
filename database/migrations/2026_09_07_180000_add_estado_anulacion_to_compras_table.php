<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Default 'aprobada' a propósito: todas las compras existentes hasta hoy fueron creadas
     * bajo el flujo viejo (store() sumaba el stock de una vez, sin ningún estado) — son,
     * de hecho, compras ya aprobadas. Solo las compras nuevas pasan explícitamente 'pendiente'
     * desde CompraController::store().
     *
     * tipo_anulacion/motivo_anulacion nullable: solo se llenan cuando una compra pendiente se
     * anula (ver CompraController::anular()). Una compra 100% deuda_proveedor (nunca hubo pago
     * real) solo admite tipo_anulacion='reversion' — 'fondo' se valida y rechaza en el
     * controlador, no a nivel de base de datos.
     */
    public function up(): void
    {
        Schema::table('compras', function (Blueprint $table) {
            $table->enum('estado', ['pendiente', 'aprobada', 'anulada'])->default('aprobada')->after('tipo_compra');
            $table->enum('tipo_anulacion', ['reversion', 'fondo'])->nullable()->after('estado');
            $table->string('motivo_anulacion', 500)->nullable()->after('tipo_anulacion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('compras', function (Blueprint $table) {
            $table->dropColumn(['estado', 'tipo_anulacion', 'motivo_anulacion']);
        });
    }
};
