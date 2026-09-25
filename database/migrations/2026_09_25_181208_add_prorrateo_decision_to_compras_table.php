<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Decisión de prorrateo de una compra, igual que la de un movimiento: null = sin decidir,
     * 'aplicado' = ya se distribuyeron costos, 'omitido' = el usuario la eliminó de la lista de
     * pendientes (sin prorratear). Las compras que ya tienen una distribución quedan 'aplicado'.
     */
    public function up(): void
    {
        Schema::table('compras', function (Blueprint $table) {
            $table->string('prorrateo_decision', 20)->nullable()->after('estado');
            $table->foreignId('prorrateo_decidido_por')->nullable()->after('prorrateo_decision')->constrained('users')->nullOnDelete();
            $table->timestamp('prorrateo_decidido_en')->nullable()->after('prorrateo_decidido_por');
        });

        DB::table('compras')
            ->whereIn('id', DB::table('cost_distribution_compras')->select('compra_id'))
            ->update(['prorrateo_decision' => 'aplicado']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('compras', function (Blueprint $table) {
            $table->dropConstrainedForeignId('prorrateo_decidido_por');
            $table->dropColumn(['prorrateo_decision', 'prorrateo_decidido_en']);
        });
    }
};
