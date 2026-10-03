<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Auditoría de cuándo una operación sobre lotes/costos (fusión de lotes, prorrateo de
        // Distribución de Costos) cambia el valor real del inventario sin que ese cambio salga de
        // una venta o compra normal — típicamente el redondeo del costo promedio ponderado al
        // fusionar lotes, o un incremento de prorrateo que no encuentra unidades vivas a las
        // cuales aplicarse (lote ya vendido del todo, o fusionado y no redirigido). `monto`
        // positivo = ganancia, negativo = pérdida. Ver FusionLotesService y
        // DistribucionCostosController.
        Schema::create('ajustes_valor_inventario', function (Blueprint $table) {
            $table->id();
            $table->string('tipo', 40);
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->foreignId('almacen_id')->constrained('almacens')->cascadeOnDelete();
            $table->foreignId('lote_id')->nullable()->constrained('lotes_stock')->nullOnDelete();
            $table->foreignId('cost_distribution_id')->nullable()->constrained('cost_distributions')->nullOnDelete();
            $table->foreignId('lote_fusion_id')->nullable()->constrained('lote_fusions')->nullOnDelete();
            $table->decimal('monto', 12, 2);
            $table->text('detalle');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ajustes_valor_inventario');
    }
};
