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
        Schema::create('venta_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained()->onDelete('cascade'); // Relación con la venta principal
            $table->foreignId('producto_id')->constrained()->onDelete('cascade'); // Producto vendido
            $table->integer('cantidad'); // Cantidad vendida
            $table->decimal('precio_venta', 10, 2); // Precio unitario en el momento de la venta
            $table->decimal('subtotal', 10, 2); // Subtotal = cantidad * precio_venta
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('venta_detalles');
    }
};
