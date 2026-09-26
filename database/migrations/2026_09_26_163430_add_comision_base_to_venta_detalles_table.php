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
        Schema::table('venta_detalles', function (Blueprint $table) {
            // Comisión base con la que se vendió la línea (la del lote de referencia o, sin lotes,
            // la del producto en el almacén), junto a `precio_base`. Editar una venta pendiente
            // recalcula la comisión con estos dos valores y no con los actuales del lote. Nulo en
            // las líneas anteriores a 2026-09-26: esas siguen usando `producto_vendedors`.
            $table->decimal('comision_base', 8, 2)->nullable()->after('precio_base');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('venta_detalles', function (Blueprint $table) {
            $table->dropColumn('comision_base');
        });
    }
};
