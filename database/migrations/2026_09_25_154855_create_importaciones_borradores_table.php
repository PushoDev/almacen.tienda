<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Borrador de una importación de Excel: las filas leídas del archivo, para que el usuario las
     * revise y edite en la vista tipo hoja de cálculo ANTES de guardarlas en el inventario. No
     * toca stock ni lotes: solo al confirmar se convierte en una importación (con su historial).
     */
    public function up(): void
    {
        Schema::create('importaciones_borradores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('almacen_id')->constrained('almacens')->cascadeOnDelete();
            $table->string('nombre_archivo');
            $table->string('hash_archivo', 64);
            $table->longText('filas');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('importaciones_borradores');
    }
};
