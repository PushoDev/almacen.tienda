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
        Schema::create('movimiento_detalles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('movimiento_id')->constrained()->onDelete('cascade');
            $table->foreignId('producto_id')->constrained()->onDelete('cascade');
            $table->integer('cantidad_solicitada')->unsigned();
            $table->integer('cantidad_despachada')->unsigned()->default(0);
            $table->integer('cantidad_recibida')->unsigned()->default(0);
            $table->decimal('costo_unitario', 10, 2)->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            // Índices para mejor performance
            $table->index(['movimiento_id', 'producto_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movimiento_detalles');
    }
};
