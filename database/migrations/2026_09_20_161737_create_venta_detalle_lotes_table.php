<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Desglose de de qué lote(s) salió cada línea de venta (LoteConsumoService::consumir() puede
     * cruzar más de un lote si el pedido supera el remanente de uno). Necesaria para poder
     * revertir el consumo (sumar `cantidad_disponible` de vuelta) cuando se anula una venta —
     * sin este registro, anular una venta dejaría los lotes permanentemente desincronizados del
     * stock real, el mismo problema que motivó todo este cambio.
     *
     * `lote_stock_id` nullable: null significa que no había lote registrado para cubrir esa
     * cantidad y se usó el costo global de la ficha como mejor aproximación (ver
     * LoteConsumoService::consumir()) — no hay nada que revertir en lotes_stock para esa parte.
     */
    public function up(): void
    {
        Schema::create('venta_detalle_lotes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_detalle_id')->constrained('venta_detalles')->cascadeOnDelete();
            $table->foreignId('lote_stock_id')->nullable()->constrained('lotes_stock')->nullOnDelete();
            $table->integer('cantidad');
            $table->decimal('costo_unitario', 10, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('venta_detalle_lotes');
    }
};
