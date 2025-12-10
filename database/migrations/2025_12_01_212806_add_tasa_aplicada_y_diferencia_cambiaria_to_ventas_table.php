<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            // Tasa que el vendedor le puso al cliente (ej: 500, 400, etc)
            $table->decimal('tasa_aplicada_venta', 12, 4)->nullable()->after('tasa_cambio_principal');

            // Moneda en la que se cobró con esa tasa (CUP, MLC, BRL, etc)
            $table->unsignedBigInteger('moneda_cobro_id')->nullable()->after('tasa_aplicada_venta');
            $table->foreign('moneda_cobro_id')->references('id')->on('monedas')->onDelete('set null');

            // DIFERENCIA REAL: + o - según tasa aplicada vs oficial
            $table->decimal('monto_diferencia_cambiaria', 16, 2)->default(0)->after('moneda_cobro_id');
        });
    }

    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropForeign(['moneda_cobro_id']);
            $table->dropColumn(['tasa_aplicada_venta', 'moneda_cobro_id', 'monto_diferencia_cambiaria']);
        });
    }
};
