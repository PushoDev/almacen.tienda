<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Nullable a propósito: ventas creadas por admin (que no captura turno) o histórico
     * anterior a esta feature quedan sin turno asociado.
     */
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->foreignId('turno_vendedor_id')
                ->nullable()
                ->after('user_id')
                ->constrained('turnos_vendedor')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('turno_vendedor_id');
        });
    }
};
