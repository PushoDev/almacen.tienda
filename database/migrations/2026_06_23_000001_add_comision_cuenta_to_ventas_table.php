<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            if (!Schema::hasColumn('ventas', 'comision_cuenta_id')) {
                $table->foreignId('comision_cuenta_id')
                    ->nullable()
                    ->after('mensajero_tasa')
                    ->constrained('cuentas')
                    ->nullOnDelete();
            }
            if (!Schema::hasColumn('ventas', 'comision_tasa')) {
                $table->decimal('comision_tasa', 10, 4)->nullable()->after('comision_cuenta_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            if (Schema::hasColumn('ventas', 'comision_tasa')) {
                $table->dropColumn('comision_tasa');
            }
            if (Schema::hasColumn('ventas', 'comision_cuenta_id')) {
                $table->dropForeign(['comision_cuenta_id']);
                $table->dropColumn('comision_cuenta_id');
            }
        });
    }
};
