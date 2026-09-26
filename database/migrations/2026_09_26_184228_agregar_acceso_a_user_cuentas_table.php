<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Nivel de acceso del vendedor a cada cuenta asignada: `completo` (ve el saldo y puede operarla: gastos,
     * transferencias, transacciones, ingresos) o `cobro` (solo recibir pagos de ventas, sin ver el saldo).
     * Lo ya asignado queda en `completo`, o sea, sin cambios hasta que se edite el empleado.
     */
    public function up(): void
    {
        Schema::table('user_cuentas', function (Blueprint $table) {
            $table->string('acceso', 10)->default('completo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_cuentas', function (Blueprint $table) {
            $table->dropColumn('acceso');
        });
    }
};
