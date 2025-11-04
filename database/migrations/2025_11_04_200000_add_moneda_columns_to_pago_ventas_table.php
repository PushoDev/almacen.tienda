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
    Schema::table('pago_ventas', function (Blueprint $table) {
      // Agregar moneda_id si no existe
      if (!Schema::hasColumn('pago_ventas', 'moneda_id')) {
        $table->foreignId('moneda_id')
          ->nullable()
          ->after('tipo_pago')
          ->constrained('monedas')
          ->onDelete('set null');
      }

      // Renombrar tasa_cambio a tasa_cambio_aplicada si existen ambas (para consistencia)
      if (Schema::hasColumn('pago_ventas', 'tasa_cambio') && !Schema::hasColumn('pago_ventas', 'tasa_cambio_aplicada')) {
        $table->renameColumn('tasa_cambio', 'tasa_cambio_aplicada');
      }
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::table('pago_ventas', function (Blueprint $table) {
      if (Schema::hasColumn('pago_ventas', 'moneda_id')) {
        $table->dropForeignKeyIfExists(['moneda_id']);
        $table->dropColumn('moneda_id');
      }

      if (Schema::hasColumn('pago_ventas', 'tasa_cambio_aplicada') && !Schema::hasColumn('pago_ventas', 'tasa_cambio')) {
        $table->renameColumn('tasa_cambio_aplicada', 'tasa_cambio');
      }
    });
  }
};
