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
    Schema::table('productos', function (Blueprint $table) {
      if (!Schema::hasColumn('productos', 'activo')) {
        $table->boolean('activo')->default(true)->after('imagen_producto');
      }
      if (!Schema::hasColumn('productos', 'descripcion_producto')) {
        $table->text('descripcion_producto')->nullable()->after('nombre_producto');
      }
      if (!Schema::hasColumn('productos', 'precio_venta_actualizado')) {
        $table->decimal('precio_venta_actualizado', 10, 2)->default(0)->after('precio_compra_producto');
      }
    });
  }

  /**
   * Reverse the migrations.
   */
  public function down(): void
  {
    Schema::table('productos', function (Blueprint $table) {
      $table->dropColumn(['activo', 'descripcion_producto', 'precio_venta_actualizado']);
    });
  }
};
