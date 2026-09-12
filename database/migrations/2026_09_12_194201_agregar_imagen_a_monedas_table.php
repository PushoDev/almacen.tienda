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
        // Insignia visual de la moneda en sí (catálogo en código, ver
        // CatalogoTarjetasService::monedaImagenes()) — distinta a cuentas.imagen: esa es
        // la insignia elegida a mano por cada cuenta tipo=efectivo, esta vive en la
        // moneda una sola vez. Nullable: ninguna moneda existente tiene esto asignado
        // todavía, y el catálogo sigue creciendo (una moneda nueva es una fila + un
        // archivo webp, sin migración).
        Schema::table('monedas', function (Blueprint $table) {
            $table->string('imagen')->nullable()->after('simbolo_moneda');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('monedas', function (Blueprint $table) {
            $table->dropColumn('imagen');
        });
    }
};
