<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateMovimientosTable extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('movimientos', function (Blueprint $table) {
            $table->id();

            // Relaciones principales
            $table->foreignId('almacen_origen_id')->constrained('almacens')->onDelete('cascade');
            $table->foreignId('almacen_destino_id')->constrained('almacens')->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('usuario_aprobacion_id')->nullable()->constrained('users')->onDelete('set null');

            // Información del movimiento
            $table->enum('tipo_movimiento', [
                'traslado',
                'ajuste',
                'venta',
                'compra',
                'devolucion',
            ])->default('traslado');

            $table->enum('estado', [
                'pendiente',
                'aprobado',
                'en_transito',
                'recibido_parcial',
                'recibido_completo',
                'rechazado',
                'cancelado',
            ])->default('pendiente');

            // Información adicional
            $table->text('observaciones')->nullable();
            $table->string('guia_transporte')->nullable();
            $table->string('transportista')->nullable();

            // Fechas importantes
            $table->timestamp('fecha_aprobacion')->nullable();
            $table->timestamp('fecha_envio')->nullable();
            $table->timestamp('fecha_recepcion')->nullable();

            // Auditoría
            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movimientos');
    }
}
