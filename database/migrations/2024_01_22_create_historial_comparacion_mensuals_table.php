<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('historial_comparacion_mensuals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->date('mes_comparado'); // Mes que se está comparando (ej: 2024-01-01 para comparar enero 2024)
            $table->string('moneda_codigo', 10); // CUP, USD, etc.
            $table->string('moneda_nombre', 100);
            $table->string('moneda_simbolo', 10);
            $table->decimal('monto_anterior', 15, 6)->default(0); // Saldo del mes anterior
            $table->decimal('monto_actual', 15, 6)->default(0); // Saldo del mes actual
            $table->decimal('diferencia', 15, 6)->default(0); // Diferencia entre meses
            $table->decimal('porcentaje_cambio', 8, 2)->default(0); // Porcentaje de cambio
            $table->decimal('tasa_cambio_usada', 10, 6)->default(1); // Tasa de cambio usada para convertir a USD
            $table->timestamps();

            // Índices para búsquedas rápidas
            $table->index(['user_id', 'mes_comparado']);
            $table->index(['moneda_codigo', 'mes_comparado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('historial_comparacion_mensuals');
    }
};
