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
        Schema::table('cierre_cajas', function (Blueprint $table) {
            // Campo para total de comisiones a gestores descontadas en el turno
            $table->decimal('comisiones_gestor', 15, 2)->default(0)->after('total_devoluciones');
            
            // Campo JSON para detalle de comisiones a gestores
            $table->json('comisiones_gestor_detalles')->nullable()->after('comisiones_gestor');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cierre_cajas', function (Blueprint $table) {
            $table->dropColumn(['comisiones_gestor', 'comisiones_gestor_detalles']);
        });
    }
};
