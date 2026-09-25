<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Historial de importaciones de productos desde Excel: una fila por archivo subido, con sus
     * contadores y el hash del archivo (para avisar si el mismo archivo ya se importó en ese
     * almacén). El detalle fila por fila vive en `importaciones_producto_filas`.
     */
    public function up(): void
    {
        Schema::create('importaciones_productos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('almacen_id')->constrained('almacens')->cascadeOnDelete();
            $table->string('nombre_archivo');
            $table->string('hash_archivo', 64)->index();
            $table->string('estado', 20)->default('completada'); // completada | con_omitidas | fallida | revertida
            $table->unsignedInteger('filas_procesadas')->default(0);
            $table->unsignedInteger('productos_creados')->default(0);
            $table->unsignedInteger('productos_actualizados')->default(0);
            $table->unsignedInteger('productos_sin_stock')->default(0);
            $table->unsignedInteger('filas_omitidas')->default(0);
            $table->unsignedInteger('lotes_creados')->default(0);
            $table->unsignedInteger('unidades_importadas')->default(0);
            $table->text('mensaje_error')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('importaciones_productos');
    }
};
