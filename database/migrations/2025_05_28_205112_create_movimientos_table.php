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
        Schema::create('movimientos', function (Blueprint $table) {
            $table->id();
            // Detalles de la Tabla Movimientos
            $table->foreignId('producto_id')->constrained()->onDelete('cascade');
            $table->foreignId('almacen_origen_id')->constrained('almacens')->onDelete('cascade');
            $table->foreignId('almacen_destino_id')->constrained('almacens')->onDelete('cascade');
            $table->integer('cantidad')->unsigned();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movimientos');
    }
};
