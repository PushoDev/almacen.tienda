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
        DB::table('cuentas')
            ->where('tipo_cuenta', 'temporales')
            ->update(['tipo_cuenta' => 'permanentes']);

        DB::statement("ALTER TABLE cuentas MODIFY COLUMN tipo_cuenta ENUM('permanentes') NOT NULL DEFAULT 'permanentes'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE cuentas MODIFY COLUMN tipo_cuenta ENUM('permanentes', 'temporales', 'deudas') NOT NULL DEFAULT 'permanentes'");
    }
};
