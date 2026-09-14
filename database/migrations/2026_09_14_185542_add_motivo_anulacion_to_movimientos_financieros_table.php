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
        Schema::table('movimientos_financieros', function (Blueprint $table) {
            // 'estado' ya tenía 'cancelado' en su enum desde la migración original — se
            // reusa ese valor para Gasto/Ingreso/Transferencia anulados, mismo criterio de
            // nombre que Venta usa para su propia anulación.
            $table->string('motivo_anulacion')->nullable()->after('estado');
            $table->text('detalle_anulacion')->nullable()->after('motivo_anulacion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('movimientos_financieros', function (Blueprint $table) {
            $table->dropColumn(['motivo_anulacion', 'detalle_anulacion']);
        });
    }
};
