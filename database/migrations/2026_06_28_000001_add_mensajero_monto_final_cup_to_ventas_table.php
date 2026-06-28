<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            if (!Schema::hasColumn('ventas', 'mensajero_monto_final_cup')) {
                $table->decimal('mensajero_monto_final_cup', 10, 2)
                    ->nullable()
                    ->after('mensajero_tasa_entrada');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            if (Schema::hasColumn('ventas', 'mensajero_monto_final_cup')) {
                $table->dropColumn('mensajero_monto_final_cup');
            }
        });
    }
};
