<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Renombre vía SQL directo (no Schema::renameColumn, que necesita doctrine/dbal —
     * no instalado en este proyecto). MySQL 8+ y SQLite 3.25+ soportan esta sintaxis.
     */
    public function up(): void
    {
        DB::statement('ALTER TABLE cost_distribution_cuentas RENAME COLUMN monto_cup TO monto');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE cost_distribution_cuentas RENAME COLUMN monto TO monto_cup');
    }
};
