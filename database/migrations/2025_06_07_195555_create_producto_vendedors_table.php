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
        // Nota: Si ya tienes datos, deberías hacer una migración de ALTER TABLE
        // En este ejemplo, mostramos la estructura final que debe tener la tabla.
        Schema::create('producto_vendedors', function (Blueprint $table) {

            $table->foreignId('producto_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            // 🚨 NUEVA COLUMNA: Identificador del almacén
            $table->foreignId('almacen_id')->constrained('almacens')->cascadeOnDelete();

            $table->decimal('precio_venta', 10, 2)->default(0.00)->comment('Precio asignado por el vendedor');
            $table->decimal('venta_ganancia', 10, 2)->default(0.00);


            // 🚨 CLAVE COMPUESTA MODIFICADA: Ahora incluye el almacén_id
            // La clave única es: este producto, para este vendedor, en este almacén.
            $table->primary(['producto_id', 'user_id', 'almacen_id']);

            // 💡 Índice de vendedor ahora incluye el almacén para búsquedas de stock/precios
            $table->index(['user_id', 'almacen_id', 'precio_venta']);

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('producto_vendedors');
    }
};
