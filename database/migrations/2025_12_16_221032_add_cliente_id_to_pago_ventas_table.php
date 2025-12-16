<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pago_ventas', function (Blueprint $table) {
            // ✅ AGREGAR cliente_id (nullable, ya que puede ser cuenta O cliente)
            $table->foreignId('cliente_id')
                ->nullable()
                ->after('cuenta_id')
                ->constrained('clientes')
                ->onDelete('set null');

            // ✅ Opcional: Agregar constraint para que no tenga ambos (cuenta_id Y cliente_id)
            // Esto asegura integridad a nivel de BD
        });
    }

    public function down(): void
    {
        Schema::table('pago_ventas', function (Blueprint $table) {
            $table->dropForeign(['cliente_id']);
            $table->dropColumn('cliente_id');
        });
    }
};
