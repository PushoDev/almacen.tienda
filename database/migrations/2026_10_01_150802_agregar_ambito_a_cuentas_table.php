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
        // Ámbito de la cuenta: 'nacional' o 'internacional' (ver Cuenta::AMBITO_*), elegido a mano
        // por cuenta — sirve también para cuentas de efectivo, que no tienen banco. Nullable: las
        // cuentas que ya existen en producción quedan "sin clasificar" hasta que se editen.
        Schema::table('cuentas', function (Blueprint $table) {
            $table->string('ambito', 20)->nullable()->after('tipo_banco');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cuentas', function (Blueprint $table) {
            $table->dropColumn('ambito');
        });
    }
};
