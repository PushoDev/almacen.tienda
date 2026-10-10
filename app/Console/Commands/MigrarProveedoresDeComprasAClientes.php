<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Compras ya no usa la tabla `proveedors`: el proveedor de una compra es un cliente (`compras.cliente_id`).
 * Este comando pasa las compras que todavía apuntan a un proveedor (`compras.proveedor_id`) al cliente que lo
 * reemplaza: reutiliza el cliente que tenga el mismo nombre, crea uno si no existe, o fusiona con uno concreto con
 * `--mapa=PROVEEDOR_ID:CLIENTE_ID` (por ejemplo `--mapa=13:1`).
 *
 * Solo toca `compras` (y crea clientes si hace falta). No mueve saldos: lo que el proveedor tenga en
 * `proveedors.saldo_proveedor` por transferencias o remesas sigue ahí hasta que esas operaciones migren.
 *
 * Con `--dry-run` solo muestra el plan. Todo corre en una transacción y es repetible.
 */
class MigrarProveedoresDeComprasAClientes extends Command
{
    protected $signature = 'compras:migrar-proveedores-a-clientes
        {--dry-run : Muestra el plan sin escribir nada}
        {--mapa=* : Fusiona un proveedor con un cliente existente, formato PROVEEDOR_ID:CLIENTE_ID (ej. 13:1)}';

    protected $description = 'Pasa las compras que apuntan a un proveedor al cliente que lo reemplaza (con --dry-run para ensayar)';

    public function handle(): int
    {
        try {
            $mapa = $this->leerMapa();
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $proveedores = DB::table('proveedors')
            ->whereIn('id', DB::table('compras')->whereNotNull('proveedor_id')->select('proveedor_id'))
            ->orderBy('id')
            ->get();

        if ($proveedores->isEmpty()) {
            $this->info('No hay compras apuntando a proveedores: nada que migrar.');

            return self::SUCCESS;
        }

        $clientes = DB::table('clientes')->get();
        [$plan, $conflictos, $avisos] = $this->armarPlan($proveedores, $clientes, $mapa);

        $this->mostrarPlan($plan, $avisos);

        if ($conflictos !== []) {
            $this->newLine();
            $this->error('Hay conflictos; no se escribió nada:');
            foreach ($conflictos as $conflicto) {
                $this->line("  - {$conflicto}");
            }

            return self::FAILURE;
        }

        if ($this->option('dry-run')) {
            $this->newLine();
            $this->info('Ensayo (--dry-run): no se escribió nada.');

            return self::SUCCESS;
        }

        $totalAntes = (float) DB::table('compras')->sum('total_compra');
        $comprasAntes = DB::table('compras')->count();

        try {
            DB::transaction(function () use ($plan, $totalAntes, $comprasAntes) {
                foreach ($plan as $fila) {
                    $clienteId = $fila['cliente_id'] ?? $this->crearCliente($fila['proveedor']);

                    DB::table('compras')
                        ->where('proveedor_id', $fila['proveedor']->id)
                        ->update(['cliente_id' => $clienteId, 'proveedor_id' => null]);
                }

                if (DB::table('compras')->whereNotNull('proveedor_id')->exists()) {
                    throw new RuntimeException('Quedaron compras apuntando a un proveedor; se revierte todo.');
                }
                if (DB::table('compras')->count() !== $comprasAntes || abs((float) DB::table('compras')->sum('total_compra') - $totalAntes) > 0.01) {
                    throw new RuntimeException('El conteo o el total de compras cambió; se revierte todo.');
                }
            });
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $this->newLine();
        $this->info('Listo. Compras: '.$comprasAntes.' (total '.number_format($totalAntes, 2, '.', ',').') sin cambios; ninguna apunta ya a un proveedor.');

        return self::SUCCESS;
    }

    /**
     * @return array<int, int> proveedor_id => cliente_id
     */
    private function leerMapa(): array
    {
        $mapa = [];

        foreach ((array) $this->option('mapa') as $par) {
            if (! preg_match('/^(\d+):(\d+)$/', (string) $par, $partes)) {
                throw new RuntimeException("--mapa debe tener el formato PROVEEDOR_ID:CLIENTE_ID (recibido: {$par}).");
            }

            [$proveedorId, $clienteId] = [(int) $partes[1], (int) $partes[2]];

            if (! DB::table('proveedors')->where('id', $proveedorId)->exists()) {
                throw new RuntimeException("--mapa: el proveedor {$proveedorId} no existe.");
            }
            if (! DB::table('clientes')->where('id', $clienteId)->exists()) {
                throw new RuntimeException("--mapa: el cliente {$clienteId} no existe.");
            }

            $mapa[$proveedorId] = $clienteId;
        }

        return $mapa;
    }

    /**
     * @param  Collection<int, object>  $proveedores
     * @param  Collection<int, object>  $clientes
     * @param  array<int, int>  $mapa
     * @return array{0: array<int, array<string, mixed>>, 1: array<int, string>, 2: array<int, string>}
     */
    private function armarPlan(Collection $proveedores, Collection $clientes, array $mapa): array
    {
        $plan = [];
        $conflictos = [];
        $avisos = [];

        $porNombre = $clientes->mapWithKeys(fn ($c) => [$this->normalizar($c->nombre_cliente) => $c]);
        $telefonosUsados = $clientes->filter(fn ($c) => filled($c->telefono_cliente))->pluck('telefono_cliente')->map(fn ($t) => trim($t))->flip();

        foreach ($proveedores as $proveedor) {
            $compras = DB::table('compras')->where('proveedor_id', $proveedor->id);
            $resumen = ['compras' => $compras->count(), 'total' => (float) $compras->sum('total_compra')];
            $nombre = $this->normalizar($proveedor->nombre_proveedor);

            // Una compra con proveedor Y cliente a la vez perdería uno de los dos: hay que resolverla a mano.
            $ambos = DB::table('compras')->where('proveedor_id', $proveedor->id)->whereNotNull('cliente_id')->count();
            if ($ambos > 0) {
                $conflictos[] = "Proveedor #{$proveedor->id} \"{$proveedor->nombre_proveedor}\": {$ambos} compra(s) ya tienen también un cliente asignado.";
            }

            if (isset($mapa[$proveedor->id])) {
                $plan[] = ['proveedor' => $proveedor, 'accion' => 'fusionar', 'cliente_id' => $mapa[$proveedor->id]] + $resumen;

                continue;
            }

            if ($porNombre->has($nombre)) {
                $plan[] = ['proveedor' => $proveedor, 'accion' => 'mismo nombre', 'cliente_id' => $porNombre[$nombre]->id] + $resumen;

                continue;
            }

            $telefono = trim((string) ($proveedor->telefono_proveedor ?? ''));
            if ($telefono !== '' && $telefonosUsados->has($telefono)) {
                $conflictos[] = "Proveedor #{$proveedor->id} \"{$proveedor->nombre_proveedor}\": el teléfono {$telefono} ya lo tiene un cliente; use --mapa={$proveedor->id}:ID_CLIENTE.";
            }

            foreach ($clientes as $cliente) {
                $otro = $this->normalizar($cliente->nombre_cliente);
                if ($otro !== $nombre && min(mb_strlen($nombre), mb_strlen($otro)) >= 4 && (str_contains($nombre, $otro) || str_contains($otro, $nombre))) {
                    $avisos[] = "Proveedor #{$proveedor->id} \"{$proveedor->nombre_proveedor}\" se parece al cliente #{$cliente->id} \"{$cliente->nombre_cliente}\": si es la misma persona use --mapa={$proveedor->id}:{$cliente->id}.";
                }
            }

            $plan[] = ['proveedor' => $proveedor, 'accion' => 'crear cliente', 'cliente_id' => null] + $resumen;
        }

        return [$plan, $conflictos, $avisos];
    }

    /**
     * @param  array<int, array<string, mixed>>  $plan
     * @param  array<int, string>  $avisos
     */
    private function mostrarPlan(array $plan, array $avisos): void
    {
        $this->info('Compras a proveedores → clientes');
        $this->table(
            ['Proveedor', 'Nombre', 'Compras', 'Total', 'Acción', 'Cliente'],
            array_map(fn (array $fila) => [
                $fila['proveedor']->id,
                $fila['proveedor']->nombre_proveedor,
                $fila['compras'],
                number_format($fila['total'], 2, '.', ','),
                $fila['accion'],
                $fila['cliente_id'] ?? '(nuevo)',
            ], $plan),
        );

        foreach ($avisos as $aviso) {
            $this->warn($aviso);
        }
    }

    /**
     * El proveedor pasa a ser un cliente nuevo, sin saldo propio (su saldo en `proveedors` no se toca).
     */
    private function crearCliente(object $proveedor): int
    {
        $telefono = trim((string) ($proveedor->telefono_proveedor ?? ''));
        $ahora = now();

        return DB::table('clientes')->insertGetId([
            'nombre_cliente' => $proveedor->nombre_proveedor,
            'tipo_cliente' => 'fisico',
            'deuda_pago_cliente' => 0,
            'telefono_cliente' => $telefono !== '' ? $telefono : null,
            'ciudad_cliente' => $proveedor->localidad_proveedor,
            'created_at' => $proveedor->created_at ?? $ahora,
            'updated_at' => $ahora,
        ]);
    }

    private function normalizar(string $texto): string
    {
        return Str::lower(Str::ascii(trim($texto)));
    }
}
