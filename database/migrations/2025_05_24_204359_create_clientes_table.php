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
        Schema::create('clientes', function (Blueprint $table) {
            $table->id();
            $table->string('nombre_cliente')->unique();
            $table->enum('tipo_cliente', ['fisico', 'asociado'])->default('fisico');
            $table->double('deuda_pago_cliente', 15, 8)->default(0)->nullable();
            $table->string('telefono_cliente')->unique();
            $table->string('direccion_cliente')->nullable();
            $table->string('ciudad_cliente')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clientes');
    }
};
