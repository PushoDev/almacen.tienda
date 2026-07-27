<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, ensure all current negative values are corrected to 0
        DB::statement('UPDATE almacen_producto SET cantidad = CASE WHEN cantidad < 0 THEN 0 ELSE cantidad END');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No downgrade needed as this is a data correction
    }
};
