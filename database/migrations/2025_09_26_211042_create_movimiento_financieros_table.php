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
        // Registro principal de todas las transacciones financieras
        Schema::create('movimientos_financieros', function (Blueprint $table) {
            $table->id();

            // Relación con el tipo de operación (Gasto, Ingreso, Transferencia)
            $table->foreignId('tipo_movimiento_id')->constrained('tipos_movimiento_financiero');

            // Cuentas involucradas (Origen y Destino)
            // Son nullable porque un Gasto solo tiene Origen y un Ingreso solo tiene Destino,
            // y porque la entidad puede ser un Cliente.
            $table->foreignId('cuenta_origen_id')->nullable()->constrained('cuentas')->comment('ID de la cuenta de origen (si aplica)');
            $table->foreignId('cliente_origen_id')->nullable()->constrained('clientes')->comment('ID del cliente de origen (si aplica)');

            $table->foreignId('cuenta_destino_id')->nullable()->constrained('cuentas')->comment('ID de la cuenta de destino (si aplica)');
            $table->foreignId('cliente_destino_id')->nullable()->constrained('clientes')->comment('ID del cliente de destino (si aplica)');
            $table->foreignId('proveedor_destino_id')->nullable()->constrained('proveedors')->commment('ID del proveedor destino si aplica');
            // Detalles del Monto
            $table->double('monto', 15, 8); // Monto original de la operación
            $table->enum('moneda', ['USD', 'EUR', 'MLC', 'CUP']); // Moneda del monto original
            $table->double('tasa_cambio_aplicada', 15, 8)->nullable(); // Tasa si hubo conversión

            $table->text('descripcion')->nullable();
            $table->timestamp('fecha_operacion'); // Cuando ocurrió la transacción
            $table->enum('estado', ['completado', 'pendiente', 'cancelado'])->default('completado');

            $table->timestamps();

            // 💡 Nota: La restricción de 'different:origen_tipo,origen_id' se maneja en el controlador, no en la DB.
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movimientos_financieros');
    }
};
