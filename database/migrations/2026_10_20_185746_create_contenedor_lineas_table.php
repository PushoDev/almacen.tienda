<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Unidades de una línea de compra (`compra_producto`) que suben a un contenedor: "12 de X, 30
     * de Y". Lo que no sube se queda en el casillero. Una fila por contenedor y línea.
     */
    public function up(): void
    {
        Schema::create('contenedor_lineas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contenedor_id')->constrained('contenedores')->cascadeOnDelete();
            $table->foreignId('compra_producto_id')->constrained('compra_producto');
            $table->unsignedInteger('cantidad');
            $table->timestamps();

            $table->unique(['contenedor_id', 'compra_producto_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contenedor_lineas');
    }
};
