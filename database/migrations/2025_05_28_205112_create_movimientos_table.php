<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateMovimientosTable extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('movimientos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('almacen_emisor_id')->constrained('almacens')->onDelete('cascade'); // Almacén emisor
            $table->foreignId('almacen_receptor_id')->constrained('almacens')->onDelete('cascade'); // Almacén receptor
            $table->foreignId('producto_id')->constrained('productos')->onDelete('cascade'); // Producto movido
            $table->integer('cantidad')->unsigned(); // Cantidad de productos movidos
            $table->timestamp('fecha_movimiento')->useCurrent(); // Fecha del movimiento
            $table->timestamps(); // Timestamps para seguimiento
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movimientos');
    }
}
