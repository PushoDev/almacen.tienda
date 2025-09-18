<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateAlmacenProductoTable extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('almacen_producto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('almacen_id')->constrained('almacens')->onDelete('cascade'); // Relación con almacenes
            $table->foreignId('producto_id')->constrained('productos')->onDelete('cascade'); // Relación con productos
            $table->integer('cantidad')->default(0); // Cantidad de productos en el almacén
            $table->timestamps(); // Timestamps para seguimiento

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('almacen_producto');
    }
}
