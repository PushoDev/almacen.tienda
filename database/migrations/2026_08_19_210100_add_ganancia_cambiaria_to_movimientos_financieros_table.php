<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Solo se llenan para Transferencias creadas desde hoy en adelante — no
     * hay forma de reconstruir la tasa oficial vigente en el momento de una
     * transferencia ya hecha si en ese momento se usó una tasa personalizada
     * (ese dato nunca se guardó). Filas viejas quedan en NULL a propósito.
     */
    public function up(): void
    {
        Schema::table('movimientos_financieros', function (Blueprint $table) {
            $table->decimal('tasa_oficial_en_momento', 15, 4)->nullable()->after('tasa_cambio_aplicada')
                ->comment('Tasa oficial vigente al momento de la operación, para comparar contra tasa_cambio_aplicada (que puede ser personalizada). Solo Transferencias, desde 2026-08-19 en adelante.');
            $table->decimal('ganancia_perdida_cambiaria', 15, 2)->nullable()->after('tasa_oficial_en_momento')
                ->comment('Diferencia en USD entre lo realmente movido (tasa_cambio_aplicada) y lo que hubiera sido a tasa oficial. Solo Transferencias, desde 2026-08-19 en adelante.');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('movimientos_financieros', function (Blueprint $table) {
            $table->dropColumn(['tasa_oficial_en_momento', 'ganancia_perdida_cambiaria']);
        });
    }
};
