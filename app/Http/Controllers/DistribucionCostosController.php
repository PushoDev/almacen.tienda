<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\Compra;
use App\Models\CostDistribution;
use App\Models\CostDistributionCompra;
use App\Models\CostDistributionCuenta;
use App\Models\CostDistributionItem;
use App\Models\CostoHistorial;
use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\MovimientoFinanciero;
use App\Models\Producto;
use App\Models\Proveedor;
use App\Http\Requests\DistribuirCostosManualRequest;
use App\Http\Controllers\ProductoVendedorController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class DistribucionCostosController extends Controller
{
    /**
     * Vista principal de Distribución de Costos: listado de compras para prorratear.
     */
    public function index(Request $request)
    {
        $buscar = trim((string) $request->input('buscar', ''));
        $proveedorId = $request->input('proveedor_id', '');
        $almacenId = $request->input('almacen_id', '');
        $fecha = $request->input('fecha', '');

        $compras = Compra::with(['productos', 'proveedor', 'cliente'])
            ->when($buscar !== '', function ($query) use ($buscar) {
                $query->where(function ($sub) use ($buscar) {
                    $sub->where('id', 'like', "%{$buscar}%")
                        ->orWhereHas('proveedor', fn ($q) => $q->where('nombre_proveedor', 'like', "%{$buscar}%"))
                        ->orWhereHas('cliente', fn ($q) => $q->where('nombre_cliente', 'like', "%{$buscar}%"));
                });
            })
            ->when($proveedorId !== '', fn ($query) => $query->where('proveedor_id', $proveedorId))
            ->when($almacenId !== '', fn ($query) => $query->whereHas('productos', fn ($q) => $q->wherePivot('almacen_id', $almacenId)))
            ->when($fecha !== '', fn ($query) => $query->whereDate('fecha_compra', $fecha))
            ->orderByDesc('fecha_compra')
            ->paginate(10)
            ->withQueryString();

        // Nombres de almacén — resueltos en un solo query para todas las compras de esta
        // página, en vez de uno por compra (un almacén_id vive en el pivot compra_producto,
        // no hay relación directa Compra→Almacen).
        $almacenIds = $compras->getCollection()
            ->flatMap(fn ($compra) => $compra->productos->pluck('pivot.almacen_id'))
            ->filter()
            ->unique();
        $nombresAlmacen = Almacen::whereIn('id', $almacenIds)->pluck('nombre_almacen', 'id');

        // Compras que ya tienen al menos una distribución de costo registrada — determina si el
        // listado ofrece "Distribuir" o también "Detalles" para esa fila. Se consulta el pivote
        // (una distribución puede cubrir varias compras a la vez, ver mostrarFormularioDistribucion).
        $comprasConDistribucion = CostDistributionCompra::whereIn('compra_id', $compras->getCollection()->pluck('id'))
            ->pluck('compra_id')
            ->unique();

        $compras->through(function ($compra) use ($nombresAlmacen, $comprasConDistribucion) {
            $compra->tiene_distribucion = $comprasConDistribucion->contains($compra->id);
            $compra->origen = $compra->proveedor->nombre_proveedor ?? $compra->cliente->nombre_cliente ?? null;
            $compra->almacenes = $compra->productos
                ->pluck('pivot.almacen_id')
                ->filter()
                ->unique()
                ->map(fn ($id) => $nombresAlmacen[$id] ?? null)
                ->filter()
                ->values();
            $compra->setRelation('productos', $this->agruparProductosPorLinea($compra->productos));
            return $compra;
        });

        // Vendedor solo ve sus cuentas asignadas personales; el resto de roles ve todas.
        if (auth()->user()->role === 'vendedor') {
            $cuentas = auth()->user()->cuentas()->where('tipo_titular', 'personal')->with('moneda')->get();
        } else {
            $cuentas = Cuenta::with('moneda')->get();
        }

        $monedaCUP = Moneda::where('codigo_moneda', 'CUP')
            ->where('estado', true)
            ->orderBy('tasa_cambio', 'desc')
            ->first();

        return Inertia::render('DistribucionCostos/Index', [
            'compras' => $compras,
            'cuentas' => $cuentas,
            'tasaCambioActual' => $monedaCUP ? $monedaCUP->tasa_cambio : 0,
            // Solo proveedores/almacenes que realmente participan en alguna compra — no la lista
            // completa del sistema, para no ofrecer filtros que siempre den cero resultados.
            'proveedores' => Proveedor::whereHas('compras')->orderBy('nombre_proveedor')->get(['id', 'nombre_proveedor']),
            'almacenes' => Almacen::whereIn('id', DB::table('compra_producto')->whereNotNull('almacen_id')->distinct()->pluck('almacen_id'))
                ->orderBy('nombre_almacen')
                ->get(['id', 'nombre_almacen']),
            'filtros' => [
                'buscar' => $buscar,
                'proveedor_id' => $proveedorId,
                'almacen_id' => $almacenId,
                'fecha' => $fecha,
            ],
        ]);
    }

    /**
     * Muestra el formulario de distribución manual para una o varias compras ("lote"). Las
     * compras llegan por query string (?compras[]=10&compras[]=11), no por segmento de ruta —
     * un botón "Distribuir" de una sola fila manda un array de un elemento.
     */
    public function mostrarFormularioDistribucion(Request $request)
    {
        $compraIds = array_filter((array) $request->input('compras', []));

        if (empty($compraIds)) {
            abort(404);
        }

        $compras = Compra::with(['productos' => fn ($query) => $query->withPivot('cantidad', 'precio')])
            ->whereIn('id', $compraIds)
            ->get();

        if ($compras->isEmpty()) {
            abort(404);
        }

        // Productos combinados de todas las compras del lote, agrupados por producto (mismo
        // producto en dos compras del lote suma cantidad, no aparece dos veces).
        $productos = $this->agruparProductosPorLinea($compras->flatMap->productos);

        // Cuentas CUP o USD — una operación puede financiarse mezclando ambas monedas.
        if (auth()->user()->role === 'vendedor') {
            $cuentas = auth()->user()->cuentas()
                ->whereHas('moneda', function ($query) {
                    $query->whereIn('codigo_moneda', ['CUP', 'USD'])->where('estado', true);
                })
                ->with('moneda')
                ->get();
        } else {
            $cuentas = Cuenta::whereHas('moneda', function ($query) {
                $query->whereIn('codigo_moneda', ['CUP', 'USD'])->where('estado', true);
            })->with('moneda')->get();
        }

        $monedaCUP = Moneda::where('codigo_moneda', 'CUP')
            ->where('estado', true)
            ->orderBy('tasa_cambio', 'desc')
            ->first();

        return Inertia::render('DistribucionCostos/CambiarCostoManual', [
            'compraIds' => $compras->pluck('id')->sort()->values(),
            'productos' => $productos,
            'cuentas' => $cuentas,
            'tasaCambioActual' => $monedaCUP ? $monedaCUP->tasa_cambio : 0,
        ]);
    }

    /**
     * Procesa la distribución manual de costos. Acepta una o varias compras ("lote") y una o
     * varias cuentas financiando la operación (cada una con su propio monto en CUP) — tanto la
     * compra única como la cuenta única quedaron obsoletas.
     */
    public function distribuirCostosManual(DistribuirCostosManualRequest $request)
    {
        $validatedData = $request->validated();

        DB::beginTransaction();

        try {
            $compras = Compra::with('productos')->whereIn('id', $validatedData['purchase_ids'])->get();

            if ($compras->isEmpty()) {
                DB::rollBack();
                return redirect()->back()->with('error', 'No se encontraron las compras seleccionadas.');
            }

            $compraIds = $compras->pluck('id')->sort()->implode(', ');
            $productosCompras = $compras->flatMap->productos;

            // Tasa de cambio de la operación — aplica solo a las cuentas CUP del lote; las
            // cuentas USD no la necesitan. Por defecto, la tasa CUP general del sistema.
            $monedaCUP = Moneda::where('codigo_moneda', 'CUP')->where('estado', true)->orderBy('tasa_cambio', 'desc')->first();
            $tasa_cambio = $validatedData['exchange_rate'] ?? ($monedaCUP->tasa_cambio ?? null);

            if (!$tasa_cambio || $tasa_cambio == 0) {
                DB::rollBack();
                return redirect()->back()->with('error', 'La tasa de cambio no está definida o es cero.');
            }

            // Cada cuenta financia en su propia moneda (CUP o USD, mezcladas está permitido).
            // monto_usd es el equivalente en USD de lo que esa cuenta aporta — CUP se convierte
            // con la tasa de la operación, USD entra directo, sin conversión.
            $cuentasSeleccionadas = collect($validatedData['cuentas'])->map(function ($item) use ($tasa_cambio) {
                $cuenta = Cuenta::with('moneda')->findOrFail($item['account_id']);
                $monto = (float) $item['monto'];
                $esCup = $cuenta->moneda->codigo_moneda === 'CUP';

                return [
                    'cuenta' => $cuenta,
                    'monto' => $monto,
                    'monto_usd' => $esCup ? $monto / $tasa_cambio : $monto,
                ];
            });

            $cuentasAsignadas = auth()->user()->role === 'vendedor'
                ? auth()->user()->cuentas()->pluck('id')->toArray()
                : null;

            foreach ($cuentasSeleccionadas as $item) {
                $cuenta = $item['cuenta'];

                if ($cuentasAsignadas !== null && !in_array($cuenta->id, $cuentasAsignadas)) {
                    DB::rollBack();
                    return redirect()->back()->with('error', "No tiene permiso para operar con la cuenta {$cuenta->nombre_cuenta}.");
                }

                if ($cuenta->tipo_cuenta === 'deudas') {
                    DB::rollBack();
                    return redirect()->back()->with('error', 'No se puede usar una cuenta de deudas para esta operación.');
                }

                if (!in_array($cuenta->moneda->codigo_moneda, ['CUP', 'USD'])) {
                    DB::rollBack();
                    return redirect()->back()->with('error', 'Solo se pueden usar cuentas en moneda CUP o USD para esta operación.');
                }

                if ($cuenta->saldo_cuenta < $item['monto']) {
                    DB::rollBack();
                    return redirect()->back()->with('error', "El saldo de la cuenta {$cuenta->nombre_cuenta} es insuficiente.");
                }
            }

            $totalUsdDisponible = $cuentasSeleccionadas->sum('monto_usd');
            // Legado: solo la parte que vino de cuentas CUP, informativo — la fuente real del
            // desglose por cuenta/moneda es cost_distribution_cuentas.
            $totalCupLegado = $cuentasSeleccionadas->filter(fn ($i) => $i['cuenta']->moneda->codigo_moneda === 'CUP')->sum('monto');

            $distribution = CostDistribution::create([
                // Campos legado (una sola compra/cuenta/monto) — se rellenan con la primera
                // compra/cuenta y el total combinado por compatibilidad; la fuente real del
                // desglose es cost_distribution_compras/cost_distribution_cuentas.
                'purchase_id' => $compras->first()->id,
                'account_id' => $cuentasSeleccionadas->first()['cuenta']->id,
                'amount_cup' => $totalCupLegado,
                'amount_usd' => $totalUsdDisponible,
                'exchange_rate' => $tasa_cambio,
                'details' => $validatedData['details'],
                'remaining_amount_usd' => 0,
                'remaining_amount_cup' => 0,
            ]);

            foreach ($compras as $compraDelLote) {
                CostDistributionCompra::create([
                    'cost_distribution_id' => $distribution->id,
                    'compra_id' => $compraDelLote->id,
                ]);
            }

            foreach ($cuentasSeleccionadas as $item) {
                CostDistributionCuenta::create([
                    'cost_distribution_id' => $distribution->id,
                    'cuenta_id' => $item['cuenta']->id,
                    'monto' => $item['monto'],
                ]);
            }

            $totalUsdDistribuidoProductos = 0;

            foreach ($validatedData['productos'] as $productoData) {
                if ((float) $productoData['amount_usd'] > 0) {
                    $producto = Producto::findOrFail($productoData['product_id']);
                    $cantidad = $productosCompras->where('id', $producto->id)->sum(fn ($p) => $p->pivot->cantidad);
                    $costoActual = $producto->precio_compra_producto;
                    $incrementoUnitario = (float) $productoData['amount_usd'];
                    $nuevoCosto = $costoActual + $incrementoUnitario;

                    CostDistributionItem::create([
                        'cost_distribution_id' => $distribution->id,
                        'product_id' => $producto->id,
                        'quantity' => $cantidad,
                        'distributed_amount_usd' => $productoData['amount_usd'],
                        'old_cost_usd' => $costoActual,
                        'new_cost_usd' => $nuevoCosto,
                    ]);

                    CostoHistorial::create([
                        'product_id' => $producto->id,
                        'old_cost_usd' => $costoActual,
                        'new_cost_usd' => $nuevoCosto,
                        'cost_distribution_id' => $distribution->id,
                        'comentario' => 'Ajuste por distribución manual de costos.',
                    ]);

                    $producto->update(['precio_compra_producto' => $nuevoCosto]);

                    app(ProductoVendedorController::class)
                        ->actualizarGananciaPorCambioCosto($producto->id);

                    $totalUsdDistribuidoProductos += (float) $productoData['amount_usd'];
                }
            }

            $totalUsdSobrante = $totalUsdDisponible - $totalUsdDistribuidoProductos;
            $totalCupSobrante = $totalUsdSobrante * $tasa_cambio;

            $distribution->update([
                'remaining_amount_usd' => $totalUsdSobrante,
                'remaining_amount_cup' => $totalCupSobrante,
            ]);

            // Cada cuenta aporta una proporción del total en USD — el movimiento financiero (y el
            // descuento de saldo) se reparte según esa proporción, no todo a una sola cuenta.
            // El movimiento de cada cuenta se registra en SU propia moneda (CUP o USD), no
            // siempre en CUP como antes.
            foreach ($cuentasSeleccionadas as $item) {
                $cuenta = $item['cuenta'];
                $esCup = $cuenta->moneda->codigo_moneda === 'CUP';
                $proporcion = $item['monto_usd'] / $totalUsdDisponible;

                $montoProductosUsdCuenta = $totalUsdDistribuidoProductos * $proporcion;
                $montoSobranteUsdCuenta = $totalUsdSobrante * $proporcion;

                $montoProductosCuenta = round($esCup ? $montoProductosUsdCuenta * $tasa_cambio : $montoProductosUsdCuenta, 2);
                $montoSobranteCuenta = round($esCup ? $montoSobranteUsdCuenta * $tasa_cambio : $montoSobranteUsdCuenta, 2);

                if ($montoProductosCuenta > 0) {
                    MovimientoFinanciero::create([
                        'tipo_movimiento_id' => 1,
                        'cuenta_origen_id' => $cuenta->id,
                        'cliente_origen_id' => null,
                        'cuenta_destino_id' => null,
                        'cliente_destino_id' => null,
                        'proveedor_destino_id' => null,
                        'monto' => $montoProductosCuenta,
                        'moneda' => $cuenta->moneda->codigo_moneda,
                        'tasa_cambio_aplicada' => $esCup ? $tasa_cambio : null,
                        'descripcion' => $validatedData['details'] . ' - Distribución costos productos compras #' . $compraIds,
                        'fecha_operacion' => now(),
                        'estado' => 'completado',
                    ]);
                }

                if ($montoSobranteCuenta > 0.01) {
                    MovimientoFinanciero::create([
                        'tipo_movimiento_id' => 1,
                        'cuenta_origen_id' => $cuenta->id,
                        'cliente_origen_id' => null,
                        'cuenta_destino_id' => null,
                        'cliente_destino_id' => null,
                        'proveedor_destino_id' => null,
                        'monto' => $montoSobranteCuenta,
                        'moneda' => $cuenta->moneda->codigo_moneda,
                        'tasa_cambio_aplicada' => $esCup ? $tasa_cambio : null,
                        'descripcion' => $validatedData['details'] . ' - Sobrante no distribuido compras #' . $compraIds,
                        'fecha_operacion' => now(),
                        'estado' => 'completado',
                    ]);
                }

                $cuenta->decrement('saldo_cuenta', $item['monto']);
            }

            $mensajeExito = $totalUsdSobrante > 0.01
                ? 'Costos distribuidos manualmente con éxito. Se registró un sobrante de ' .
                number_format($totalUsdSobrante, 2) . ' USD (' .
                number_format($totalCupSobrante, 2) . ' CUP) como gasto directo.'
                : 'Costos distribuidos manualmente con éxito.';

            DB::commit();

            return redirect()
                ->route('distribucion-costos.index')
                ->with('success', $mensajeExito);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al distribuir costos manualmente: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Ocurrió un error al distribuir los costos. Por favor, revisa los datos e intenta de nuevo.');
        }
    }

    /**
     * Agrupa las líneas de compra_producto por producto (un producto puede tener varias líneas
     * en la misma compra desde distintos almacenes/precios) sumando la cantidad, para el listado
     * que reparte un gasto por producto, no por línea.
     */
    private function agruparProductosPorLinea($productos)
    {
        return $productos
            ->groupBy('id')
            ->map(function ($lineas) {
                $producto = $lineas->first();
                $producto->pivot->cantidad = $lineas->sum(fn($p) => $p->pivot->cantidad);
                return $producto;
            })
            ->values();
    }
}
