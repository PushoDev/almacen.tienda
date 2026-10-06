<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Envío de dinero entre cuentas que NO es inmediato: cuando un vendedor transfiere a una cuenta que no
     * es suya, el dinero sale del origen al enviar y queda "en tránsito" hasta que el destino confirma la
     * cantidad que llegó (mismo patrón que los Movimientos de inventario).
     */
    public function up(): void
    {
        Schema::create('transferencias_pendientes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('turno_vendedor_id')->nullable()->constrained('turnos_vendedor')->nullOnDelete();
            $table->foreignId('cuenta_origen_id')->constrained('cuentas');
            $table->foreignId('cuenta_destino_id')->constrained('cuentas');

            // Lo que sale del origen (en su moneda) y lo que se acredita al destino (en la suya) si llega todo
            $table->decimal('monto', 15, 2);
            $table->string('moneda', 10);
            $table->decimal('monto_destino', 15, 2);
            $table->string('moneda_destino', 10);
            $table->decimal('tasa_cambio_aplicada', 15, 6)->nullable();
            $table->decimal('tasa_oficial_en_momento', 15, 6)->nullable();
            $table->decimal('ganancia_perdida_cambiaria', 15, 2)->default(0);

            // Saldo del origen justo antes y después de enviar (el dinero ya salió)
            $table->decimal('saldo_anterior_origen', 15, 2);
            $table->decimal('saldo_posterior_origen', 15, 2);

            $table->string('estado', 20)->default('en_transito')->index();
            $table->string('comentario', 255)->nullable();

            // Lo que pasó al llegar: cuánto llegó (en la moneda del origen), cuánto se acreditó (en la del destino)
            $table->decimal('monto_recibido', 15, 2)->nullable();
            $table->decimal('monto_acreditado', 15, 2)->nullable();
            $table->decimal('diferencia', 15, 2)->default(0);
            $table->foreignId('confirmado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('fecha_confirmacion')->nullable();

            // Una diferencia (llegó menos de lo enviado) queda "por resolver" hasta que admin/moderador la cierra
            $table->foreignId('diferencia_resuelta_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('diferencia_resuelta_en')->nullable();
            $table->string('diferencia_nota', 255)->nullable();

            // La transferencia normal que se genera al confirmar, para que Rastreo y los reportes la vean
            $table->foreignId('movimiento_financiero_id')->nullable()->constrained('movimientos_financieros')->nullOnDelete();

            $table->timestamps();

            $table->index(['cuenta_destino_id', 'estado']);
            $table->index(['user_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transferencias_pendientes');
    }
};
