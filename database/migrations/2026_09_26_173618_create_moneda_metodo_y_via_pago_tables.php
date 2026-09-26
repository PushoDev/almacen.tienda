<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Qué métodos de pago admite cada moneda (`moneda_metodo_pago`) y, dentro de la transferencia, qué
     * vías (`moneda_via_pago`). Se llena desde el CRUD de Monedas.
     */
    public function up(): void
    {
        Schema::create('moneda_metodo_pago', function (Blueprint $table) {
            $table->id();
            $table->foreignId('moneda_id')->constrained('monedas')->cascadeOnDelete();
            $table->foreignId('metodo_pago_id')->constrained('metodos_pago')->cascadeOnDelete();
            $table->unique(['moneda_id', 'metodo_pago_id']);
        });

        Schema::create('moneda_via_pago', function (Blueprint $table) {
            $table->id();
            $table->foreignId('moneda_id')->constrained('monedas')->cascadeOnDelete();
            $table->foreignId('via_pago_id')->constrained('vias_pago')->cascadeOnDelete();
            $table->unique(['moneda_id', 'via_pago_id']);
        });

        // Lo que ya funcionaba antes: todas las monedas admiten los dos métodos. Vías: CUP con las
        // cubanas (EnZona, Transfermóvil) y el resto con las internacionales.
        $metodoIds = DB::table('metodos_pago')->pluck('id');
        $viasCuba = DB::table('vias_pago')->where('ambito', 'cuba')->pluck('id');
        $viasInternacionales = DB::table('vias_pago')->where('ambito', 'internacional')->pluck('id');

        foreach (DB::table('monedas')->get(['id', 'codigo_moneda']) as $moneda) {
            foreach ($metodoIds as $metodoId) {
                DB::table('moneda_metodo_pago')->insert(['moneda_id' => $moneda->id, 'metodo_pago_id' => $metodoId]);
            }

            foreach ($moneda->codigo_moneda === 'CUP' ? $viasCuba : $viasInternacionales as $viaId) {
                DB::table('moneda_via_pago')->insert(['moneda_id' => $moneda->id, 'via_pago_id' => $viaId]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('moneda_via_pago');
        Schema::dropIfExists('moneda_metodo_pago');
    }
};
