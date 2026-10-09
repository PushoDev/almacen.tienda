<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Historial de cada envío: quién lo envió, quién lo confirmó, rechazó, anuló o resolvió su diferencia.
     */
    public function up(): void
    {
        Schema::create('transferencia_pendiente_seguimientos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transferencia_pendiente_id')
                ->constrained('transferencias_pendientes', indexName: 'tp_seguimientos_envio_foreign')
                ->cascadeOnDelete();
            $table->string('estado', 30);
            $table->text('observaciones')->nullable();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->index(['transferencia_pendiente_id', 'estado'], 'tp_seguimientos_envio_estado_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transferencia_pendiente_seguimientos');
    }
};
