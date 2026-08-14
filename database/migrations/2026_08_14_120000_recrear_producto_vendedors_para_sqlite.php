<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `2026_05_30_000001_refactor_producto_vendedors_unico_por_almacen.php` sólo corre en MySQL
     * (usa ALTER TABLE DROP PRIMARY KEY / DROP FOREIGN KEY vía information_schema, que SQLite no
     * soporta), así que SQLite (usado por el test suite) se quedó con el esquema viejo: PK
     * compuesta (producto_id, user_id, almacen_id), `user_id` NOT NULL y sin `puesto_por_user_id`.
     * `ProductoVendedorController::update()`/`updateBulk()` ya escriben como si el esquema nuevo
     * existiera (nunca mandan `user_id`), así que en SQLite el INSERT falla contra la columna
     * NOT NULL. Se recrea la tabla en SQLite reproduciendo el mismo estado final que MySQL ya
     * tiene — mismo patrón create/copy/drop/rename que `change_compra_producto_primary_key.php`
     * y `make_user_id_nullable_on_historial_comparacion_mensuals_table.php`. Guardado a la
     * inversa de la migración original: nunca toca MySQL (dev/producción), que ya está en el
     * estado correcto desde 2026-05-30.
     */
    public function up(): void
    {
        if (DB::connection()->getDriverName() === 'mysql') {
            return;
        }

        Schema::create('producto_vendedors_new', function (Blueprint $table) {
            $table->foreignId('producto_id')->constrained()->cascadeOnDelete();
            $table->foreignId('almacen_id')->constrained('almacens')->cascadeOnDelete();
            $table->decimal('precio_venta', 10, 2)->default(0.00);
            $table->decimal('venta_ganancia', 10, 2)->default(0.00);
            $table->decimal('comision', 8, 2)->default(0.00);
            $table->decimal('precio_admin', 10, 2)->nullable();
            $table->decimal('ganancia_admin', 10, 2)->nullable();
            $table->unsignedBigInteger('puesto_por_user_id')->nullable();
            $table->timestamps();

            $table->primary(['producto_id', 'almacen_id']);
            $table->foreign('puesto_por_user_id')->references('id')->on('users')->nullOnDelete();
            $table->index(['almacen_id', 'precio_venta']);
        });

        DB::statement(
            'INSERT INTO producto_vendedors_new
                (producto_id, almacen_id, precio_venta, venta_ganancia, comision,
                 precio_admin, ganancia_admin, puesto_por_user_id, created_at, updated_at)
             SELECT producto_id, almacen_id, precio_venta, venta_ganancia, comision,
                    precio_admin, ganancia_admin, user_id, created_at, updated_at
             FROM producto_vendedors
             GROUP BY producto_id, almacen_id'
        );

        Schema::drop('producto_vendedors');
        Schema::rename('producto_vendedors_new', 'producto_vendedors');
    }

    /**
     * Reverse the migrations.
     *
     * Si existiera más de un usuario habiendo puesto precio para el mismo (producto_id,
     * almacen_id) el rollback fallaría al reinsertar contra la PK vieja — esperable, ese es
     * justo el caso que el refactor de mayo eliminó.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'mysql') {
            return;
        }

        Schema::create('producto_vendedors_old', function (Blueprint $table) {
            $table->foreignId('producto_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('almacen_id')->constrained('almacens')->cascadeOnDelete();
            $table->decimal('precio_venta', 10, 2)->default(0.00);
            $table->decimal('venta_ganancia', 10, 2)->default(0.00);
            $table->decimal('comision', 8, 2)->default(0.00);
            $table->decimal('precio_admin', 10, 2)->nullable();
            $table->decimal('ganancia_admin', 10, 2)->nullable();
            $table->timestamps();

            $table->primary(['producto_id', 'user_id', 'almacen_id']);
            $table->index(['user_id', 'almacen_id', 'precio_venta']);
        });

        DB::statement(
            'INSERT INTO producto_vendedors_old
                (producto_id, user_id, almacen_id, precio_venta, venta_ganancia, comision,
                 precio_admin, ganancia_admin, created_at, updated_at)
             SELECT producto_id, puesto_por_user_id, almacen_id, precio_venta, venta_ganancia,
                    comision, precio_admin, ganancia_admin, created_at, updated_at
             FROM producto_vendedors
             WHERE puesto_por_user_id IS NOT NULL'
        );

        Schema::drop('producto_vendedors');
        Schema::rename('producto_vendedors_old', 'producto_vendedors');
    }
};
