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
        Schema::create('proveedors', function (Blueprint $table) {
            $table->id();
            // Detalles de los Proveedores
            $table->string('nombre_proveedor');
            $table->string('telefono_proveedor')->unique()->nullable();
            $table->decimal('saldo_proveedor', 15, 8)->default(0)->nullable();
            $table->string('correo_proveedor')->nullable()->unique();
            $table->string('localidad_proveedor')->nullable();
            $table->text('notas_proveedor')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('proveedors');
    }
};
