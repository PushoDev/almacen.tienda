<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `lotes_stock.cantidad` era hasta ahora un log solo-aditivo (nunca se decrementaba cuando
     * esas unidades salían por venta, traslado o devolución) — `Producto::costoEnAlmacen()`
     * promediaba sobre una cantidad que podía ser mayor a la real, dando un costo promedio
     * distorsionado en cuanto un almacén tenía 2+ lotes a precios distintos y alguna salida de
     * por medio (confirmado con datos reales: productos #642/#643/#649/#651/#640).
     *
     * `cantidad` se queda como el dato histórico inmutable (cuánto entró originalmente en ese
     * lote). `cantidad_disponible` es la que se decrementa en cada salida — motor de consumo
     * FIFO compartido por Ventas y Movimientos (próxima fase) — y la que `costoEnAlmacen()` debe
     * usar de ahora en más, tanto como peso como divisor.
     *
     * `lote_origen_id` traza de qué lote salió éste, cuando un Movimiento consume de un lote de
     * origen y crea uno nuevo en el destino — necesario para que Distribución de Costos pueda
     * ubicar "todos los lotes que descienden de esta compra" sin ambigüedad, ahora que Compras
     * puede volver a reusar una ficha de catálogo existente en vez de crear una nueva siempre.
     */
    public function up(): void
    {
        Schema::table('lotes_stock', function (Blueprint $table) {
            $table->integer('cantidad_disponible')->nullable()->after('cantidad');
            $table->foreignId('lote_origen_id')->nullable()->after('movimiento_id')
                ->constrained('lotes_stock')->nullOnDelete();
        });

        // Backfill: por defecto, cada lote existente arranca disponible por su cantidad
        // original completa — el ajuste fino contra el stock real de hoy (para los almacenes
        // que ya tuvieron salidas parciales) lo hace el comando `lotes:backfill-cantidad-disponible`
        // por separado, con su propio criterio (FIFO retroactivo) documentado ahí.
        DB::statement('UPDATE lotes_stock SET cantidad_disponible = cantidad WHERE cantidad_disponible IS NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lotes_stock', function (Blueprint $table) {
            $table->dropConstrainedForeignId('lote_origen_id');
            $table->dropColumn('cantidad_disponible');
        });
    }
};
