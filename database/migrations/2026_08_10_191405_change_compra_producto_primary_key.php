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
     * La clave primaria compuesta (compra_id, producto_id) forzaba a que un mismo producto
     * apareciera una sola vez por compra, obligando al controller a fusionar cantidades y
     * promediar el precio cuando el mismo producto se agregaba dos veces (p. ej. mandado a
     * dos almacenes distintos), perdiendo el detalle de cada línea original. Se reemplaza por
     * un id autoincremental: cada línea del carrito queda como su propia fila.
     *
     * Se recrea la tabla en vez de alterarla in-place porque SQLite (usado en los tests) no
     * permite agregar una columna PRIMARY KEY vía ALTER TABLE — este patrón (crear tabla nueva,
     * copiar datos, borrar la vieja, renombrar) es compatible con MySQL y SQLite por igual.
     */
    public function up(): void
    {
        Schema::create('compra_producto_new', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('compra_id');
            $table->unsignedBigInteger('producto_id');
            $table->integer('cantidad')->default(0);
            $table->decimal('precio', 8, 2)->default(0);
            $table->foreignId('almacen_id')->nullable()->constrained('almacens');
            $table->timestamps();

            $table->foreign('compra_id')->references('id')->on('compras')->onDelete('cascade');
            $table->foreign('producto_id')->references('id')->on('productos')->onDelete('cascade');
            $table->index(['compra_id']);
            $table->index(['producto_id']);
        });

        DB::statement(
            'INSERT INTO compra_producto_new (compra_id, producto_id, cantidad, precio, almacen_id, created_at, updated_at)
             SELECT compra_id, producto_id, cantidad, precio, almacen_id, created_at, updated_at FROM compra_producto'
        );

        Schema::drop('compra_producto');
        Schema::rename('compra_producto_new', 'compra_producto');
    }

    /**
     * Reverse the migrations.
     *
     * Si existen líneas duplicadas (mismo producto en más de una línea de una compra) el rollback
     * falla al reinsertar por la clave compuesta — es esperable: esas líneas duplicadas son
     * justamente lo que esta migración existe para permitir.
     */
    public function down(): void
    {
        Schema::create('compra_producto_old', function (Blueprint $table) {
            $table->unsignedBigInteger('compra_id');
            $table->unsignedBigInteger('producto_id');
            $table->integer('cantidad')->default(0);
            $table->decimal('precio', 8, 2)->default(0);
            $table->foreignId('almacen_id')->nullable()->constrained('almacens');
            $table->primary(['compra_id', 'producto_id']);
            $table->timestamps();

            $table->foreign('compra_id')->references('id')->on('compras')->onDelete('cascade');
            $table->foreign('producto_id')->references('id')->on('productos')->onDelete('cascade');
            $table->index(['compra_id']);
            $table->index(['producto_id']);
        });

        DB::statement(
            'INSERT INTO compra_producto_old (compra_id, producto_id, cantidad, precio, almacen_id, created_at, updated_at)
             SELECT compra_id, producto_id, cantidad, precio, almacen_id, created_at, updated_at FROM compra_producto'
        );

        Schema::drop('compra_producto');
        Schema::rename('compra_producto_old', 'compra_producto');
    }
};
