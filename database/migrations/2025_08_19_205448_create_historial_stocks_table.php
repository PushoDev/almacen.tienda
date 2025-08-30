<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('historial_stock', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->onDelete('cascade');
            $table->foreignId('almacen_id')->constrained('almacens')->onDelete('cascade');
            $table->foreignId('venta_id')->nullable()->constrained('ventas')->onDelete('cascade');
            $table->integer('cantidad_anterior');
            $table->integer('cantidad_nueva');
            $table->integer('diferencia');
            $table->string('tipo'); // venta, ajuste, compra, etc.
            $table->text('observaciones')->nullable();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('historial_stock');
    }
};
