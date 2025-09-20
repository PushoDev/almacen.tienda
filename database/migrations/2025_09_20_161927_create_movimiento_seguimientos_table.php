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
        Schema::create('movimiento_seguimientos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('movimiento_id')->constrained()->onDelete('cascade');
            $table->enum('estado', [
                'pendiente',
                'aprobado',
                'en_transito',
                'recibido_parcial',
                'recibido_completo',
                'rechazado',
                'cancelado'
            ]);
            $table->text('observaciones')->nullable();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('ubicacion')->nullable();
            $table->text('evidencia')->nullable();
            $table->timestamps();

            // Índices
            $table->index(['movimiento_id', 'estado']);
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('movimiento_seguimientos');
    }
};
