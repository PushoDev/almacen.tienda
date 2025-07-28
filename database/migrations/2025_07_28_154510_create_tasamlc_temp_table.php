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
        Schema::create('tasamlc_temp', function (Blueprint $table) {
            $table->id();
            // Valor por default 1.50
            $table->double('tasa_mlc', 15, 8)->default(1.50);
            $table->timestamp('fecha_actualizacion')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasamlc_temp');
    }
};
