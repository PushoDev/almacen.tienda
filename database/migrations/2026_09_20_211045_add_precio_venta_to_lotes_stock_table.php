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
        Schema::table('lotes_stock', function (Blueprint $table) {
            // Override opcional del precio de venta para ESTE lote puntual ("Opción A", ver
            // conversación 2026-09-20). Nulo = hereda el precio de producto_vendedors para ese
            // almacén, igual que siempre. Solo se setea a mano cuando el costo de un lote hace
            // que el margen con el precio general quede muy ajustado o negativo.
            $table->decimal('precio_venta', 10, 2)->nullable()->after('precio_costo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lotes_stock', function (Blueprint $table) {
            $table->dropColumn('precio_venta');
        });
    }
};
