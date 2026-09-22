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
        Schema::table('producto_vendedors', function (Blueprint $table) {
            // true = este precio viene del "precio del grupo" de fichas hermanas (mismo producto
            // repetido en el almacén, ver FichasHermanasService) y se actualiza cuando cambia el
            // precio del grupo. false = precio puesto a mano para ESTA ficha — el precio del
            // grupo nunca lo pisa (salvo que se pida explícitamente).
            $table->boolean('precio_de_grupo')->default(false)->after('comision');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('producto_vendedors', function (Blueprint $table) {
            $table->dropColumn('precio_de_grupo');
        });
    }
};
