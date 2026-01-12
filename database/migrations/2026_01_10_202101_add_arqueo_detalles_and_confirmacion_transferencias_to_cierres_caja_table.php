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
            $table->json('arqueo_detalles')->nullable()->after('observaciones');
            $table->json('confirmacion_transferencias')->nullable()->after('arqueo_detalles');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cierre_cajas', function (Blueprint $table) {
            $table->dropColumn(['arqueo_detalles', 'confirmacion_transferencias']);
        });
    }
};
