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
            $table->decimal('ganancia_perdida_cambiaria', 15, 4)->default(0.00)->after('total_ganancia');
            $table->decimal('ganancia_real_total', 15, 4)->default(0.00)->after('ganancia_perdida_cambiaria');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropColumn('ganancia_perdida_cambiaria');
            $table->dropColumn('ganancia_real_total');
        });
    }
};
