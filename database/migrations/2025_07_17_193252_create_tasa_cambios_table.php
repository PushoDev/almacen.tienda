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
        Schema::create('tasa_cambios', function (Blueprint $table) {
            $table->id();
            $table->double('tasa', 15, 8)->default(325.0); // Tasa por defecto
            $table->timestamp('fecha_actualizacion')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasa_cambios');
    }
};
