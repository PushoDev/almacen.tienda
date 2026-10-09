<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `monto_usd` guarda lo que valía la operación en USD con la tasa del momento en que se hizo, para que el Cierre
     * de Caja no cambie si la tasa de la moneda se mueve después. Las filas que ya existían se congelan con la tasa
     * vigente hoy (no hay otro dato: gastos e ingresos nunca guardaron la tasa de la moneda).
     */
    public function up(): void
    {
        Schema::table('movimientos_financieros', function (Blueprint $table) {
            $table->double('monto_usd')->nullable()->after('monto');
        });

        Schema::table('transferencias_pendientes', function (Blueprint $table) {
            $table->double('monto_usd')->nullable()->after('monto');
        });

        $this->congelarConLaTasaActual('movimientos_financieros', 'cuenta_origen_id', 'cuenta_destino_id');
        $this->congelarConLaTasaActual('transferencias_pendientes', 'cuenta_origen_id', null);
    }

    public function down(): void
    {
        Schema::table('movimientos_financieros', function (Blueprint $table) {
            $table->dropColumn('monto_usd');
        });

        Schema::table('transferencias_pendientes', function (Blueprint $table) {
            $table->dropColumn('monto_usd');
        });
    }

    private function congelarConLaTasaActual(string $tabla, string $columnaCuentaPrincipal, ?string $columnaCuentaAlternativa): void
    {
        $tasaPorCuenta = DB::table('cuentas')
            ->join('monedas', 'monedas.id', '=', 'cuentas.moneda_id')
            ->pluck('monedas.tasa_cambio', 'cuentas.id');
        $tasaPorCodigo = DB::table('monedas')->orderBy('id')->get(['codigo_moneda', 'tasa_cambio'])->unique('codigo_moneda')->pluck('tasa_cambio', 'codigo_moneda');

        DB::table($tabla)->orderBy('id')->chunkById(500, function ($filas) use ($tabla, $tasaPorCuenta, $tasaPorCodigo, $columnaCuentaPrincipal, $columnaCuentaAlternativa) {
            foreach ($filas as $fila) {
                $cuentaId = $fila->{$columnaCuentaPrincipal} ?? ($columnaCuentaAlternativa ? $fila->{$columnaCuentaAlternativa} : null);
                $tasa = (float) ($tasaPorCuenta[$cuentaId] ?? $tasaPorCodigo[$fila->moneda] ?? 1);

                DB::table($tabla)->where('id', $fila->id)->update(['monto_usd' => round((float) $fila->monto / ($tasa > 0 ? $tasa : 1), 2)]);
            }
        }, 'id');
    }
};
