<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Un cargo es de las compras del casillero (pivote `casillero_cargo_compra`, p. ej. la
     * estadía) o de un contenedor (transporte marítimo y otros): en ese caso lleva `contenedor_id`
     * y no tiene compras en el pivote.
     */
    public function up(): void
    {
        Schema::table('casillero_cargos', function (Blueprint $table) {
            $table->foreignId('contenedor_id')->nullable()->after('user_id')->constrained('contenedores');
        });
    }

    public function down(): void
    {
        Schema::table('casillero_cargos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('contenedor_id');
        });
    }
};
