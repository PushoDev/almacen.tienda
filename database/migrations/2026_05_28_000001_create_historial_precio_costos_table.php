<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('historial_precio_costos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->decimal('precio_anterior', 15, 4);
            $table->decimal('precio_nuevo', 15, 4);
            $table->decimal('diferencia', 15, 4);
            $table->integer('stock_momento')->default(0);
            $table->decimal('impacto_financiero', 15, 4)->default(0);
            $table->boolean('es_perdida')->default(false);
            $table->text('motivo')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('historial_precio_costos');
    }
};
