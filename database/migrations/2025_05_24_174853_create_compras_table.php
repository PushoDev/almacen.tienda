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
        Schema::create('compras', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('proveedor_id');
            $table->unsignedBigInteger('cuenta_id')->nullable();
            $table->unsignedBigInteger('cliente_id')->nullable();
            $table->date('fecha_compra');
            $table->decimal('total_compra', 10, 2)->default(0);
            $table->string('tipo_compra'); // 'deuda_proveedor', 'pago_cash', 'pago_cliente_fisico'
            $table->timestamps();

            $table->foreign('proveedor_id')->references('id')->on('proveedors')->onDelete('cascade');
            $table->foreign('cuenta_id')->references('id')->on('cuentas')->onDelete('cascade');
            $table->foreign('cliente_id')->references('id')->on('clientes')->onDelete('cascade');

            // Índices para optimizar consultas frecuentes
            $table->index(['fecha_compra']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('compras');
    }
};
