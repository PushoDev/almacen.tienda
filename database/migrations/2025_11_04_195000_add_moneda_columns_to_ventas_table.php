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
    Schema::table('ventas', function (Blueprint $table) {
      // Agregar columna moneda_id si no existe
      if (!Schema::hasColumn('ventas', 'moneda_id')) {
        $table->foreignId('moneda_id')->nullable()->constrained()->onDelete('set null');
      }

      // Agregar columna tasa_cambio_principal si no existe
      if (!Schema::hasColumn('ventas', 'tasa_cambio_principal')) {
        $table->decimal('tasa_cambio_principal', 10, 4)->nullable();
      }
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::table('ventas', function (Blueprint $table) {
      // Eliminar las columnas si existen
      if (Schema::hasColumn('ventas', 'moneda_id')) {
        $table->dropForeignIdFor('Moneda');
        $table->dropColumn('moneda_id');
      }

      if (Schema::hasColumn('ventas', 'tasa_cambio_principal')) {
        $table->dropColumn('tasa_cambio_principal');
      }
    });
  }
};
