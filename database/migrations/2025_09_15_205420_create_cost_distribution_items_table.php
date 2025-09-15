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
        Schema::create('cost_distribution_items', function (Blueprint $table) {
            // En el archivo de migración de CostDistributionItem
            $table->id();
            $table->unsignedBigInteger('cost_distribution_id');
            $table->unsignedBigInteger('product_id');
            $table->decimal('distributed_amount_usd', 15, 2);
            $table->decimal('old_cost_usd', 15, 2);
            $table->decimal('new_cost_usd', 15, 2);
            $table->timestamps();

            $table->foreign('cost_distribution_id')->references('id')->on('cost_distributions')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('productos')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cost_distribution_items');
    }
};
