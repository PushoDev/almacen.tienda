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
        // Cuántas unidades de cada código de barras hay en cada almacén. `producto_codigos.cantidad`
        // es el total del producto en TODOS los almacenes (sin dato de dónde está cada unidad), así
        // que el POS mostraba códigos y cantidades de otros almacenes. Esta tabla reparte ese total
        // por almacén (ver CodigoStockService); `producto_codigos.cantidad` sigue siendo el total.
        Schema::create('almacen_producto_codigos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('almacen_id')->constrained('almacens')->cascadeOnDelete();
            $table->foreignId('producto_codigo_id')->constrained('producto_codigos')->cascadeOnDelete();
            $table->unsignedInteger('cantidad')->default(0);
            $table->timestamps();

            $table->unique(['almacen_id', 'producto_codigo_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('almacen_producto_codigos');
    }
};
