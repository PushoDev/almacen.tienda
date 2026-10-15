<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Varios Telegram por usuario: una cuenta de punto de venta la usan varias personas por turno y
     * cada responsable vincula el suyo con el mismo código. La columna vieja `users.telegram_chat_id`
     * NO se borra aquí (se conserva sin uso hasta confirmar que todo funciona); solo se copia.
     */
    public function up(): void
    {
        Schema::create('telegram_vinculos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('chat_id', 50)->unique();
            $table->string('nombre')->nullable();
            $table->timestamp('vinculado_en')->nullable();
            $table->timestamps();
        });

        $existentes = DB::table('users')
            ->whereNotNull('telegram_chat_id')
            ->where('telegram_chat_id', '!=', '')
            ->get(['id', 'telegram_chat_id']);

        foreach ($existentes as $usuario) {
            DB::table('telegram_vinculos')->insert([
                'user_id' => $usuario->id,
                'chat_id' => $usuario->telegram_chat_id,
                'nombre' => null,
                'vinculado_en' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('telegram_vinculos');
    }
};
