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
        // Clasificación explícita del banco/método de pago (ej. 'zelle', 'bandec'), separada
        // a propósito de `imagen` (que es la identidad visual/logo elegido) — pensada para
        // filtrar cuentas por banco a futuro (ej. restringir qué bancos puede operar un
        // vendedor) sin acoplar esa lógica de negocio a un campo cosmético. Nullable: en
        // producción ninguna cuenta existente tiene esto asignado todavía, y el catálogo de
        // bancos sigue creciendo (ver CatalogoTarjetasService), así que es un string libre
        // resuelto contra ese catálogo, no un enum fijo.
        Schema::table('cuentas', function (Blueprint $table) {
            $table->string('tipo_banco')->nullable()->after('imagen');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cuentas', function (Blueprint $table) {
            $table->dropColumn('tipo_banco');
        });
    }
};
