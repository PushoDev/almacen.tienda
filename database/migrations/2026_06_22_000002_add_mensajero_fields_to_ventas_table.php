<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            if (! Schema::hasColumn('ventas', 'mensajero_monto')) {
                $table->decimal('mensajero_monto', 10, 2)->nullable()->after('motivo_anulacion');
            }
            if (! Schema::hasColumn('ventas', 'mensajero_tipo')) {
                $table->enum('mensajero_tipo', ['propio', 'externo'])->nullable()->after('mensajero_monto');
            }
            if (! Schema::hasColumn('ventas', 'mensajero_cuenta_id')) {
                $table->foreignId('mensajero_cuenta_id')
                    ->nullable()
                    ->after('mensajero_tipo')
                    ->constrained('cuentas')
                    ->nullOnDelete();
            }
            if (! Schema::hasColumn('ventas', 'mensajero_tasa')) {
                $table->decimal('mensajero_tasa', 10, 4)->nullable()->after('mensajero_cuenta_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            if (Schema::hasColumn('ventas', 'mensajero_tasa')) {
                $table->dropColumn('mensajero_tasa');
            }
            if (Schema::hasColumn('ventas', 'mensajero_cuenta_id')) {
                $table->dropForeign(['mensajero_cuenta_id']);
                $table->dropColumn('mensajero_cuenta_id');
            }
            if (Schema::hasColumn('ventas', 'mensajero_tipo')) {
                $table->dropColumn('mensajero_tipo');
            }
            if (Schema::hasColumn('ventas', 'mensajero_monto')) {
                $table->dropColumn('mensajero_monto');
            }
        });
    }
};
