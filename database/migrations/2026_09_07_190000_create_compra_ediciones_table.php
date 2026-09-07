<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Auditoría de cada edición de una compra pendiente (mismo patrón que
     * `ajustes_saldo_cuenta` para Cuentas): CompraController::actualizar() puede llamarse más
     * de una vez sobre la misma compra mientras siga pendiente, y cada llamada exige un motivo —
     * una sola columna en `compras` perdería el historial de ediciones anteriores.
     */
    public function up(): void
    {
        Schema::create('compra_ediciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('compra_id')->constrained('compras')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->double('total_anterior', 15, 2);
            $table->double('total_nuevo', 15, 2);
            $table->text('motivo');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('compra_ediciones');
    }
};
