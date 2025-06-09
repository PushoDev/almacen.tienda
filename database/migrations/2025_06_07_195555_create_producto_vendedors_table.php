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
        Schema::create('producto_vendedors', function (Blueprint $table) {

            $table->foreignId('producto_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->decimal('precio_venta', 10, 2)->comment('Precio asignado por el vendedor')->nullable();
            $table->decimal('venta_ganancia', 10, 2)->nullable();


            // Clave compuesta (evita duplicados producto-vendedor)
            $table->primary(['producto_id', 'user_id']);
            $table->index(['user_id', 'precio_venta']); // Búsquedas rápidas por vendedor

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('producto_vendedors');
    }
};
