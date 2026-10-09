<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lo que el cierre dejaba sin guardar: quién lo cerró (turno "Atendido por" activo), los turnos que hubo en el
     * periodo con lo que movió cada uno y los envíos de dinero que seguían en tránsito al cerrar. Los cierres que ya
     * existen quedan en null.
     */
    public function up(): void
    {
        Schema::table('cierre_cajas', function (Blueprint $table) {
            $table->foreignId('turno_vendedor_id')
                ->nullable()
                ->after('revisor_id')
                ->constrained('turnos_vendedor')
                ->nullOnDelete();
            $table->json('resumen_turnos')->nullable();
            $table->json('envios_en_transito')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('cierre_cajas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('turno_vendedor_id');
            $table->dropColumn(['resumen_turnos', 'envios_en_transito']);
        });
    }
};
