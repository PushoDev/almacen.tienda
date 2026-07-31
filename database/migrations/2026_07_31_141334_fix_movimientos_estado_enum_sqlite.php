<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `2025_11_06_180049_update_movimientos_estado_enum` y
 * `2025_11_06_181302_update_movimiento_seguimientos_estado_enum` agregan el
 * valor 'pendiente_confirmacion' a los enums de `movimientos.estado` y
 * `movimiento_seguimientos.estado`, pero ambas están gateadas a
 * `if (driver === 'mysql')`. En SQLite (el default del quickstart de este
 * proyecto, ver .env.example) esas migraciones son un no-op: las tablas se
 * quedan con el CHECK constraint original, que NO incluye
 * 'pendiente_confirmacion'. Como MovimientosController::store() crea
 * movimientos (y su primer seguimiento) con exactamente ese estado, en
 * SQLite la creación de cualquier movimiento de stock falla con un error
 * de integridad.
 *
 * Esta migración solo corre en SQLite y deja ambos CHECK igual que en MySQL.
 * En MySQL es un no-op (ya se corrigió en las migraciones originales).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            return;
        }

        Schema::table('movimientos', function (Blueprint $table) {
            $table->enum('estado', [
                'pendiente',
                'pendiente_confirmacion',
                'aprobado',
                'en_transito',
                'recibido_parcial',
                'recibido_completo',
                'rechazado',
                'cancelado',
            ])->default('pendiente')->change();
        });

        Schema::table('movimiento_seguimientos', function (Blueprint $table) {
            $table->enum('estado', [
                'pendiente',
                'pendiente_confirmacion',
                'aprobado',
                'en_transito',
                'recibido_parcial',
                'recibido_completo',
                'rechazado',
                'cancelado',
            ])->change();
        });
    }

    public function down(): void
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            return;
        }

        Schema::table('movimientos', function (Blueprint $table) {
            $table->enum('estado', [
                'pendiente',
                'aprobado',
                'en_transito',
                'recibido_parcial',
                'recibido_completo',
                'rechazado',
                'cancelado',
            ])->default('pendiente')->change();
        });

        Schema::table('movimiento_seguimientos', function (Blueprint $table) {
            $table->enum('estado', [
                'pendiente',
                'aprobado',
                'en_transito',
                'recibido_parcial',
                'recibido_completo',
                'rechazado',
                'cancelado',
            ])->change();
        });
    }
};
