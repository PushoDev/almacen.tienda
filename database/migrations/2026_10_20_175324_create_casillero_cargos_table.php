<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cargos a mano sobre una o varias compras del casillero (p. ej. la estadía en Panamá). Los
     * escribe el usuario: nunca se calculan solos. Cada cargo se paga con un Gasto
     * (`movimientos_financieros`) desde una cuenta, en el momento de anotarlo.
     */
    public function up(): void
    {
        Schema::create('casillero_cargos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->string('concepto', 120);
            $table->string('nota', 255)->nullable();
            $table->string('moneda', 10)->default('USD');
            $table->decimal('monto', 15, 2);
            $table->decimal('tasa_cambio', 15, 6)->default(1);
            $table->decimal('monto_usd', 15, 2);
            $table->foreignId('cuenta_id')->constrained('cuentas');
            $table->foreignId('movimiento_financiero_id')->nullable()->constrained('movimientos_financieros');
            $table->date('fecha');
            $table->string('estado', 20)->default('activo');
            $table->string('motivo_anulacion', 255)->nullable();
            $table->timestamps();

            $table->index('estado');
        });

        Schema::create('casillero_cargo_compra', function (Blueprint $table) {
            $table->id();
            $table->foreignId('casillero_cargo_id')->constrained('casillero_cargos')->cascadeOnDelete();
            $table->foreignId('compra_id')->constrained('compras')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['casillero_cargo_id', 'compra_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('casillero_cargo_compra');
        Schema::dropIfExists('casillero_cargos');
    }
};
