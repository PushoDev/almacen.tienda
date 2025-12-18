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
    Schema::table('cierre_cajas', function (Blueprint $table) {
      $table->json('detalles')->nullable()->after('observaciones')
        ->comment('Desglose de pagos por moneda y método: [{moneda: "USD", metodo: "Efectivo", monto: 100}, ...]');
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::table('cierre_cajas', function (Blueprint $table) {
      $table->dropColumn('detalles');
    });
  }
};
