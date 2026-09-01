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
            $table->double('comision_saldo_anterior', 15, 2)->nullable()->after('comision_tasa');
            $table->double('comision_saldo_posterior', 15, 2)->nullable()->after('comision_saldo_anterior');
            $table->double('gestor_saldo_anterior', 15, 2)->nullable()->after('gestor_comentario');
            $table->double('gestor_saldo_posterior', 15, 2)->nullable()->after('gestor_saldo_anterior');
            $table->double('mensajero_saldo_anterior', 15, 2)->nullable()->after('mensajero_monto_final_cup');
            $table->double('mensajero_saldo_posterior', 15, 2)->nullable()->after('mensajero_saldo_anterior');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropColumn([
                'comision_saldo_anterior',
                'comision_saldo_posterior',
                'gestor_saldo_anterior',
                'gestor_saldo_posterior',
                'mensajero_saldo_anterior',
                'mensajero_saldo_posterior',
            ]);
        });
    }
};
