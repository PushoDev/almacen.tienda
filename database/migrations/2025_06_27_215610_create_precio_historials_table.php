<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePrecioHistorialsTable extends Migration
{
    public function up()
    {
        Schema::create('precio_historials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('almacen_id')->nullable()->constrained('almacens')->onDelete('cascade');

            $table->decimal('precio_anterior', 10, 2)->nullable();
            $table->decimal('precio_nuevo', 10, 2);
            $table->string('accion')->default('actualizacion');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('precio_historials');
    }
}
