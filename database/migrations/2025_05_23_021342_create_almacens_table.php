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
        Schema::create('almacens', function (Blueprint $table) {
            $table->id();
            // Usuario responsable
            // Detalles del Almacen
            $table->string('nombre_almacen');
            $table->string('telefono_almacen')->unique();
            $table->string('correo_almacen')->nullable();
            $table->string('provincia_almacen')->nullable();
            $table->string('ciudad_almacen')->nullable();
            $table->text('notas_almacen')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('almacens');
    }
};
