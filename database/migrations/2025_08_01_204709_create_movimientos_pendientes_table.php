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
        Schema::create('movimientos_pendientes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained()->onDelete('cascade');
            $table->foreignId('almacen_emisor_id')->constrained('almacens')->onDelete('cascade');
            $table->foreignId('almacen_receptor_id')->constrained('almacens')->onDelete('cascade');
            $table->integer('cantidad');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('estado')->default('pendiente'); // Estado del movimiento
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movimientos_pendientes');
    }
};
