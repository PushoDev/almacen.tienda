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
        Schema::create('historial_tasa_cambios', function (Blueprint $table) {
            $table->id();

            // Relación con la moneda afectada
            $table->foreignId('moneda_id')->constrained('monedas')->onDelete('cascade');

            // Relación con el usuario que hizo el cambio
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

            // Tasas de cambio
            $table->decimal('tasa_anterior', 20, 6)->comment('Tasa antes del cambio');
            $table->decimal('tasa_nueva', 20, 6)->comment('Tasa después del cambio');
            $table->decimal('diferencia_tasa', 20, 6)->comment('Diferencia absoluta entre tasas');
            $table->decimal('porcentaje_cambio', 10, 4)->comment('Porcentaje de cambio en la tasa');

            // Impacto financiero
            $table->decimal('total_cuentas_afectadas', 20, 6)->default(0)->comment('Suma total de saldos en cuentas afectadas');
            $table->decimal('impacto_financiero', 20, 6)->default(0)->comment('Ganancia (+) o pérdida (-) en moneda principal');
            $table->decimal('impacto_porcentaje', 10, 4)->default(0)->comment('Impacto financiero como porcentaje del total');

            // Metadatos
            $table->integer('numero_cuentas_afectadas')->default(0)->comment('Número de cuentas que usan esta moneda');

            $table->timestamps();

            // Índices para mejor rendimiento
            $table->index(['moneda_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('historial_tasa_cambios');
    }
};
