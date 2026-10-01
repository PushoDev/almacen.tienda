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
        // Tasa de conversión USD -> esta moneda para precargar (de punto de partida, editable a mano)
        // la tasa al retirar comisión de Punto de Venta y de Gestor en Vendor/Show.tsx — independiente
        // de `tasa_cambio` (que es la tasa de venta general) por si el negocio paga comisión a otra
        // tasa. Nullable y sin default: "sin configurar" deja el campo manual como hoy, en vez de
        // guardar un número sin significado (ver migración que eliminó `monedas.commission`).
        Schema::table('monedas', function (Blueprint $table) {
            $table->decimal('tasa_comision', 15, 6)->nullable()->after('tasa_cambio');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('monedas', function (Blueprint $table) {
            $table->dropColumn('tasa_comision');
        });
    }
};
