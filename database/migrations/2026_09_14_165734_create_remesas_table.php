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
        Schema::create('remesas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('turno_vendedor_id')->nullable()->constrained('turnos_vendedor')->nullOnDelete();

            // Entrada — dinero que entra (cuenta/cliente/proveedor, montos independientes,
            // sin cuadre exigido contra salida+mensajero: la diferencia es el margen del negocio).
            $table->string('entrada_tipo'); // cuenta|cliente|proveedor
            $table->foreignId('entrada_cuenta_id')->nullable()->constrained('cuentas')->nullOnDelete();
            $table->foreignId('entrada_cliente_id')->nullable()->constrained('clientes')->nullOnDelete();
            $table->foreignId('entrada_proveedor_id')->nullable()->constrained('proveedors')->nullOnDelete();
            $table->decimal('entrada_monto', 15, 2);
            $table->string('entrada_moneda', 10);
            $table->decimal('entrada_saldo_anterior', 15, 2);
            $table->decimal('entrada_saldo_posterior', 15, 2);

            // Salida — dinero que sale (pago al destinatario final de la remesa).
            $table->string('salida_tipo'); // cuenta|cliente|proveedor
            $table->foreignId('salida_cuenta_id')->nullable()->constrained('cuentas')->nullOnDelete();
            $table->foreignId('salida_cliente_id')->nullable()->constrained('clientes')->nullOnDelete();
            $table->foreignId('salida_proveedor_id')->nullable()->constrained('proveedors')->nullOnDelete();
            $table->decimal('salida_monto', 15, 2);
            $table->string('salida_moneda', 10);
            $table->decimal('salida_saldo_anterior', 15, 2);
            $table->decimal('salida_saldo_posterior', 15, 2);

            // Mensajero — pago/comisión al mensajero, opcional, solo cuenta.
            $table->foreignId('mensajero_cuenta_id')->nullable()->constrained('cuentas')->nullOnDelete();
            $table->decimal('mensajero_monto', 15, 2)->nullable();
            $table->string('mensajero_moneda', 10)->nullable();
            $table->decimal('mensajero_saldo_anterior', 15, 2)->nullable();
            $table->decimal('mensajero_saldo_posterior', 15, 2)->nullable();

            $table->text('notas')->nullable();
            $table->timestamp('fecha_operacion');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('remesas');
    }
};
