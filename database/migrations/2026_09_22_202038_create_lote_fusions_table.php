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
        // Auditoría de cada fusión de lotes (FusionLotesService): quién unió qué lotes, cuándo, y
        // con qué cantidad y costo venía cada uno — la fusión no se puede deshacer.
        Schema::create('lote_fusions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->foreignId('almacen_id')->constrained('almacens')->cascadeOnDelete();
            $table->foreignId('lote_resultante_id')->constrained('lotes_stock')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            // [{id, codigo, cantidad, precio_costo, precio_venta}] de cada lote unido, tal como estaba.
            $table->json('lotes_origen');
            $table->unsignedInteger('cantidad_total');
            $table->decimal('costo_resultante', 10, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lote_fusions');
    }
};
