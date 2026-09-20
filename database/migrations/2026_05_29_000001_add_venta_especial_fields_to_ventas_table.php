<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            // es_venta_especial y nota_venta_especial ya existen en la tabla
            // Solo se agrega el flag para saber si el vendedor ya vio el veredicto
            if (! Schema::hasColumn('ventas', 'decision_notificada')) {
                $column = $table->boolean('decision_notificada')->default(false);

                if (Schema::hasColumn('ventas', 'nota_venta_especial')) {
                    $column->after('nota_venta_especial');
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            if (Schema::hasColumn('ventas', 'decision_notificada')) {
                $table->dropColumn('decision_notificada');
            }
        });
    }
};
