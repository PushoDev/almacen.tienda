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
        Schema::table('almacens', function (Blueprint $table) {
            // Agregar nuevas columnas para el responsable
            $table->string('nombre_responsable')->nullable()->after('notas_almacen');
            $table->string('apellido_responsable')->nullable()->after('nombre_responsable');
            $table->string('carnet_responsable')->nullable()->after('apellido_responsable');
            $table->string('telefono_responsable')->nullable()->after('carnet_responsable');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('almacens', function (Blueprint $table) {
            // Revertir los cambios: eliminar las columnas
            $table->dropColumn([
                'nombre_responsable',
                'apellido_responsable',
                'carnet_responsable',
                'telefono_responsable'
            ]);
        });
    }
};
