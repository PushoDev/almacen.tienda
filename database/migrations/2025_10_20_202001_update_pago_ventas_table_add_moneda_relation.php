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
        Schema::table('pago_ventas', function (Blueprint $table) {
            // Agregar nueva columna
            $table->unsignedBigInteger('moneda_id')->nullable()->after('tipo_pago');

            // Renombrar columna existente
            $table->renameColumn('tasa_cambio', 'tasa_cambio_aplicada');

            // Agregar foreign key con nombre explícito
            $table->foreign('moneda_id', 'fk_pago_ventas_moneda_id')
                ->references('id')
                ->on('monedas')
                ->onDelete('set null');

            // NOTA: Mantenemos tipo_moneda por ahora para compatibilidad
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pago_ventas', function (Blueprint $table) {
            $table->dropForeign('fk_pago_ventas_moneda_id');
            $table->dropColumn('moneda_id');
            $table->renameColumn('tasa_cambio_aplicada', 'tasa_cambio');
        });
    }
};
