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
        Schema::create('tasa_cambios', function (Blueprint $table) {
            $table->id();

            // CAMPOS NUEVOS: Define el par de monedas
            $table->enum('moneda_base', ['USD', 'EUR', 'MLC', 'CUP']);
            $table->enum('moneda_destino', ['USD', 'EUR', 'MLC', 'CUP']);
            $table->unique(['moneda_base', 'moneda_destino']); // Asegura que solo hay una tasa por par

            // CAMPO EXISTENTE
            $table->double('tasa', 15, 8)->default(1.0); // Tasa por defecto

            $table->timestamp('fecha_actualizacion')->useCurrent();
            $table->timestamps(); // Usaremos timestamps estándar para 'created_at' y 'updated_at'
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasa_cambios');
    }
};
