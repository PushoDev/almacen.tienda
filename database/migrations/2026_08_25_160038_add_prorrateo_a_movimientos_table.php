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
        Schema::table('movimientos', function (Blueprint $table) {
            $table->boolean('requiere_prorrateo')->default(false)->after('fecha_recepcion');
            $table->string('prorrateo_decision')->nullable()->after('requiere_prorrateo');
            $table->foreignId('prorrateo_decidido_por')->nullable()->after('prorrateo_decision')->constrained('users')->nullOnDelete();
            $table->timestamp('prorrateo_decidido_en')->nullable()->after('prorrateo_decidido_por');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('movimientos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('prorrateo_decidido_por');
            $table->dropColumn(['requiere_prorrateo', 'prorrateo_decision', 'prorrateo_decidido_en']);
        });
    }
};
