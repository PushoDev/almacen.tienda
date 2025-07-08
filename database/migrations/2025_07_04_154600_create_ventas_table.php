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
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // Usuario que realiza la venta
            $table->foreignId('almacen_id')->constrained()->onDelete('cascade'); // Almacén donde se realiza la venta
            $table->foreignId('cliente_id')->nullable()->constrained()->onDelete('set null'); // Cliente (opcional)
            $table->decimal('total', 10, 2); // Total de la venta
            $table->string('detalles_venta')->nullable(); // Detalles de la Venta
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
