<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `user_id` era obligatorio, así que la comparación "global" (admin/moderador, todas las
     * cuentas) se guardaba con el id del admin que tuviera la sesión abierta en ese momento —
     * cada admin distinto generaba su propia fila para la misma moneda/mes en vez de una sola
     * fila compartida. Se vuelve nullable para que esa fila global se guarde con user_id = null
     * (una sola fila real por moneda/mes, sin depender de quién la disparó).
     *
     * Se recrea la tabla en vez de alterarla in-place — mismo motivo que
     * `2026_08_10_191405_change_compra_producto_primary_key.php`: SQLite (usado en los tests)
     * no permite quitar un NOT NULL vía ALTER TABLE, este patrón es compatible con MySQL y
     * SQLite por igual.
     */
    public function up(): void
    {
        Schema::create('historial_comparacion_mensuals_new', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->date('mes_comparado');
            $table->string('moneda_codigo', 10);
            $table->string('moneda_nombre', 100);
            $table->string('moneda_simbolo', 10);
            $table->decimal('monto_anterior', 15, 6)->default(0);
            $table->decimal('monto_actual', 15, 6)->default(0);
            $table->decimal('diferencia', 15, 6)->default(0);
            $table->decimal('porcentaje_cambio', 8, 2)->default(0);
            $table->decimal('tasa_cambio_usada', 10, 6)->default(1);
            $table->timestamps();

            $table->index(['user_id', 'mes_comparado'], 'hcm_user_mes_idx');
            $table->index(['moneda_codigo', 'mes_comparado'], 'hcm_moneda_mes_idx');
        });

        DB::statement(
            'INSERT INTO historial_comparacion_mensuals_new
                (id, user_id, mes_comparado, moneda_codigo, moneda_nombre, moneda_simbolo,
                 monto_anterior, monto_actual, diferencia, porcentaje_cambio, tasa_cambio_usada,
                 created_at, updated_at)
             SELECT id, user_id, mes_comparado, moneda_codigo, moneda_nombre, moneda_simbolo,
                    monto_anterior, monto_actual, diferencia, porcentaje_cambio, tasa_cambio_usada,
                    created_at, updated_at
             FROM historial_comparacion_mensuals'
        );

        Schema::drop('historial_comparacion_mensuals');
        Schema::rename('historial_comparacion_mensuals_new', 'historial_comparacion_mensuals');
    }

    /**
     * Reverse the migrations.
     *
     * Si ya existen filas con user_id = null (la fila global, el propósito de esta migración)
     * el rollback falla al reinsertar contra la columna NOT NULL — esperable.
     */
    public function down(): void
    {
        Schema::create('historial_comparacion_mensuals_old', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->date('mes_comparado');
            $table->string('moneda_codigo', 10);
            $table->string('moneda_nombre', 100);
            $table->string('moneda_simbolo', 10);
            $table->decimal('monto_anterior', 15, 6)->default(0);
            $table->decimal('monto_actual', 15, 6)->default(0);
            $table->decimal('diferencia', 15, 6)->default(0);
            $table->decimal('porcentaje_cambio', 8, 2)->default(0);
            $table->decimal('tasa_cambio_usada', 10, 6)->default(1);
            $table->timestamps();

            $table->index(['user_id', 'mes_comparado'], 'hcm_user_mes_idx');
            $table->index(['moneda_codigo', 'mes_comparado'], 'hcm_moneda_mes_idx');
        });

        DB::statement(
            'INSERT INTO historial_comparacion_mensuals_old
                (id, user_id, mes_comparado, moneda_codigo, moneda_nombre, moneda_simbolo,
                 monto_anterior, monto_actual, diferencia, porcentaje_cambio, tasa_cambio_usada,
                 created_at, updated_at)
             SELECT id, user_id, mes_comparado, moneda_codigo, moneda_nombre, moneda_simbolo,
                    monto_anterior, monto_actual, diferencia, porcentaje_cambio, tasa_cambio_usada,
                    created_at, updated_at
             FROM historial_comparacion_mensuals'
        );

        Schema::drop('historial_comparacion_mensuals');
        Schema::rename('historial_comparacion_mensuals_old', 'historial_comparacion_mensuals');
    }
};
