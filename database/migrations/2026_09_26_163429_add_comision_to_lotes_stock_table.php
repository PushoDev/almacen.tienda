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
            // Comisión propia de ESTE lote (2026-09-26). Nulo = usa la del producto en el almacén
            // (`producto_vendedors.comision`), salvo que otro lote del mismo producto tenga una
            // propia: el POS toma la del lote elegido, y si no tiene, la del primero que la tenga.
            $table->decimal('comision', 8, 2)->nullable()->after('precio_venta');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lotes_stock', function (Blueprint $table) {
            $table->dropColumn('comision');
        });
    }
};
