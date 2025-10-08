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
        Schema::create('ventas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('almacen_id')->constrained()->onDelete('cascade');
            $table->foreignId('cliente_id')->nullable()->constrained()->onDelete('set null');
            $table->decimal('total', 15, 2);
            $table->text('detalles_venta')->nullable();
            $table->enum('estado', ['pendiente', 'completada', 'cancelada'])->default('pendiente');
            $table->decimal('tasa_usd_utilizada', 10, 4)->nullable();
            $table->decimal('tasa_mlc_utilizada', 10, 4)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ventas');
    }
};
