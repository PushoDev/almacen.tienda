<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Log append-only de quién está atendiendo (moderador/vendedor) por cuenta de usuario.
     * No es "una fila por día": el mismo user_id puede tener varias filas el mismo día si la
     * persona cambia a mitad de turno. "Turno activo" = la fila más reciente para ese user_id
     * (ver User::turnoActivo()). Ventas (y potencialmente otras operaciones) guardan a qué fila
     * de aquí estaba activa cuando se crearon, vía ventas.turno_vendedor_id.
     */
    public function up(): void
    {
        Schema::create('turnos_vendedor', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('nombre_vendedor');
            $table->timestamp('iniciado_en')->useCurrent();
            $table->timestamps();

            $table->index(['user_id', 'iniciado_en']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('turnos_vendedor');
    }
};
