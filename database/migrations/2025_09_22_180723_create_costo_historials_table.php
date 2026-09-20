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
        Schema::create('costo_historials', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id');
            $table->decimal('old_cost_usd', 15, 4);
            $table->decimal('new_cost_usd', 15, 4);
            $table->unsignedBigInteger('cost_distribution_id')->nullable();
            $table->text('comentario')->nullable();
            $table->timestamps();

            $table->foreign('product_id')->references('id')->on('productos')->onDelete('cascade');
            $table->foreign('cost_distribution_id')->references('id')->on('cost_distributions')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('costo_historials');
    }
};
