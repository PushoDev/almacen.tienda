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
        Schema::table('ventas', function (Blueprint $table) {
            // Agregar nuevas columnas
            $table->unsignedBigInteger('moneda_id')->nullable()->after('cliente_id');
            $table->decimal('tasa_cambio_principal', 10, 6)->default(1)->after('moneda_id');

            // Agregar foreign key con nombre explícito
            $table->foreign('moneda_id', 'fk_ventas_moneda_id')
                ->references('id')
                ->on('monedas')
                ->onDelete('set null');

            // NOTA: No eliminamos las columnas antiguas aún para mantener compatibilidad
            // Las eliminaremos en una migración posterior una vez que todo funcione
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropForeign('fk_ventas_moneda_id');
            $table->dropColumn(['moneda_id', 'tasa_cambio_principal']);
        });
    }
};
