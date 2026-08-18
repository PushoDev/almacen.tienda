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
        Schema::table('historial_comparacion_mensuals', function (Blueprint $table) {
            $table->decimal('saldo_inicio_mes', 15, 2)->default(0)->after('moneda_simbolo');
        });

        // Las filas del mes en curso que ya existan fueron creadas bajo el modelo viejo,
        // donde "Saldo Acumulado" era el saldo TOTAL de las cuentas, no el movimiento del
        // mes. Si se dejan tal cual, quedarían con saldo_inicio_mes = 0 (el default de
        // arriba) y el primer cálculo tras esta migración mostraría el saldo completo
        // como si fuera "movimiento del mes" — el mismo problema que se está arreglando.
        // Se borran acá mismo: el siguiente acceso al dashboard (de cualquier admin o
        // moderador) las regenera solas, con el ancla capturada en ese instante. No se
        // pierde ningún dato real del negocio — es una tabla derivada/caché, no la fuente
        // de verdad de nada (ventas, compras, saldos de cuentas no se tocan).
        DB::table('historial_comparacion_mensuals')
            ->where('mes_comparado', now()->startOfMonth()->toDateString())
            ->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('historial_comparacion_mensuals', function (Blueprint $table) {
            $table->dropColumn('saldo_inicio_mes');
        });
    }
};
