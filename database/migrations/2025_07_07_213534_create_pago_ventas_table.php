<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // $table->enum('tipo_cuenta', ['permanentes', 'temporales'])->default('permanentes');

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('pago_ventas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained()->onDelete('cascade'); // Relación con la venta

            $table->enum('tipo_pago', ['efectivo', 'tarjeta', 'transferencia', 'otros'])->default('transferencia'); // Tipo de pago (efectivo, tarjeta, transferencia, etc.)

            $table->enum('tipo_moneda', ['usd', 'euro', 'mlc', 'cup'])->default('usd');  // Tipo de moneda que paga el cliente (uds, mlc, euro, cup)

            $table->foreignId('cuenta_id')->constrained('cuentas')->onDelete('cascade');

            $table->enum('via_pago', ['zelle', 'visa', 'paypal', 'mastercard', 'stripe', 'transfermovil', 'enzona', 'otros'])->default('zelle'); // Via de Pago
            $table->decimal('monto', 10, 2); // Monto pagado con ese método
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
