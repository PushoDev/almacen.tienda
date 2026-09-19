<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Nullable: un cambio de costo puede seguir siendo global (ficha sin almacén elegido, o
     * producto sin ningún almacén todavía) o quedar acotado a un almacén puntual — ver
     * ProductoController::update()/corregirCostoEnAlmacen().
     */
    public function up(): void
    {
        Schema::table('historial_precio_costos', function (Blueprint $table) {
            $table->foreignId('almacen_id')->nullable()->after('producto_id')->constrained('almacens')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('historial_precio_costos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('almacen_id');
        });
    }
};
