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
        Schema::create('productos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre_producto');
            $table->string('marca_producto')->nullable();
            $table->string('codigo_producto')->nullable()->unique(); // código de barras opcional
            $table->unsignedBigInteger('categoria_id');
            $table->foreign('categoria_id')
                ->references('id')->on('categorias')
                ->onUpdate('cascade')
                ->onDelete('cascade');
            $table->decimal('precio_compra_producto', 10, 2)->default(0);
            $table->integer('cantidad_producto')->default(0);
            $table->string('imagen_producto')->nullable()->default('productos/producto-default.png');
            $table->timestamps();

            $table->index(['codigo_producto']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('productos');
    }
};
