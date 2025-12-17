<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pago_ventas', function (Blueprint $table) {
            // ¡SOLO ESTO!
            $table->foreignId('cuenta_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('pago_ventas', function (Blueprint $table) {
            $table->foreignId('cuenta_id')->nullable(false)->change();
        });
    }
};
