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
        Schema::table('compras', function (Blueprint $table) {
            $table->double('receptor_saldo_anterior', 15, 2)->nullable()->after('total_compra');
            $table->double('receptor_saldo_posterior', 15, 2)->nullable()->after('receptor_saldo_anterior');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('compras', function (Blueprint $table) {
            $table->dropColumn(['receptor_saldo_anterior', 'receptor_saldo_posterior']);
        });
    }
};
