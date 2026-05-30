<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('precio_historials', function (Blueprint $table) {
            $table->decimal('comision', 8, 2)->nullable()->after('precio_nuevo');
        });
    }

    public function down(): void
    {
        Schema::table('precio_historials', function (Blueprint $table) {
            $table->dropColumn('comision');
        });
    }
};
