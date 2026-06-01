<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->string('motivo_anulacion')->nullable()->after('estado');
            $table->text('detalle_anulacion')->nullable()->after('motivo_anulacion');
        });
    }

    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropColumn(['motivo_anulacion', 'detalle_anulacion']);
        });
    }
};
