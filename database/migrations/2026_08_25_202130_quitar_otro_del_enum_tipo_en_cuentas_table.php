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
        // 'otro' nunca se usó en validación ni frontend (confirmado: 0 cuentas reales
        // con este tipo) — el cliente pidió quitarlo para evitar confusión. 'caja'/'banco'
        // también están en el enum pero sin uso real; se dejan intactos, fuera de alcance.
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE cuentas MODIFY COLUMN tipo ENUM('caja', 'banco', 'tarjeta', 'efectivo') NOT NULL DEFAULT 'caja'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE cuentas MODIFY COLUMN tipo ENUM('caja', 'banco', 'tarjeta', 'efectivo', 'otro') NOT NULL DEFAULT 'caja'");
        }
    }
};
