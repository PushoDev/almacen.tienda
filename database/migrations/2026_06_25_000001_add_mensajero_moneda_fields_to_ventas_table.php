<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            if (! Schema::hasColumn('ventas', 'mensajero_moneda_id')) {
                $table->foreignId('mensajero_moneda_id')
                    ->nullable()
                    ->after('mensajero_tasa')
                    ->constrained('monedas')
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('ventas', 'mensajero_monto_original')) {
                $table->decimal('mensajero_monto_original', 10, 4)
                    ->nullable()
                    ->after('mensajero_moneda_id');
            }
            if (! Schema::hasColumn('ventas', 'mensajero_tasa_entrada')) {
                $table->decimal('mensajero_tasa_entrada', 10, 4)
                    ->nullable()
                    ->after('mensajero_monto_original');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            if (Schema::hasColumn('ventas', 'mensajero_tasa_entrada')) {
                $table->dropColumn('mensajero_tasa_entrada');
            }
            if (Schema::hasColumn('ventas', 'mensajero_monto_original')) {
                $table->dropColumn('mensajero_monto_original');
            }
            if (Schema::hasColumn('ventas', 'mensajero_moneda_id')) {
                $table->dropForeign(['mensajero_moneda_id']);
                $table->dropColumn('mensajero_moneda_id');
            }
        });
    }
};
