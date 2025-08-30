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
        Schema::create('pago_ventas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained()->onDelete('cascade');
            $table->enum('tipo_pago', ['efectivo', 'transferencia']);
            $table->enum('tipo_moneda', ['USD', 'EUR', 'MLC', 'CUP'])->default('USD');
            $table->foreignId('cuenta_id')->constrained('cuentas')->onDelete('cascade');
            $table->string('via_pago')->nullable(); // Cambiado a string nullable
            $table->decimal('monto', 15, 2);
            $table->decimal('tasa_cambio', 10, 4)->default(1);
            $table->decimal('monto_equivalente', 15, 2);
            $table->text('referencia')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pago_ventas');
    }
};
