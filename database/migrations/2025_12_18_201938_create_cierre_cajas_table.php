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
        Schema::create('cierre_cajas', function (Blueprint $table) {
            $table->id();

            // Relaciones
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('revisor_id')->nullable()->constrained('users')->onDelete('set null'); // Quién aprobó/revisó

            // Fechas
            $table->timestamp('fecha_apertura')->nullable();
            $table->timestamp('fecha_cierre')->useCurrent();

            // Saldos y Totales
            $table->decimal('saldo_inicial', 12, 2)->default(0);

            $table->decimal('ventas_efectivo', 12, 2)->default(0);
            $table->decimal('ventas_otros', 12, 2)->default(0); // Tarjeta, Transferencia, etc.

            $table->decimal('total_gastos', 12, 2)->default(0);
            $table->decimal('total_devoluciones', 12, 2)->default(0);

            // Cálculos
            $table->decimal('saldo_esperado', 12, 2)->default(0); // (Inicial + VentasEfectivo - Gastos - Devoluciones)
            $table->decimal('saldo_contado', 12, 2)->default(0);  // Lo que cuenta el cajero
            $table->decimal('diferencia', 12, 2)->default(0);     // (Contado - Esperado)

            // Detalles adicionales
            $table->text('observaciones')->nullable();
            $table->string('comprobante_url')->nullable();

            // Estado
            $table->enum('estado', ['abierto', 'pendiente', 'aprobado', 'rechazado', 'observado'])->default('pendiente');

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cierre_cajas');
    }
};
