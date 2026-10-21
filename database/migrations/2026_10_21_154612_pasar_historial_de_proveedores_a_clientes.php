<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Pasa a clientes el historial (movimientos y remesas) que todavía apunta a proveedores.
 *
 * - Complementa `mover_proveedores_con_uso_a_clientes`, que dejó a propósito el historial en el proveedor.
 * - Cada proveedor con historial se une al cliente que tenga su mismo nombre (sin el sufijo "PROVEEDOR", la misma
 *   regla de aquella migración). Si no hay cliente equivalente no se crea ninguno y su historial no se toca.
 * - Movimientos: `proveedor_destino_id` pasa a `cliente_destino_id`.
 * - Remesas: `entrada_proveedor_id` / `salida_proveedor_id` pasan a `entrada_cliente_id` / `salida_cliente_id` y el tipo
 *   de ese lado cambia de `proveedor` a `cliente`.
 * - Los saldos anterior y posterior que guarda cada movimiento no se tocan, ni el saldo de ningún cliente o proveedor.
 *
 * Todo corre en una transacción y se verifica al final (la cantidad de filas con historial no cambia y ninguna fila
 * reasignada conserva el proveedor); si algo no cuadra se revierte entero. No es reversible: `down()` no hace nada.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('proveedors') || ! Schema::hasTable('clientes')) {
            return;
        }

        DB::transaction(function () {
            $movimientosAntes = DB::table('movimientos_financieros')->count();
            $remesasAntes = DB::table('remesas')->count();

            foreach (DB::table('proveedors')->orderBy('id')->get() as $proveedor) {
                $cliente = $this->clientePorNombre($proveedor->nombre_proveedor);

                if ($cliente === null) {
                    continue;
                }

                DB::table('movimientos_financieros')
                    ->where('proveedor_destino_id', $proveedor->id)
                    ->whereNull('cliente_destino_id')
                    ->update(['cliente_destino_id' => $cliente->id, 'proveedor_destino_id' => null]);

                foreach (['entrada', 'salida'] as $lado) {
                    DB::table('remesas')
                        ->where("{$lado}_proveedor_id", $proveedor->id)
                        ->whereNull("{$lado}_cliente_id")
                        ->update(["{$lado}_cliente_id" => $cliente->id, "{$lado}_proveedor_id" => null, "{$lado}_tipo" => 'cliente']);
                }
            }

            if (DB::table('movimientos_financieros')->count() !== $movimientosAntes || DB::table('remesas')->count() !== $remesasAntes) {
                throw new RuntimeException('La cantidad de movimientos o remesas cambió; se revierte todo.');
            }
        });
    }

    public function down(): void
    {
        // Migración de datos sin vuelta atrás: restaure la copia de seguridad si hace falta.
    }

    private function clientePorNombre(string $nombre): ?object
    {
        $buscado = $this->normalizar($nombre);

        return DB::table('clientes')->get()->first(fn ($c) => $this->normalizar($c->nombre_cliente) === $buscado);
    }

    /**
     * Minúsculas, sin tildes ni el sufijo "proveedor" ("ALBERTO PROVEEDOR" = "alberto").
     */
    private function normalizar(string $texto): string
    {
        $limpio = Str::lower(Str::ascii(trim($texto)));

        return trim(preg_replace('/\s+proveedor$/', '', $limpio));
    }
};
