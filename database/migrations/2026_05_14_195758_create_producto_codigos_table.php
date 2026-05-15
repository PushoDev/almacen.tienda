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
        Schema::create('producto_codigos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->onDelete('cascade');
            $table->string('codigo_barras')->index();
            $table->integer('cantidad')->default(0);
            $table->boolean('es_default')->default(false);
            $table->string('imagen_barcode')->nullable();
            $table->timestamps();
        });

        // Data migration
        $productos = \Illuminate\Support\Facades\DB::table('productos')->get();
        foreach ($productos as $producto) {
            if (!empty($producto->codigo_producto)) {
                $cantidad_total = \Illuminate\Support\Facades\DB::table('almacen_producto')
                    ->where('producto_id', $producto->id)
                    ->sum('cantidad');

                \Illuminate\Support\Facades\DB::table('producto_codigos')->insert([
                    'producto_id' => $producto->id,
                    'codigo_barras' => $producto->codigo_producto,
                    'cantidad' => $cantidad_total,
                    'es_default' => true,
                    'imagen_barcode' => $producto->barcode_image ?? null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('producto_codigos');
    }
};
