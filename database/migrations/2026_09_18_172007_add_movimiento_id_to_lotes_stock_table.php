<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `lotes_stock` solo se creaba desde Compras (`compra_producto_id` obligatorio). Un
     * Movimiento traslada stock entre almacenes sin crear una ficha de Producto nueva (a
     * diferencia de Compras desde 2026-09-18) — el mismo producto puede terminar con costo
     * distinto en el almacén origen y en el destino (por transporte prorrateado a ese traslado
     * puntual). `compra_producto_id` se vuelve nullable y se agrega `movimiento_id` nullable —
     * un lote viene de una compra O de un movimiento, nunca de los dos.
     *
     * Se recrea la tabla en vez de alterarla in-place — sin doctrine/dbal no hay
     * `->nullable()->change()`, y SQLite (tests) no permite quitar un NOT NULL vía ALTER TABLE.
     * Mismo patrón que `2026_08_25_160425_make_purchase_id_and_account_id_nullable_on_cost_distributions_table.php`.
     * `lotes_stock` no tiene tablas hijas (confirmado por grep), el swap es simple.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('lotes_stock_new', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->foreignId('compra_producto_id')->nullable()->constrained('compra_producto')->cascadeOnDelete();
            $table->foreignId('movimiento_id')->nullable()->constrained('movimientos')->nullOnDelete();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->foreignId('almacen_id')->constrained('almacens')->cascadeOnDelete();
            $table->integer('cantidad');
            $table->decimal('precio_costo', 10, 2);
            $table->timestamps();
        });

        DB::statement(
            'INSERT INTO lotes_stock_new
                (id, codigo, compra_producto_id, producto_id, almacen_id, cantidad, precio_costo, created_at, updated_at)
             SELECT id, codigo, compra_producto_id, producto_id, almacen_id, cantidad, precio_costo, created_at, updated_at
             FROM lotes_stock'
        );

        Schema::drop('lotes_stock');
        Schema::rename('lotes_stock_new', 'lotes_stock');

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     *
     * Si ya existen lotes con movimiento_id (el propósito de esta migración) el rollback falla
     * al reinsertar contra compra_producto_id NOT NULL — esperable, mismo comportamiento que la
     * migración de referencia.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        Schema::create('lotes_stock_old', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->foreignId('compra_producto_id')->constrained('compra_producto')->cascadeOnDelete();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->foreignId('almacen_id')->constrained('almacens')->cascadeOnDelete();
            $table->integer('cantidad');
            $table->decimal('precio_costo', 10, 2);
            $table->timestamps();
        });

        DB::statement(
            'INSERT INTO lotes_stock_old
                (id, codigo, compra_producto_id, producto_id, almacen_id, cantidad, precio_costo, created_at, updated_at)
             SELECT id, codigo, compra_producto_id, producto_id, almacen_id, cantidad, precio_costo, created_at, updated_at
             FROM lotes_stock'
        );

        Schema::drop('lotes_stock');
        Schema::rename('lotes_stock_old', 'lotes_stock');

        Schema::enableForeignKeyConstraints();
    }
};
