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
        Schema::table('ventas', function (Blueprint $table) {
            $table->boolean('es_venta_gestor')->default(false)->nullable();
            $table->decimal('gestor_monto', 15, 2)->default(0)->nullable();
            $table->unsignedBigInteger('gestor_cuenta_id')->nullable();
            $table->string('gestor_comentario', 500)->nullable();

            $table->foreign('gestor_cuenta_id')->references('id')->on('cuentas')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropForeign(['gestor_cuenta_id']);
            $table->dropColumn(['es_venta_gestor', 'gestor_monto', 'gestor_cuenta_id', 'gestor_comentario']);
        });
    }
};
