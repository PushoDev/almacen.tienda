<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            if (! Schema::hasColumn('ventas', 'mensajero_cuenta_origen_id')) {
                $table->foreignId('mensajero_cuenta_origen_id')
                    ->nullable()
                    ->after('mensajero_monto_final_cup')
                    ->constrained('cuentas')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            if (Schema::hasColumn('ventas', 'mensajero_cuenta_origen_id')) {
                $table->dropForeign(['mensajero_cuenta_origen_id']);
                $table->dropColumn('mensajero_cuenta_origen_id');
            }
        });
    }
};
