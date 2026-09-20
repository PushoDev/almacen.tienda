<?php

use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('cuentas')
            ->where('tipo_cuenta', 'temporales')
            ->update(['tipo_cuenta' => 'permanentes']);

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE cuentas MODIFY COLUMN tipo_cuenta ENUM('permanentes') NOT NULL DEFAULT 'permanentes'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE cuentas MODIFY COLUMN tipo_cuenta ENUM('permanentes', 'temporales', 'deudas') NOT NULL DEFAULT 'permanentes'");
        }
    }
};
