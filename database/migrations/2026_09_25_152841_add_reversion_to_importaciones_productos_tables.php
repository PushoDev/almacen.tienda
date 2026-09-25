<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Deshacer una importación: quién la revirtió, cuándo y por qué; y, en cada fila, qué código
     * de barras recibió las unidades (para poder descontarlo al revertir).
     */
    public function up(): void
    {
        Schema::table('importaciones_productos', function (Blueprint $table) {
            $table->foreignId('revertida_por')->nullable()->after('mensaje_error')->constrained('users')->nullOnDelete();
            $table->timestamp('revertida_at')->nullable()->after('revertida_por');
            $table->text('motivo_reversion')->nullable()->after('revertida_at');
        });

        Schema::table('importaciones_producto_filas', function (Blueprint $table) {
            $table->foreignId('producto_codigo_id')->nullable()->after('producto_nuevo')->constrained('producto_codigos')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('importaciones_producto_filas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('producto_codigo_id');
        });

        Schema::table('importaciones_productos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('revertida_por');
            $table->dropColumn(['revertida_at', 'motivo_reversion']);
        });
    }
};
