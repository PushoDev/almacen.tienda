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
        Schema::table('ventas', function (Blueprint $table) {
            $table->decimal('ganancia_neta', 15, 2)->nullable()->after('ganancia_real_total')
                ->comment('total_ganancia (por línea, ya con comisión descontada) + ganancia_perdida_cambiaria. Se calcula en aprobarVenta(), null hasta que la venta se aprueba.');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropColumn('ganancia_neta');
        });
    }
};
