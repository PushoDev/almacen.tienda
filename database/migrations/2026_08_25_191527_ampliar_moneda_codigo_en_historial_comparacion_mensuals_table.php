<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 'PROVEEDORES' (11 chars) no entra en VARCHAR(10) — causaba
        // "Data too long for column 'moneda_codigo'" al agregar la fila
        // sintética de Proveedores en Comparación Mensual. SQLite no aplica
        // límite de longitud en columnas de texto, no hace falta tocarla ahí.
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE historial_comparacion_mensuals MODIFY COLUMN moneda_codigo VARCHAR(20) NOT NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE historial_comparacion_mensuals MODIFY COLUMN moneda_codigo VARCHAR(10) NOT NULL');
        }
    }
};
