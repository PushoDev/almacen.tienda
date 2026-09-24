<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Dos tipos de venta especial: 'descuento' (algún precio bajo `precio base − comisión`, sin
        // bajar del costo — la decide admin o moderador) y 'bajo_costo' (algún precio bajo el costo
        // — solo la decide un admin). Null para las ventas que no son especiales.
        Schema::table('ventas', function (Blueprint $table) {
            $table->string('tipo_venta_especial', 20)->nullable()->after('nota_venta_especial');
        });

        // Ventas especiales que ya existen: 'bajo_costo' si alguna línea se vendió por debajo del
        // costo al que se vendió (venta_detalles.costo_unitario), 'descuento' en las demás.
        DB::table('ventas')->where('es_venta_especial', true)->update(['tipo_venta_especial' => 'descuento']);

        DB::table('ventas')
            ->where('es_venta_especial', true)
            ->whereExists(fn ($linea) => $linea->select(DB::raw(1))
                ->from('venta_detalles')
                ->whereColumn('venta_detalles.venta_id', 'ventas.id')
                ->whereColumn('venta_detalles.precio_venta', '<', 'venta_detalles.costo_unitario'))
            ->update(['tipo_venta_especial' => 'bajo_costo']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropColumn('tipo_venta_especial');
        });
    }
};
