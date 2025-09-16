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
        Schema::create('transacciones_cuentas', function (Blueprint $table) {
            $table->id();
            // Registrar el usuario que realiza la operación
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');

            // Usamos cuenta_origen_id y cuenta_destino_id para mayor claridad.
            // Pueden ser nulos para casos como retiros o recargas.
            $table->foreignId('cuenta_origen_id')->nullable()->constrained('cuentas')->onDelete('set null');
            $table->foreignId('cuenta_destino_id')->nullable()->constrained('cuentas')->onDelete('set null');

            $table->double('monto', 15, 8);
            $table->enum('tipo', ['transferencia', 'retiro', 'pago_deuda', 'recarga']);
            $table->text('comentario')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transacciones_cuentas');
    }
};
