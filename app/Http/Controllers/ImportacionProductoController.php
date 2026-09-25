<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\AlmacenProducto;
use App\Models\ImportacionBorrador;
use App\Models\ImportacionProducto;
use App\Models\ImportacionProductoFila;
use App\Models\LoteStock;
use App\Models\ProductoCodigo;
use App\Services\CodigoStockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class ImportacionProductoController extends Controller
{
    /**
     * Historial de importaciones de productos (admin y moderador), de la más reciente a la más vieja.
     */
    public function index(Request $request): Response
    {
        $filtros = [
            'almacen_id' => (string) $request->query('almacen_id', ''),
            'estado' => (string) $request->query('estado', ''),
        ];

        $importaciones = ImportacionProducto::with(['user:id,name', 'almacen:id,nombre_almacen'])
            ->when($filtros['almacen_id'] !== '', fn ($query) => $query->where('almacen_id', (int) $filtros['almacen_id']))
            ->when($filtros['estado'] !== '', fn ($query) => $query->where('estado', $filtros['estado']))
            ->latest('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (ImportacionProducto $importacion) => $this->resumen($importacion));

        return Inertia::render('Productos/Importaciones/Index', [
            'importaciones' => $importaciones,
            'filtros' => $filtros,
            'almacenes' => Almacen::orderBy('nombre_almacen')->get(['id', 'nombre_almacen']),
            // Borradores del propio usuario que quedaron a medias: se retoman desde aquí.
            'borradores' => ImportacionBorrador::with('almacen:id,nombre_almacen')
                ->where('user_id', $request->user()->id)
                ->latest('id')
                ->get()
                ->map(fn (ImportacionBorrador $borrador) => [
                    'id' => $borrador->id,
                    'nombre_archivo' => $borrador->nombre_archivo,
                    'almacen' => $borrador->almacen?->nombre_almacen,
                    'filas' => count($borrador->filas),
                    'fecha' => $borrador->updated_at->toIso8601String(),
                ]),
        ]);
    }

    /**
     * Detalle de una importación: contadores y todas sus filas (paginadas, filtrables por resultado),
     * para que el usuario revise qué entró antes de decidir si la deshace.
     */
    public function show(Request $request, ImportacionProducto $importacion): Response
    {
        $importacion->load(['user:id,name', 'almacen:id,nombre_almacen', 'revertidaPor:id,name']);
        $resultado = (string) $request->query('resultado', '');

        $filas = $importacion->filas()
            ->when($resultado !== '', fn ($query) => $query->where('resultado', $resultado))
            ->orderBy('fila')
            ->paginate(50)
            ->withQueryString()
            ->through(fn ($fila) => [
                'id' => $fila->id,
                'fila' => $fila->fila,
                'nombre_producto' => $fila->nombre_producto,
                'producto_id' => $fila->producto_id,
                'producto_nuevo' => $fila->producto_nuevo,
                'cantidad' => $fila->cantidad,
                'precio_compra' => $fila->precio_compra,
                'resultado' => $fila->resultado,
                'motivo' => $fila->motivo,
                'lote_codigo' => $fila->lote_codigo,
            ]);

        return Inertia::render('Productos/Importaciones/Show', [
            'importacion' => $this->resumen($importacion) + [
                'revertida_por' => $importacion->revertidaPor?->name,
                'revertida_at' => $importacion->revertida_at?->toIso8601String(),
                'motivo_reversion' => $importacion->motivo_reversion,
                'mensaje_error' => $importacion->mensaje_error,
            ],
            'filas' => $filas,
            'filtros' => ['resultado' => $resultado],
            'puedeRevertir' => $request->user()->role === 'admin' && $this->esRevertible($importacion->estado),
        ]);
    }

    /**
     * Qué pasaría al deshacer esta importación, sin tocar nada: cuántos lotes y unidades se
     * quitarían y, si algo lo impide, la lista de bloqueos. El diálogo de "Deshacer" lo muestra
     * antes de pedir el motivo y la contraseña.
     */
    public function vistaPreviaReversion(ImportacionProducto $importacion): JsonResponse
    {
        if (! $this->esRevertible($importacion->estado)) {
            return response()->json([
                'revertible' => false,
                'lotes' => 0,
                'unidades' => 0,
                'bloqueos' => ['Solo se puede deshacer una importación completada.'],
            ]);
        }

        [$filas, $lotes, $bloqueos] = $this->analizarReversion($importacion, false);

        return response()->json([
            'revertible' => $bloqueos->isEmpty(),
            'lotes' => $filas->count(),
            'unidades' => (int) $lotes->sum('cantidad'),
            'bloqueos' => $bloqueos->values()->all(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function resumen(ImportacionProducto $importacion): array
    {
        return [
            'id' => $importacion->id,
            'fecha' => $importacion->created_at->toIso8601String(),
            'usuario' => $importacion->user?->name,
            'almacen' => $importacion->almacen?->nombre_almacen,
            'nombre_archivo' => $importacion->nombre_archivo,
            'estado' => $importacion->estado,
            'filas_procesadas' => $importacion->filas_procesadas,
            'productos_creados' => $importacion->productos_creados,
            'productos_actualizados' => $importacion->productos_actualizados,
            'productos_sin_stock' => $importacion->productos_sin_stock,
            'filas_omitidas' => $importacion->filas_omitidas,
            'lotes_creados' => $importacion->lotes_creados,
            'unidades_importadas' => $importacion->unidades_importadas,
        ];
    }

    /**
     * Deshace una importación completa: quita el stock, el código y el lote que creó cada fila.
     * Todo o nada — si algo de lo importado ya se movió (vendido, trasladado, fusionado o
     * editado a mano) no se revierte NADA y se devuelve la lista de lo que lo impide. Las
     * fichas y categorías que el import haya creado se conservan (pueden estar referenciadas).
     */
    public function revertir(Request $request, ImportacionProducto $importacion): RedirectResponse
    {
        $validated = $request->validate([
            'motivo_reversion' => 'required|string|max:500',
            'password_confirmacion' => 'required|string',
        ], [
            'motivo_reversion.required' => 'Debes indicar el motivo para deshacer la importación',
            'password_confirmacion.required' => 'Debes confirmar con tu contraseña',
        ]);

        if (! Hash::check($validated['password_confirmacion'], $request->user()->password)) {
            return back()->withErrors(['password_confirmacion' => 'Contraseña incorrecta. La importación no fue revertida.']);
        }

        if (! $this->esRevertible($importacion->estado)) {
            return back()->withErrors(['revertir' => 'Solo se puede deshacer una importación completada.']);
        }

        try {
            $bloqueos = DB::transaction(function () use ($importacion, $validated, $request) {
                // Con el registro bloqueado se vuelve a mirar el estado: dos peticiones a la vez
                // (doble clic) pasaron la revisión de arriba, pero solo la primera debe revertir.
                $estadoActual = ImportacionProducto::whereKey($importacion->id)->lockForUpdate()->value('estado');
                if (! $this->esRevertible($estadoActual)) {
                    throw new \DomainException('Esta importación ya fue revertida por otra solicitud.');
                }

                [$filas, $lotes, $bloqueos] = $this->analizarReversion($importacion, true);
                if ($bloqueos->isNotEmpty()) {
                    return $bloqueos;
                }

                foreach ($filas as $fila) {
                    $lote = $lotes[$fila->lote_id];

                    AlmacenProducto::where('almacen_id', $importacion->almacen_id)
                        ->where('producto_id', $lote->producto_id)
                        ->decrement('cantidad', $lote->cantidad);

                    if ($fila->producto_codigo_id) {
                        $codigo = ProductoCodigo::lockForUpdate()->find($fila->producto_codigo_id);
                        if ($codigo) {
                            $codigo->update(['cantidad' => max(0, $codigo->cantidad - $lote->cantidad)]);
                            app(CodigoStockService::class)->descontar((int) $importacion->almacen_id, $codigo->id, (int) $lote->cantidad);
                        }
                    }

                    $lote->delete();
                }

                $importacion->update([
                    'estado' => 'revertida',
                    'revertida_por' => $request->user()->id,
                    'revertida_at' => now(),
                    'motivo_reversion' => $validated['motivo_reversion'],
                ]);

                return collect();
            });
        } catch (\DomainException $e) {
            return back()->withErrors(['revertir' => $e->getMessage()]);
        }

        if ($bloqueos->isNotEmpty()) {
            return back()
                ->withErrors(['revertir' => 'No se puede deshacer esta importación: parte de lo importado ya se movió o se modificó.'])
                ->with('bloqueos_reversion', $bloqueos->values()->all());
        }

        return back()->with('success', "Importación #{$importacion->id} deshecha: {$importacion->lotes_creados} lotes eliminados y {$importacion->unidades_importadas} unidades descontadas.");
    }

    /**
     * Junta lo que la reversión tocaría y los motivos que la impiden. Con `$bloquear` (dentro de
     * la transacción de revertir) bloquea las filas leídas; la vista previa las lee sin bloquear.
     *
     * @return array{0: Collection<int, ImportacionProductoFila>, 1: Collection<int, LoteStock>, 2: Collection<int, string>}
     */
    private function analizarReversion(ImportacionProducto $importacion, bool $bloquear): array
    {
        $filas = $importacion->filas()->where('resultado', 'importada')->get();
        $consultaLotes = LoteStock::whereIn('id', $filas->pluck('lote_id')->filter());
        $lotes = ($bloquear ? $consultaLotes->lockForUpdate() : $consultaLotes)->get()->keyBy('id');

        return [$filas, $lotes, $this->buscarBloqueos($importacion, $filas, $lotes, $bloquear)];
    }

    private function esRevertible(?string $estado): bool
    {
        return in_array($estado, ['completada', 'con_omitidas'], true);
    }

    /**
     * Motivos por los que la importación ya no se puede deshacer de forma segura.
     *
     * @param  Collection<int, ImportacionProductoFila>  $filas
     * @param  Collection<int, LoteStock>  $lotes  indexados por id
     * @return Collection<int, string>
     */
    private function buscarBloqueos(ImportacionProducto $importacion, Collection $filas, Collection $lotes, bool $bloquear): Collection
    {
        $bloqueos = collect();

        foreach ($filas as $fila) {
            $lote = $fila->lote_id ? $lotes->get($fila->lote_id) : null;
            $etiqueta = "Fila {$fila->fila} ({$fila->nombre_producto})";

            if (! $lote) {
                $bloqueos->push("{$etiqueta}: el lote {$fila->lote_codigo} ya no existe.");
            } elseif ($lote->fusionado_en_lote_id !== null) {
                $bloqueos->push("{$etiqueta}: el lote {$lote->codigo} se fusionó con otro.");
            } elseif ($lote->cantidad_disponible !== $lote->cantidad) {
                $usadas = $lote->cantidad - $lote->cantidad_disponible;
                $bloqueos->push("{$etiqueta}: del lote {$lote->codigo} ya se usaron {$usadas} de {$lote->cantidad} unidades (ventas o traslados).");
            }
        }

        $importadoPorProducto = $lotes->groupBy('producto_id')->map(fn (Collection $delProducto) => $delProducto->sum('cantidad'));
        foreach ($importadoPorProducto as $productoId => $importado) {
            $consultaStock = AlmacenProducto::where('almacen_id', $importacion->almacen_id)->where('producto_id', $productoId);
            $stockActual = (int) ($bloquear ? $consultaStock->lockForUpdate() : $consultaStock)->value('cantidad');

            if ($stockActual < $importado) {
                $nombre = $filas->firstWhere('producto_id', $productoId)?->nombre_producto;
                $bloqueos->push("{$nombre}: el stock actual del almacén ({$stockActual}) es menor que lo importado ({$importado}).");
            }
        }

        return $bloqueos;
    }
}
