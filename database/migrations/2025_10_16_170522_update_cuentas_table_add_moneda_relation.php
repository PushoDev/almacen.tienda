<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Primero agregar el campo moneda_id como nullable temporalmente
        Schema::table('cuentas', function (Blueprint $table) {
            $table->foreignId('moneda_id')
                ->nullable()
                ->after('tipo_moneda')
                ->constrained('monedas')
                ->onDelete('restrict')
                ->onUpdate('cascade');
        });

        // Migrar los datos existentes de tipo_moneda a moneda_id
        $monedas = DB::table('monedas')->get()->keyBy('codigo_moneda');

        $cuentas = DB::table('cuentas')->get();

        foreach ($cuentas as $cuenta) {
            $moneda = $monedas[$cuenta->tipo_moneda] ?? null;
            if ($moneda) {
                DB::table('cuentas')
                    ->where('id', $cuenta->id)
                    ->update(['moneda_id' => $moneda->id]);
            }
        }

        // Hacer el campo moneda_id no nullable
        Schema::table('cuentas', function (Blueprint $table) {
            $table->foreignId('moneda_id')->nullable(false)->change();
        });

        // Eliminar el campo tipo_moneda (OPCIONAL - puedes mantenerlo como respaldo temporal)
        // Schema::table('cuentas', function (Blueprint $table) {
        //     $table->dropColumn('tipo_moneda');
        // });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Primero recrear el campo tipo_moneda si lo eliminaste
        // Schema::table('cuentas', function (Blueprint $table) {
        //     $table->enum('tipo_moneda', ['USD', 'EUR', 'MLC', 'CUP'])->default('USD');
        // });

        // Migrar datos de vuelta si es necesario
        // $cuentas = DB::table('cuentas')
        //     ->join('monedas', 'cuentas.moneda_id', '=', 'monedas.id')
        //     ->select('cuentas.id', 'monedas.codigo_moneda')
        //     ->get();

        // foreach ($cuentas as $cuenta) {
        //     DB::table('cuentas')
        //         ->where('id', $cuenta->id)
        //         ->update(['tipo_moneda' => $cuenta->codigo_moneda]);
        // }

        // Eliminar la foreign key y el campo moneda_id
        Schema::table('cuentas', function (Blueprint $table) {
            $table->dropForeign(['moneda_id']);
            $table->dropColumn('moneda_id');
        });
    }
};
