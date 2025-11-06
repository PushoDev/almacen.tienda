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
        Schema::table('almacen_producto', function (Blueprint $table) {
            if (!Schema::hasColumn('almacen_producto', 'cantidad_en_transito')) {
                $table->integer('cantidad_en_transito')->default(0)->after('cantidad');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('almacen_producto', function (Blueprint $table) {
            if (Schema::hasColumn('almacen_producto', 'cantidad_en_transito')) {
                $table->dropColumn('cantidad_en_transito');
            }
        });
    }
};
