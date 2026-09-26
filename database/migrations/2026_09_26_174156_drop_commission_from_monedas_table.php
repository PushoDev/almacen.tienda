<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * `monedas.commission` (2026-09-26) no entraba en ningún cálculo: solo se guardaba y se mostraba (CRUD de
     * Monedas y una insignia del Dashboard), y en CUP tenía guardado 720, que ahí se leía como "720 %".
     */
    public function up(): void
    {
        Schema::table('monedas', function (Blueprint $table) {
            $table->dropColumn('commission');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('monedas', function (Blueprint $table) {
            $table->decimal('commission', 8, 4)->default(0)->after('tasa_cambio');
        });
    }
};
