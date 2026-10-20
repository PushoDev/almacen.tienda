<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Casillero de Compras (Fase 2): un contenedor sale de Panamá hacia el Mariel con parte de lo
     * que espera en el casillero. Mientras está `abierto` se le asignan unidades y se le anotan
     * cargos a mano; `cancelado` lo deja sin efecto y devuelve sus unidades al casillero.
     */
    public function up(): void
    {
        Schema::create('contenedores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->string('nombre', 120);
            $table->string('notas', 255)->nullable();
            $table->date('fecha_salida')->nullable();
            $table->string('estado', 20)->default('abierto');
            $table->timestamps();

            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contenedores');
    }
};
