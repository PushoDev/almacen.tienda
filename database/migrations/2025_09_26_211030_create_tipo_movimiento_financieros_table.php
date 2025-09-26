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
        // Tabla maestra para definir Gasto, Ingreso, Transferencia, etc.
        Schema::create('tipos_movimiento_financiero', function (Blueprint $table) {
            $table->id();
            $table->string('nombre')->unique(); // Ej: Gasto Operativo, Ingreso por Venta, Transferencia Interna
            $table->enum('efecto', ['ingreso', 'egreso']); // Indica si el movimiento SUMA (ingreso) o RESTA (egreso)
            $table->text('descripcion')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tipos_movimiento_financiero');
    }
};