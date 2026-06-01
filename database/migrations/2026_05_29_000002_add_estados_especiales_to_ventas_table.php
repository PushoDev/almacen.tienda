<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE ventas MODIFY COLUMN estado ENUM('pendiente','completada','cancelada','pendiente_precio','solicitud_especial','rechazada') NOT NULL DEFAULT 'pendiente'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE ventas MODIFY COLUMN estado ENUM('pendiente','completada','cancelada','pendiente_precio') NOT NULL DEFAULT 'pendiente'");
    }
};
