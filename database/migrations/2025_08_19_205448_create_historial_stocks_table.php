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
        Schema::create('historial_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained()->onDelete('cascade');
            $table->foreignId('almacen_id')->constrained()->onDelete('cascade');
            $table->foreignId('venta_id')->nullable()->constrained()->onDelete('set null');
            $table->integer('cantidad_anterior');
            $table->integer('cantidad_nueva');
            $table->integer('diferencia');
            $table->enum('tipo', ['venta', 'ajuste', 'compra', 'transferencia']);
            $table->text('observaciones')->nullable();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('historial_stocks');
    }
};
