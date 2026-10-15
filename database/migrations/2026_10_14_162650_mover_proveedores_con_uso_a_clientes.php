<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Pasa a clientes los proveedores que todavía tienen compras o saldo (paso de "quitar los proveedores poco a poco").
 *
 * - Cada proveedor con compras (`compras.proveedor_id`) o con saldo distinto de cero se une al cliente que tenga su
 *   mismo nombre (sin el sufijo "PROVEEDOR": "ALBERTO PROVEEDOR" → "ALBERTO") o crea un cliente nuevo.
 * - Sus compras pasan a `compras.cliente_id` y `proveedor_id` queda en null.
 * - Su saldo se suma a `clientes.deuda_pago_cliente` con el mismo signo (negativo = se le debe), porque Compras ya
 *   resta ahí. El saldo original de `proveedors` NO se toca: sigue como historial y ningún total lo suma.
 * - Los proveedores sin compras ni saldo no se tocan, y el historial (movimientos, remesas) tampoco.
 *
 * Todo corre en una transacción y se verifica al final (mismo número y total de compras, saldos movidos = saldo
 * sumado a clientes); si algo no cuadra se revierte entero. No es reversible: `down()` no hace nada.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('proveedors') || ! Schema::hasTable('clientes') || ! Schema::hasColumn('compras', 'cliente_id')) {
            return;
        }

        DB::transaction(function () {
            $comprasAntes = DB::table('compras')->count();
            $totalComprasAntes = (float) DB::table('compras')->sum('total_compra');
            $deudaClientesAntes = (float) DB::table('clientes')->sum('deuda_pago_cliente');

            $conCompras = DB::table('compras')->whereNotNull('proveedor_id')->whereNull('cliente_id')->pluck('proveedor_id')->unique();

            $proveedores = DB::table('proveedors')
                ->where(fn ($q) => $q->whereIn('id', $conCompras)->orWhere(fn ($q) => $q->whereNotNull('saldo_proveedor')->where('saldo_proveedor', '!=', 0)))
                ->orderBy('id')
                ->get();

            $saldoMovido = 0.0;

            foreach ($proveedores as $proveedor) {
                $cliente = $this->clientePorNombre($proveedor->nombre_proveedor) ?? $this->crearCliente($proveedor);
                $saldo = round((float) $proveedor->saldo_proveedor, 8);

                if ($saldo !== 0.0) {
                    DB::table('clientes')->where('id', $cliente->id)->update([
                        'deuda_pago_cliente' => DB::raw('COALESCE(deuda_pago_cliente, 0) + '.$saldo),
                        'updated_at' => now(),
                    ]);
                    $saldoMovido += $saldo;
                }

                DB::table('compras')
                    ->where('proveedor_id', $proveedor->id)
                    ->whereNull('cliente_id')
                    ->update(['cliente_id' => $cliente->id, 'proveedor_id' => null]);
            }

            $this->verificar($proveedores->pluck('id'), $comprasAntes, $totalComprasAntes);

            if (abs((float) DB::table('clientes')->sum('deuda_pago_cliente') - ($deudaClientesAntes + $saldoMovido)) > 0.01) {
                throw new RuntimeException('El saldo sumado a clientes no coincide con el movido; se revierte todo.');
            }
        });
    }

    public function down(): void
    {
        // Migración de datos sin vuelta atrás: restaure la copia de seguridad si hace falta.
    }

    private function verificar($proveedorIds, int $comprasAntes, float $totalComprasAntes): void
    {
        if (DB::table('compras')->whereIn('proveedor_id', $proveedorIds)->whereNull('cliente_id')->exists()) {
            throw new RuntimeException('Quedaron compras apuntando a un proveedor sin cliente; se revierte todo.');
        }

        if (DB::table('compras')->count() !== $comprasAntes
            || abs((float) DB::table('compras')->sum('total_compra') - $totalComprasAntes) > 0.01) {
            throw new RuntimeException('El conteo o el total de compras cambió; se revierte todo.');
        }
    }

    private function clientePorNombre(string $nombre): ?object
    {
        $buscado = $this->normalizar($nombre);

        return DB::table('clientes')->get()->first(fn ($c) => $this->normalizar($c->nombre_cliente) === $buscado);
    }

    private function crearCliente(object $proveedor): object
    {
        $telefono = trim((string) ($proveedor->telefono_proveedor ?? ''));
        $telefonoLibre = $telefono !== '' && ! DB::table('clientes')->where('telefono_cliente', $telefono)->exists();

        $id = DB::table('clientes')->insertGetId([
            'nombre_cliente' => $proveedor->nombre_proveedor,
            'tipo_cliente' => 'fisico',
            'deuda_pago_cliente' => 0,
            'telefono_cliente' => $telefonoLibre ? $telefono : null,
            'ciudad_cliente' => $proveedor->localidad_proveedor,
            'created_at' => $proveedor->created_at ?? now(),
            'updated_at' => now(),
        ]);

        return DB::table('clientes')->find($id);
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
