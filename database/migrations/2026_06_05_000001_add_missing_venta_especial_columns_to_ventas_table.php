<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            if (!Schema::hasColumn('ventas', 'es_venta_especial')) {
                $table->boolean('es_venta_especial')->default(false)->after('total_comision');
            }

            if (!Schema::hasColumn('ventas', 'nota_venta_especial')) {
                $table->string('nota_venta_especial', 500)->nullable()->after('es_venta_especial');
            }
        });
    }

    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $columns = [];
            if (Schema::hasColumn('ventas', 'nota_venta_especial')) {
                $columns[] = 'nota_venta_especial';
            }
            if (Schema::hasColumn('ventas', 'es_venta_especial')) {
                $columns[] = 'es_venta_especial';
            }
            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
