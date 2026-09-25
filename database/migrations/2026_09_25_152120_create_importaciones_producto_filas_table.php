<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Detalle fila por fila de una importación. `resultado`: importada (sumó stock y creó lote),
     * solo_catalogo (cantidad 0 o vacía: queda el producto registrado, sin stock ni lote) u
     * omitida (con su `motivo`). `lote_id` se anula si el lote se elimina al deshacer la
     * importación; `lote_codigo` conserva el código para el historial.
     */
    public function up(): void
    {
        Schema::create('importaciones_producto_filas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('importacion_id')->constrained('importaciones_productos')->cascadeOnDelete();
            $table->unsignedInteger('fila');
            $table->string('nombre_producto')->nullable();
            $table->foreignId('producto_id')->nullable()->constrained('productos')->nullOnDelete();
            $table->boolean('producto_nuevo')->default(false);
            $table->integer('cantidad')->default(0);
            $table->decimal('precio_compra', 10, 2)->nullable();
            $table->string('resultado', 20); // importada | solo_catalogo | omitida
            $table->string('motivo')->nullable();
            $table->foreignId('lote_id')->nullable()->constrained('lotes_stock')->nullOnDelete();
            $table->string('lote_codigo')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('importaciones_producto_filas');
    }
};
