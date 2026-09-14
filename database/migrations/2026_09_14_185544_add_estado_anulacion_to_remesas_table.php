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
        Schema::table('remesas', function (Blueprint $table) {
            $table->enum('estado', ['completado', 'anulada'])->default('completado')->after('fecha_operacion');
            $table->string('motivo_anulacion')->nullable()->after('estado');
            $table->text('detalle_anulacion')->nullable()->after('motivo_anulacion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('remesas', function (Blueprint $table) {
            $table->dropColumn(['estado', 'motivo_anulacion', 'detalle_anulacion']);
        });
    }
};
