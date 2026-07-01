<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cierre_cajas', function (Blueprint $table) {
            $table->decimal('mensajero_total_usd', 10, 2)->nullable()->after('snapshot_clientes');
            $table->decimal('mensajero_total_cup', 12, 2)->nullable()->after('mensajero_total_usd');
            $table->unsignedInteger('mensajero_count')->nullable()->after('mensajero_total_cup');
            $table->json('mensajero_detalles')->nullable()->after('mensajero_count');
        });
    }

    public function down(): void
    {
        Schema::table('cierre_cajas', function (Blueprint $table) {
            $table->dropColumn(['mensajero_total_usd', 'mensajero_total_cup', 'mensajero_count', 'mensajero_detalles']);
        });
    }
};
