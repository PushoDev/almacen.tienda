<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function indexExists(string $table, string $index): bool
    {
        return (bool) DB::selectOne('
            SELECT 1 FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ? AND INDEX_NAME = ?
            LIMIT 1
        ', [$table, $index]);
    }

    private function fkExists(string $table, string $column): bool
    {
        return (bool) DB::selectOne('
            SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ? AND COLUMN_NAME = ?
              AND REFERENCED_TABLE_NAME IS NOT NULL
            LIMIT 1
        ', [$table, $column]);
    }

    private function pkColumns(string $table): array
    {
        $rows = DB::select("
            SELECT COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ? AND CONSTRAINT_NAME = 'PRIMARY'
            ORDER BY ORDINAL_POSITION
        ", [$table]);

        return array_column($rows, 'COLUMN_NAME');
    }

    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        // ── 1. Agregar puesto_por_user_id si no existe ──────────────────────────
        if (! Schema::hasColumn('producto_vendedors', 'puesto_por_user_id')) {
            Schema::table('producto_vendedors', function (Blueprint $table) {
                $table->unsignedBigInteger('puesto_por_user_id')->nullable()->after('comision');
            });
        }

        // ── 2-4. Sólo si user_id todavía existe ─────────────────────────────────
        if (Schema::hasColumn('producto_vendedors', 'user_id')) {

            // 2. Copiar user_id → puesto_por_user_id
            DB::statement('UPDATE producto_vendedors SET puesto_por_user_id = user_id WHERE puesto_por_user_id IS NULL');

            // 3. Eliminar filas duplicadas — conservar la de updated_at más reciente
            DB::statement('
                DELETE pv FROM producto_vendedors pv
                INNER JOIN (
                    SELECT producto_id, almacen_id, MAX(updated_at) AS max_upd
                    FROM producto_vendedors
                    GROUP BY producto_id, almacen_id
                ) latest ON pv.producto_id = latest.producto_id
                          AND pv.almacen_id = latest.almacen_id
                WHERE pv.updated_at < latest.max_upd
            ');

            // 4. Empates: conservar el de menor user_id (admin primero)
            DB::statement('
                DELETE pv FROM producto_vendedors pv
                INNER JOIN (
                    SELECT producto_id, almacen_id, MIN(user_id) AS keep_uid
                    FROM producto_vendedors
                    GROUP BY producto_id, almacen_id
                    HAVING COUNT(*) > 1
                ) dups ON pv.producto_id = dups.producto_id
                       AND pv.almacen_id = dups.almacen_id
                       AND pv.user_id != dups.keep_uid
            ');

            // 5. Eliminar FK sobre user_id si existe
            $fks = DB::select("
                SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'producto_vendedors'
                  AND COLUMN_NAME = 'user_id'
                  AND REFERENCED_TABLE_NAME IS NOT NULL
            ");
            foreach ($fks as $fk) {
                DB::statement("ALTER TABLE producto_vendedors DROP FOREIGN KEY `{$fk->CONSTRAINT_NAME}`");
            }

            // 6. Eliminar índices que contengan user_id (excepto el PK)
            $indexes = DB::select("
                SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'producto_vendedors'
                  AND INDEX_NAME != 'PRIMARY'
                  AND COLUMN_NAME = 'user_id'
            ");
            foreach ($indexes as $idx) {
                DB::statement("ALTER TABLE producto_vendedors DROP INDEX `{$idx->INDEX_NAME}`");
            }

            // 7. Crear índice temporal en producto_id antes de eliminar la PK
            //    (MySQL exige que toda FK esté respaldada por un índice)
            if (! $this->indexExists('producto_vendedors', 'tmp_producto_id_idx')) {
                DB::statement('CREATE INDEX tmp_producto_id_idx ON producto_vendedors (producto_id)');
            }

            // 8. Eliminar la PK compuesta (si aún existe)
            if (! empty($this->pkColumns('producto_vendedors'))) {
                DB::statement('ALTER TABLE producto_vendedors DROP PRIMARY KEY');
            }

            // 9. Eliminar columnas innecesarias
            Schema::table('producto_vendedors', function (Blueprint $table) {
                $cols = [];
                foreach (['user_id', 'precio_admin', 'ganancia_admin'] as $col) {
                    if (Schema::hasColumn('producto_vendedors', $col)) {
                        $cols[] = $col;
                    }
                }
                if (! empty($cols)) {
                    $table->dropColumn($cols);
                }
            });
        }

        // ── 10. Nueva PK (producto_id, almacen_id) ──────────────────────────────
        if ($this->pkColumns('producto_vendedors') !== ['producto_id', 'almacen_id']) {
            Schema::table('producto_vendedors', function (Blueprint $table) {
                $table->primary(['producto_id', 'almacen_id']);
            });
        }

        // ── 11. Eliminar índice temporal AHORA que la nueva PK cubre producto_id ─
        if ($this->indexExists('producto_vendedors', 'tmp_producto_id_idx')) {
            DB::statement('DROP INDEX tmp_producto_id_idx ON producto_vendedors');
        }

        // ── 12. FK para puesto_por_user_id si no existe ─────────────────────────
        if (! $this->fkExists('producto_vendedors', 'puesto_por_user_id')) {
            Schema::table('producto_vendedors', function (Blueprint $table) {
                $table->foreign('puesto_por_user_id')->references('id')->on('users')->nullOnDelete();
            });
        }

        // ── 13. Índice auxiliar si no existe ────────────────────────────────────
        if (! $this->indexExists('producto_vendedors', 'producto_vendedors_almacen_id_precio_venta_index')) {
            Schema::table('producto_vendedors', function (Blueprint $table) {
                $table->index(['almacen_id', 'precio_venta']);
            });
        }
    }

    public function down(): void
    {
        Schema::table('producto_vendedors', function (Blueprint $table) {
            $table->dropForeign(['puesto_por_user_id']);
            $table->dropIndex(['almacen_id', 'precio_venta']);
            $table->dropPrimary();
        });

        Schema::table('producto_vendedors', function (Blueprint $table) {
            $table->dropColumn('puesto_por_user_id');
            $table->unsignedBigInteger('user_id')->default(1)->after('producto_id');
            $table->decimal('precio_admin', 10, 2)->nullable();
            $table->decimal('ganancia_admin', 10, 2)->nullable();
        });

        Schema::table('producto_vendedors', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->primary(['producto_id', 'user_id', 'almacen_id']);
            $table->index(['user_id', 'almacen_id', 'precio_venta']);
        });
    }
};
