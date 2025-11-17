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
        DB::statement('UPDATE almacen_producto SET cantidad = GREATEST(0, cantidad)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No downgrade needed as this is a data correction
    }
};
