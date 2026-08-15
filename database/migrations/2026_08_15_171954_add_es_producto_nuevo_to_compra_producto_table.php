<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Nullable a propósito: las líneas de compra ya existentes no tienen forma de saber
     * retroactivamente si el producto era nuevo en ese momento, quedan en null (ni sí ni no) en
     * vez de asumir un valor. Solo las compras nuevas, procesadas después de este cambio, lo
     * llenan de verdad (ver CompraController::store()).
     */
    public function up(): void
    {
        Schema::table('compra_producto', function (Blueprint $table) {
            $table->boolean('es_producto_nuevo')->nullable()->after('almacen_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('compra_producto', function (Blueprint $table) {
            $table->dropColumn('es_producto_nuevo');
        });
    }
};
