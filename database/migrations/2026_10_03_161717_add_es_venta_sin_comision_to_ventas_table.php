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
        // Venta marcada manualmente (por teléfono/orden directa del dueño) como "de la agencia":
        // nadie gana comisión por ella — ni el punto de venta ni un gestor, si después se configura
        // uno. El mensajero, al ser pass-through, no se ve afectado. Decisión que se toma al crear
        // la venta, no retroactiva (las ventas existentes quedan con el valor por defecto, false).
        Schema::table('ventas', function (Blueprint $table) {
            $table->boolean('es_venta_sin_comision')->default(false)->after('es_venta_especial');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropColumn('es_venta_sin_comision');
        });
    }
};
