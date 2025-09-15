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
        Schema::create('cost_distributions', function (Blueprint $table) {
            // En el archivo de migración de CostDistribution
            $table->id();
            $table->unsignedBigInteger('purchase_id');
            $table->decimal('amount_cup', 15, 2);
            $table->decimal('amount_usd', 15, 2);
            $table->decimal('exchange_rate', 15, 8);
            $table->unsignedBigInteger('account_id');
            $table->text('details')->nullable();
            $table->timestamps();

            $table->foreign('purchase_id')->references('id')->on('compras')->onDelete('cascade');
            $table->foreign('account_id')->references('id')->on('cuentas')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cost_distributions');
    }
};
