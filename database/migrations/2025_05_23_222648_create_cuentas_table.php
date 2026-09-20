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
        Schema::create('cuentas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre_cuenta')->unique();

            // CAMPO NUEVO: Tipo de activo. ELIMINAMOS ->after('nombre_cuenta')
            $table->enum('tipo', ['caja', 'banco', 'tarjeta', 'efectivo', 'otro'])->default('caja');

            // CAMPO EXISTENTE
            $table->double('saldo_cuenta', 15, 8)->nullable()->default(0.00);

            // CAMPOS EXISTENTES
            $table->enum('tipo_moneda', ['USD', 'EUR', 'MLC', 'CUP'])->default('USD');
            $table->double('deuda', 15, 8)->default(0)->nullable();
            $table->enum('tipo_cuenta', ['permanentes', 'temporales', 'deudas'])->default('permanentes');

            // CAMPO NUEVO: Estado de la cuenta
            $table->enum('estado', ['activa', 'inactiva'])->default('activa');

            $table->text('notas_cuenta')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cuentas');
    }
};
