<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Esta migración agrega columnas para guardar los saldos antes y después
     * de cada transacción financiera. Es compatible con registros existentes
     * ya que todas las columnas son nullable.
     */
    public function up(): void
    {
        Schema::table('movimientos_financieros', function (Blueprint $table) {
            // Saldos de la entidad ORIGEN (Cuenta o Cliente)
            $table->double('saldo_anterior_origen', 15, 2)->nullable()->after('descripcion')
                ->comment('Saldo de la entidad origen ANTES de la transacción');

            $table->double('saldo_posterior_origen', 15, 2)->nullable()->after('saldo_anterior_origen')
                ->comment('Saldo de la entidad origen DESPUÉS de la transacción');

            $table->string('moneda_origen', 10)->nullable()->after('saldo_posterior_origen')
                ->comment('Moneda del saldo origen (puede diferir de moneda de transacción)');

            // Saldos de la entidad DESTINO (Cuenta, Cliente o Proveedor)
            $table->double('saldo_anterior_destino', 15, 2)->nullable()->after('moneda_origen')
                ->comment('Saldo de la entidad destino ANTES de la transacción');

            $table->double('saldo_posterior_destino', 15, 2)->nullable()->after('saldo_anterior_destino')
                ->comment('Saldo de la entidad destino DESPUÉS de la transacción');

            $table->string('moneda_destino', 10)->nullable()->after('saldo_posterior_destino')
                ->comment('Moneda del saldo destino (puede diferir de moneda de transacción)');

            // Agregar índices para mejorar el rendimiento en consultas
            $table->index(['cuenta_origen_id', 'fecha_operacion'], 'idx_cuenta_origen_fecha');
            $table->index(['cuenta_destino_id', 'fecha_operacion'], 'idx_cuenta_destino_fecha');
            $table->index(['cliente_origen_id', 'fecha_operacion'], 'idx_cliente_origen_fecha');
            $table->index(['cliente_destino_id', 'fecha_operacion'], 'idx_cliente_destino_fecha');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('movimientos_financieros', function (Blueprint $table) {
            // Eliminar índices primero
            $table->dropIndex('idx_cuenta_origen_fecha');
            $table->dropIndex('idx_cuenta_destino_fecha');
            $table->dropIndex('idx_cliente_origen_fecha');
            $table->dropIndex('idx_cliente_destino_fecha');

            // Eliminar columnas
            $table->dropColumn([
                'saldo_anterior_origen',
                'saldo_posterior_origen',
                'moneda_origen',
                'saldo_anterior_destino',
                'saldo_posterior_destino',
                'moneda_destino',
            ]);
        });
    }
};
