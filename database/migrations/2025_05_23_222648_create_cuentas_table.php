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
        Schema::create('cuentas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre_cuenta')->unique();
            $table->double('saldo_cuenta', 15, 8)->nullable()->default(1234.56);
            $table->enum('tipo_moneda', ['USD', 'EUR', 'MLC', 'CUP'])->default('USD');
            // Para deudas de proveedores
            $table->double('deuda', 15, 8)->default(0)->nullable();
            $table->enum('tipo_cuenta', ['permanentes', 'temporales', 'deudas'])->default('permanentes');
            $table->text('notas_cuenta')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cuentas');
    }
};
