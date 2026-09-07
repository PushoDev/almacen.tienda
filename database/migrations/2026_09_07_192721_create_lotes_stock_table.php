<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Registro de trazabilidad: qué compra/línea trajo cada tanda de stock a un almacén.
     * Se crea uno por línea de `compra_producto` en CompraController::aprobar() — no reemplaza
     * a AlmacenProducto.cantidad (que sigue siendo el total real por almacén, sin cambios), es
     * un historial aditivo hacia atrás. No hay lógica de consumo (FIFO ni ningún otro criterio)
     * todavía — ventas/movimientos siguen descontando del total de AlmacenProducto igual que
     * siempre; eso queda fuera de alcance hasta que se decida explícitamente.
     *
     * `codigo` se autogenera al crear el lote (ver LoteStock::generarCodigo()) pero es una
     * columna real y editable después — no un valor calculado — por si el negocio quiere
     * hacerlo coincidir con una referencia física del proveedor.
     */
    public function up(): void
    {
        Schema::create('lotes_stock', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->foreignId('compra_producto_id')->constrained('compra_producto')->cascadeOnDelete();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->foreignId('almacen_id')->constrained('almacens')->cascadeOnDelete();
            $table->integer('cantidad');
            $table->decimal('precio_costo', 10, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lotes_stock');
    }
};
