<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Los proveedores pasan a ser clientes (primero en Compras) y algunos proveedores reales no tienen teléfono.
 * En MySQL varios NULL no chocan con el índice único de `telefono_cliente`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clientes', function (Blueprint $table) {
            $table->string('telefono_cliente')->nullable()->change();
        });
    }

    public function down(): void
    {
        // Volver a NOT NULL fallaría si ya entró un cliente sin teléfono: se deja admitiendo NULL.
    }
};
