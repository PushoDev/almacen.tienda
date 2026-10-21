<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Casillero de Compras (Fase 1): una compra nueva puede seguir el flujo "casillero" (no suma
     * stock al registrarse ni al aprobarse; el stock entra una sola vez al llegar al almacén) o el
     * "clasico" de siempre. Las compras existentes quedan como `clasico`. No se toca el enum
     * `estado`: una compra del casillero es `pendiente` hasta que entra al stock.
     */
    public function up(): void
    {
        Schema::table('compras', function (Blueprint $table) {
            $table->string('flujo', 20)->default('clasico')->after('estado');
            $table->string('etapa', 20)->nullable()->after('flujo');
            $table->date('llegada_panama_at')->nullable()->after('etapa');

            $table->index('flujo');
        });
    }

    public function down(): void
    {
        Schema::table('compras', function (Blueprint $table) {
            $table->dropIndex(['flujo']);
            $table->dropColumn(['flujo', 'etapa', 'llegada_panama_at']);
        });
    }
};
