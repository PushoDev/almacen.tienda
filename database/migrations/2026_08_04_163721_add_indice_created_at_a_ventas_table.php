<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * created_at es la columna por la que ordenan/filtran Rastreo de Operaciones y otros
     * reportes (Ventas por Período, etc.) — sin índice, esas consultas hacen full table scan
     * a medida que la tabla crece.
     */
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });
    }
};
