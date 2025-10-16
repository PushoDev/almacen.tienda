<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('monedas', function (Blueprint $table) {
            $table->id();
            $table->string('codigo_moneda'); // USD, CUP, etc.
            $table->string('nombre_moneda')->unique();
            $table->string('simbolo_moneda', 14);
            $table->decimal('tasa_cambio', 15, 6)->default(1); // Tasa respecto a moneda principal
            $table->decimal('commission', 8, 4)->default(0); // Comisión porcentual
            $table->boolean('estado')->default(true);
            $table->boolean('principal')->default(false);
            $table->timestamps();

            // Índices
            $table->index('codigo_moneda');
            $table->index('estado');
            $table->index('principal');
        });
    }

    public function down()
    {
        Schema::dropIfExists('monedas');
    }
};
