<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `purchase_id`/`account_id` eran obligatorios (una distribución = una compra + una
     * cuenta). Desde Fase 3 son campos legado — la fuente real del lote/financiamiento es
     * `cost_distribution_compras`/`cost_distribution_cuentas` — y ahora una distribución puede
     * cubrir un lote de movimientos en vez de compras, sin ninguna compra/cuenta "legado" que
     * asignarles. Se vuelven nullable para eso.
     *
     * Se recrea la tabla en vez de alterarla in-place — mismo motivo que
     * `2026_08_12_190000_make_user_id_nullable_on_historial_comparacion_mensuals_table.php`:
     * sin doctrine/dbal instalado no hay `->nullable()->change()`, y SQLite (usado en los
     * tests) no permite quitar un NOT NULL vía ALTER TABLE de todas formas. Los checks de FK se
     * desactivan durante el swap porque, a diferencia de esa migración anterior, esta tabla sí
     * tiene hijos (`cost_distribution_items`, `cost_distribution_cuentas`,
     * `cost_distribution_compras`, `cost_distribution_movimientos`, `costo_historials`).
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('cost_distributions_new', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('purchase_id')->nullable();
            $table->decimal('amount_cup', 15, 2);
            $table->decimal('amount_usd', 15, 2);
            $table->decimal('exchange_rate', 15, 8);
            $table->decimal('remaining_amount_usd', 15, 4)->default(0);
            $table->decimal('remaining_amount_cup', 15, 2)->default(0);
            $table->unsignedBigInteger('account_id')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->text('details')->nullable();
            $table->timestamps();

            $table->foreign('purchase_id')->references('id')->on('compras')->onDelete('cascade');
            $table->foreign('account_id')->references('id')->on('cuentas')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
        });

        DB::statement(
            'INSERT INTO cost_distributions_new
                (id, purchase_id, amount_cup, amount_usd, exchange_rate, remaining_amount_usd,
                 remaining_amount_cup, account_id, user_id, details, created_at, updated_at)
             SELECT id, purchase_id, amount_cup, amount_usd, exchange_rate, remaining_amount_usd,
                    remaining_amount_cup, account_id, user_id, details, created_at, updated_at
             FROM cost_distributions'
        );

        Schema::drop('cost_distributions');
        Schema::rename('cost_distributions_new', 'cost_distributions');

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     *
     * Si ya existen filas con purchase_id/account_id = null (distribuciones de movimientos, el
     * propósito de esta migración) el rollback falla al reinsertar contra columnas NOT NULL —
     * esperable, mismo comportamiento que la migración de referencia.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('cost_distributions_old', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('purchase_id');
            $table->decimal('amount_cup', 15, 2);
            $table->decimal('amount_usd', 15, 2);
            $table->decimal('exchange_rate', 15, 8);
            $table->decimal('remaining_amount_usd', 15, 4)->default(0);
            $table->decimal('remaining_amount_cup', 15, 2)->default(0);
            $table->unsignedBigInteger('account_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->text('details')->nullable();
            $table->timestamps();

            $table->foreign('purchase_id')->references('id')->on('compras')->onDelete('cascade');
            $table->foreign('account_id')->references('id')->on('cuentas')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
        });

        DB::statement(
            'INSERT INTO cost_distributions_old
                (id, purchase_id, amount_cup, amount_usd, exchange_rate, remaining_amount_usd,
                 remaining_amount_cup, account_id, user_id, details, created_at, updated_at)
             SELECT id, purchase_id, amount_cup, amount_usd, exchange_rate, remaining_amount_usd,
                    remaining_amount_cup, account_id, user_id, details, created_at, updated_at
             FROM cost_distributions'
        );

        Schema::drop('cost_distributions');
        Schema::rename('cost_distributions_old', 'cost_distributions');

        Schema::enableForeignKeyConstraints();
    }
};
