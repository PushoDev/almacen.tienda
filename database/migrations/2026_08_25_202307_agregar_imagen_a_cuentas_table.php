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
        // Guarda la clave de la imagen elegida (ej. 'bandec', 'visa') para el
        // rediseño de Cuentas en tarjetas — ver memoria
        // project_cuentas_rediseno_tarjetas_bancarias. Nullable a propósito:
        // ninguna cuenta existente tiene esto asignado todavía, y el catálogo
        // de imágenes en public/projects/ sigue creciendo, así que no es un
        // enum fijo sino un string libre resuelto contra ese catálogo.
        Schema::table('cuentas', function (Blueprint $table) {
            $table->string('imagen')->nullable()->after('tipo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cuentas', function (Blueprint $table) {
            $table->dropColumn('imagen');
        });
    }
};
