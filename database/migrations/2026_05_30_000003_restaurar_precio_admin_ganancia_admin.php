<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('producto_vendedors', function (Blueprint $table) {
            $table->decimal('precio_admin', 10, 2)->nullable()->comment('Precio base establecido por el administrador')->after('comision');
            $table->decimal('ganancia_admin', 10, 2)->nullable()->comment('Ganancia base calculada del precio admin')->after('precio_admin');
        });
    }

    public function down(): void
    {
        Schema::table('producto_vendedors', function (Blueprint $table) {
            $table->dropColumn(['precio_admin', 'ganancia_admin']);
        });
    }
};
