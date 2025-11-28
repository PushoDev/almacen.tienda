<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('destinatarios_venta', function (Blueprint $table) {
            $table->id();
            $table->foreignId('venta_id')->constrained()->onDelete('cascade');
            $table->string('nombre');
            $table->string('apellidos');
            $table->string('carnet_identidad')->unique();
            $table->text('direccion_residencia')->nullable();
            $table->string('telefono_contacto')->nullable();
            $table->string('parentesco_cliente')->nullable(); // familiar, amigo, etc.
            $table->text('observaciones')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('destinatario_ventas');
    }
};
