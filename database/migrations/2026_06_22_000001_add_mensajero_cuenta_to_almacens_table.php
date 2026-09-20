<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('almacens', function (Blueprint $table) {
            if (! Schema::hasColumn('almacens', 'mensajero_cuenta_id')) {
                $table->foreignId('mensajero_cuenta_id')
                    ->nullable()
                    ->after('notas_almacen')
                    ->constrained('cuentas')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('almacens', function (Blueprint $table) {
            if (Schema::hasColumn('almacens', 'mensajero_cuenta_id')) {
                $table->dropForeign(['mensajero_cuenta_id']);
                $table->dropColumn('mensajero_cuenta_id');
            }
        });
    }
};
