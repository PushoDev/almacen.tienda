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
        Schema::table('lotes_stock', function (Blueprint $table) {
            // Lote en el que se fusionó este (ver FusionLotesService). El lote fusionado queda con
            // cantidad_disponible 0 y se conserva para el historial: las ventas que ya salieron de
            // él siguen apuntando acá con su costo real. Nulo = lote normal, no fusionado.
            $table->foreignId('fusionado_en_lote_id')->nullable()->after('lote_origen_id')
                ->constrained('lotes_stock')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lotes_stock', function (Blueprint $table) {
            $table->dropConstrainedForeignId('fusionado_en_lote_id');
        });
    }
};
