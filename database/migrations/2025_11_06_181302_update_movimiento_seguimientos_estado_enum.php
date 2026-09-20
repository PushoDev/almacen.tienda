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
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE movimiento_seguimientos MODIFY estado ENUM('pendiente', 'pendiente_confirmacion', 'aprobado', 'en_transito', 'recibido_parcial', 'recibido_completo', 'rechazado', 'cancelado')");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE movimiento_seguimientos MODIFY estado ENUM('pendiente', 'aprobado', 'en_transito', 'recibido_parcial', 'recibido_completo', 'rechazado', 'cancelado')");
        }
    }
};
