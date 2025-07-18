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
        Schema::create('compra_pago', function (Blueprint $table) {
            /**
             * Objetivo:
             * Hacer compras con varias cuentas
             * cada una aporta un monto especifico escogido
             * por el ususario.
             * El total debe coincidir con los montos
             * seleccionados
             */
            $table->id();
            // Estructura de la tabla
            $table->unsignedBigInteger('compra_id');
            $table->unsignedBigInteger('cuenta_id');
            // En caso de compra sea pagada por cliente fisico
            $table->unsignedBigInteger('cliente_id');
            // Monto pagado desde esa cuenta
            $table->decimal('monto', 10, 2);

            // Claves foráneas
            $table->foreign('compra_id')->references('id')->on('compras')->onDelete('cascade');
            $table->foreign('cuenta_id')->references('id')->on('cuentas')->onDelete('cascade');
            $table->foreign('cliente_id')->references('id')->on('clientes')->onDelete('cascade');

            // Evitar duplicados
            $table->unique(['compra_id', 'cuenta_id', 'cliente_id']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('compra_pago');
    }
};
