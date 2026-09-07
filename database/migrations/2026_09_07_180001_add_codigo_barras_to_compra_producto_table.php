<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * El código de barras que el usuario escribe al agregar un producto al carrito ya no se
     * consume de inmediato (ProductoCodigo/AlmacenProducto quedan diferidos hasta que la compra
     * se aprueba, ver CompraController::aprobar()) — hay que guardarlo en algún lado mientras
     * la compra está pendiente, para no perderlo. Nullable: no todas las líneas traen código.
     */
    public function up(): void
    {
        Schema::table('compra_producto', function (Blueprint $table) {
            $table->string('codigo_barras')->nullable()->after('es_producto_nuevo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('compra_producto', function (Blueprint $table) {
            $table->dropColumn('codigo_barras');
        });
    }
};
