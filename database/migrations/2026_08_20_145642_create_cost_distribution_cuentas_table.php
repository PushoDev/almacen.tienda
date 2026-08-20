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
        Schema::create('cost_distribution_cuentas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cost_distribution_id')->constrained('cost_distributions')->onDelete('cascade');
            $table->foreignId('cuenta_id')->constrained('cuentas')->onDelete('cascade');
            $table->decimal('monto_cup', 15, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cost_distribution_cuentas');
    }
};
