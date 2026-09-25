<?php

namespace App\Http\Controllers;

use App\Http\Requests\DistribuirCostosManualRequest;
use App\Models\Almacen;
use App\Models\Compra;
use App\Models\CostDistribution;
use App\Models\CostDistributionCompra;
use App\Models\CostDistributionCuenta;
use App\Models\CostDistributionItem;
use App\Models\CostDistributionMovimiento;
use App\Models\CostoHistorial;
use App\Models\Cuenta;
use App\Models\LoteStock;
use App\Models\Moneda;
use App\Models\Movimiento;
use App\Models\MovimientoFinanciero;
use App\Models\MovimientoSeguimiento;
use App\Models\Producto;
use App\Models\Proveedor;
use App\Services\FusionLotesService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
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
            // Las que el usuario eliminó de la lista (sin prorratear) ya no se muestran.
            ->where(fn ($query) => $query->whereNull('prorrateo_decision')->orWhere('prorrateo_decision', '!=', 'omitido'))
            ->orderByDesc('fecha_compra')
            ->paginate(15)
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
            // Widget "Operaciones realizadas" — cuántas distribuciones de costo ya confirmadas
            // cubrieron al menos una compra (vs. las que cubrieron un lote de movimientos).
            'operacionesComprasRealizadas' => CostDistribution::whereHas('compras')->count(),
            // Eliminar de la lista (sin prorratear) acumula lotes: solo admin/moderador.
            'puedeEliminarPendientes' => in_array(Auth::user()->role, ['admin', 'moderador']),
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
            // Pestaña "Movimientos": solo admin/moderador puede decidir el prorrateo (regla del
            // cliente), así que un vendedor nunca recibe esta prop y la pestaña no se renderiza.
            ...(in_array(Auth::user()->role, ['admin', 'moderador']) ? $this->datosMovimientosPendientes($request) : []),
        ]);
    }

    /**
     * Movimientos que dispararon requiere_prorrateo y aún no tienen decisión — la cola
     * informativa de la pestaña "Movimientos". No bloquea recibir() en ningún momento, y el
     * cliente confirmó explícitamente que la decisión puede tomarse "antes o después de recibir,
     * o nunca" — por eso NO se filtra por estado en_transito (eso limitaría la cola solo a
     * movimientos aún no recibidos, contradiciendo esa regla). Se excluyen rechazado/cancelado
     * porque ahí el envío nunca ocurrió — no hay nada que prorratear.
     */
    private function datosMovimientosPendientes(Request $request): array
    {
        $movBuscar = trim((string) $request->input('mov_buscar', ''));
        $movAlmacenId = $request->input('mov_almacen_id', '');
        $movFecha = $request->input('mov_fecha', '');

        // Mismos filtros (búsqueda/almacén/fecha) aplicados tanto al listado paginado como a los
        // widgets de resumen — igual que "Compras totales" ya refleja los filtros de esa pestaña.
        $aplicarFiltros = function ($query) use ($movBuscar, $movAlmacenId, $movFecha) {
            $query
                ->when($movBuscar !== '', function ($q) use ($movBuscar) {
                    $q->where(function ($sub) use ($movBuscar) {
                        $sub->where('id', 'like', "%{$movBuscar}%")
                            ->orWhereHas('usuario', fn ($qq) => $qq->where('name', 'like', "%{$movBuscar}%"));
                    });
                })
                ->when($movAlmacenId !== '', function ($q) use ($movAlmacenId) {
                    $q->where(function ($sub) use ($movAlmacenId) {
                        $sub->where('almacen_origen_id', $movAlmacenId)
                            ->orWhere('almacen_destino_id', $movAlmacenId);
                    });
                })
                ->when($movFecha !== '', fn ($q) => $q->whereDate('fecha_envio', $movFecha));
        };

        $movimientos = Movimiento::with(['almacenOrigen', 'almacenDestino', 'usuario', 'detalles.producto'])
            ->whereNotIn('estado', ['rechazado', 'cancelado'])
            ->where('requiere_prorrateo', true)
            ->whereNull('prorrateo_decision')
            ->tap($aplicarFiltros)
            ->orderByDesc('fecha_envio')
            ->paginate(15, ['*'], 'movimientos_page')
            ->withQueryString();

        $movimientos->through(fn ($movimiento) => [
            'id' => $movimiento->id,
            'fecha_envio' => $movimiento->fecha_envio,
            'almacen_origen' => $movimiento->almacenOrigen->nombre_almacen ?? null,
            'almacen_destino' => $movimiento->almacenDestino->nombre_almacen ?? null,
            'usuario' => $movimiento->usuario->name ?? null,
            'cantidad_lineas' => $movimiento->detalles->count(),
        ]);

        return [
            'movimientosPendientes' => $movimientos,
            'almacenesMovimientos' => Almacen::orderBy('nombre_almacen')->get(['id', 'nombre_almacen']),
            'filtrosMovimientos' => [
                'buscar' => $movBuscar,
                'almacen_id' => $movAlmacenId,
                'fecha' => $movFecha,
            ],
            // Widgets de resumen de la pestaña "Movimientos".
            'movimientosTotal' => Movimiento::tap($aplicarFiltros)->count(),
            'movimientosPorRecibir' => Movimiento::whereIn('estado', ['pendiente_confirmacion', 'en_transito'])->tap($aplicarFiltros)->count(),
            'operacionesProrrateoMovimientos' => CostDistribution::whereHas('movimientos')->count(),
        ];
    }

    /**
     * Muestra el formulario de distribución manual para una o varias compras ("lote"). Las
     * compras llegan por query string (?compras[]=10&compras[]=11), no por segmento de ruta —
     * un botón "Distribuir" de una sola fila manda un array de un elemento.
     *
     * También acepta un lote de movimientos (?movimientos[]=52&movimientos[]=53) en vez de
     * compras — mutuamente excluyentes, nunca ambos en el mismo request. Prorratear movimientos
     * es admin/moderador-only (regla del cliente), a diferencia de compras que cualquier rol
     * puede operar sobre sus propias cuentas.
     */
    public function mostrarFormularioDistribucion(Request $request)
    {
        $compraIds = array_filter((array) $request->input('compras', []));
        $movimientoIds = array_filter((array) $request->input('movimientos', []));

        if (empty($compraIds) && empty($movimientoIds)) {
            abort(404);
        }

        if (! empty($compraIds) && ! empty($movimientoIds)) {
            abort(422, 'No se puede combinar un lote de compras con un lote de movimientos en la misma operación.');
        }

        $monedaCUP = Moneda::where('codigo_moneda', 'CUP')
            ->where('estado', true)
            ->orderBy('tasa_cambio', 'desc')
            ->first();
        $tasaCambioActual = $monedaCUP ? $monedaCUP->tasa_cambio : 0;

        if (! empty($movimientoIds)) {
            if (! in_array(Auth::user()->role, ['admin', 'moderador'])) {
                abort(403, 'Solo admin/moderador puede prorratear costos de movimientos.');
            }

            $movimientos = Movimiento::with('detalles.producto')->whereIn('id', $movimientoIds)->get();

            if ($movimientos->isEmpty()) {
                abort(404);
            }

            $productos = $this->agruparProductosPorMovimiento($movimientos->flatMap->detalles);

            return Inertia::render('DistribucionCostos/CambiarCostoManual', [
                'tipo' => 'movimientos',
                'movimientoIds' => $movimientos->pluck('id')->sort()->values(),
                'productos' => $productos,
                'cuentas' => Cuenta::whereHas('moneda', function ($query) {
                    $query->whereIn('codigo_moneda', ['CUP', 'USD'])->where('estado', true);
                })->with('moneda')->get(),
                'tasaCambioActual' => $tasaCambioActual,
            ]);
        }

        $compras = Compra::with(['productos' => fn ($query) => $query->withPivot('cantidad', 'precio')])
            ->whereIn('id', $compraIds)
            ->get();

        if ($compras->isEmpty()) {
            abort(404);
        }

        // Solo se puede prorratear una compra ya aprobada: antes de aprobar, el stock/lote todavía
        // no existe (aprobar() es lo único que los crea) y la compra puede seguir editándose —
        // prorratear algo que todavía puede cambiar o revertirse no tiene sentido.
        if ($compras->contains(fn ($compra) => $compra->estado !== 'aprobada')) {
            abort(422, 'Solo se pueden prorratear costos sobre compras ya aprobadas.');
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

        return Inertia::render('DistribucionCostos/CambiarCostoManual', [
            'tipo' => 'compras',
            'compraIds' => $compras->pluck('id')->sort()->values(),
            'productos' => $productos,
            'cuentas' => $cuentas,
            'tasaCambioActual' => $tasaCambioActual,
        ]);
    }

    /**
     * Procesa la distribución manual de costos. Acepta un lote de compras (`purchase_ids`) O un
     * lote de movimientos (`movimiento_ids`) — mutuamente excluyentes, exigido por
     * `DistribuirCostosManualRequest` — y una o varias cuentas financiando la operación.
     */
    public function distribuirCostosManual(DistribuirCostosManualRequest $request)
    {
        $validatedData = $request->validated();

        if (! empty($validatedData['movimiento_ids'] ?? [])) {
            return $this->distribuirLoteMovimientos($validatedData);
        }

        return $this->distribuirLoteCompras($validatedData);
    }

    private function distribuirLoteCompras(array $validatedData)
    {
        DB::beginTransaction();

        try {
            $compras = Compra::with('productos')->whereIn('id', $validatedData['purchase_ids'])->get();

            if ($compras->isEmpty()) {
                DB::rollBack();

                return redirect()->back()->with('error', 'No se encontraron las compras seleccionadas.');
            }

            // Mismo guard que mostrarFormularioDistribucion() — defensa en profundidad, por si se
            // llega directo a este endpoint sin pasar por el formulario.
            if ($compras->contains(fn ($compra) => $compra->estado !== 'aprobada')) {
                DB::rollBack();

                return redirect()->back()->with('error', 'Solo se pueden prorratear costos sobre compras ya aprobadas.');
            }

            $compraIds = $compras->pluck('id')->sort()->implode(', ');
            $productosAgrupados = $this->agruparProductosPorLinea($compras->flatMap->productos);

            // El incremento se aplica al costo global de la ficha y a los lotes_stock que
            // descienden de ESTAS líneas de compra puntuales — nunca a "todos los lotes de este
            // producto_id" a lo bruto: desde 2026-09-20 una ficha puede recibir de más de una
            // compra (el catálogo vuelve a reusar fichas existentes, ver
            // procesarLineasProducto()), así que ese producto_id podría tener lotes de OTRA
            // compra que nunca fue parte de este prorrateo. LoteStock::idsConDescendientes()
            // ubica solo la cadena real: el lote que aprobar() creó para esta línea, más
            // cualquier lote hijo que un Movimiento haya creado al trasladarlo después.
            $resultado = $this->ejecutarProrrateoAutomatico(
                $productosAgrupados,
                $validatedData,
                $compras->first()->id,
                "compras #{$compraIds}",
                function (Producto $producto, float $incrementoUnitario, float $nuevoCosto, $productoAgrupado) {
                    $producto->update(['precio_compra_producto' => $nuevoCosto]);

                    $compraProductoIds = $productoAgrupado->pivot->compra_producto_ids ?? [];
                    $loteIds = LoteStock::whereIn('compra_producto_id', $compraProductoIds)
                        ->get()
                        ->flatMap(fn (LoteStock $lote) => $lote->idsConDescendientes())
                        ->unique()
                        ->all();

                    LoteStock::whereIn('id', $loteIds)->increment('precio_costo', $incrementoUnitario);

                    foreach ($producto->almacenes as $almacen) {
                        app(ProductoVendedorController::class)->actualizarGananciaPorCambioCosto($producto->id, $almacen->id);
                    }
                }
            );

            if ($resultado instanceof RedirectResponse) {
                DB::rollBack();

                return $resultado;
            }

            foreach ($compras as $compraDelLote) {
                CostDistributionCompra::create([
                    'cost_distribution_id' => $resultado['distribution']->id,
                    'compra_id' => $compraDelLote->id,
                ]);

                $compraDelLote->update([
                    'prorrateo_decision' => 'aplicado',
                    'prorrateo_decidido_por' => auth()->id(),
                    'prorrateo_decidido_en' => now(),
                ]);
            }

            DB::commit();

            return redirect()
                ->route('distribucion-costos.index')
                ->with('success', $this->mensajeExitoDistribucion($resultado));
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al distribuir costos manualmente (compras): '.$e->getMessage());

            return redirect()->back()->with('error', 'Ocurrió un error al distribuir los costos. Por favor, revisa los datos e intenta de nuevo.');
        }
    }

    private function distribuirLoteMovimientos(array $validatedData)
    {
        if (! in_array(Auth::user()->role, ['admin', 'moderador'])) {
            abort(403, 'Solo admin/moderador puede prorratear costos de movimientos.');
        }

        DB::beginTransaction();

        try {
            // rechazado/cancelado: el envío nunca ocurrió, no hay costo de transporte real que
            // prorratear — mismo criterio que datosMovimientosPendientes()/omitirProrrateo().
            $movimientos = Movimiento::with('detalles.producto')
                ->whereNotIn('estado', ['rechazado', 'cancelado'])
                ->whereIn('id', $validatedData['movimiento_ids'])
                ->get();

            if ($movimientos->isEmpty()) {
                DB::rollBack();

                return redirect()->back()->with('error', 'No se encontraron movimientos válidos entre los seleccionados.');
            }

            $movimientoIds = $movimientos->pluck('id')->sort()->implode(', ');
            $productosAgrupados = $this->agruparProductosPorMovimiento($movimientos->flatMap->detalles);

            // A diferencia de una compra, un lote de movimientos no tiene una compra/cuenta
            // "legado" natural que asignarle a purchase_id — se deja null (columna ya nullable).
            //
            // A diferencia de Compras, acá el incremento NUNCA toca el costo global de la ficha
            // (Producto.precio_compra_producto) — un movimiento no crea una ficha nueva, mueve
            // stock del mismo producto entre almacenes que ya existían, y mutar el costo global
            // afectaría también al almacén de origen, que nunca incurrió este transporte (el bug
            // real que motivó separar este camino, ver docs/ESTADO_DESARROLLO.md 2026-09-18). El
            // incremento se aplica solo a los lotes_stock que ESTOS movimientos crearon en
            // recibir() — cada uno en su propio almacén destino.
            $movimientoIdsDelLote = $movimientos->pluck('id');
            $resultado = $this->ejecutarProrrateoAutomatico(
                $productosAgrupados,
                $validatedData,
                null,
                "movimientos #{$movimientoIds}",
                function (Producto $producto, float $incrementoUnitario, float $nuevoCosto) use ($movimientoIdsDelLote) {
                    LoteStock::whereIn('movimiento_id', $movimientoIdsDelLote)
                        ->where('producto_id', $producto->id)
                        ->increment('precio_costo', $incrementoUnitario);

                    foreach ($producto->almacenes as $almacen) {
                        app(ProductoVendedorController::class)->actualizarGananciaPorCambioCosto($producto->id, $almacen->id);
                    }
                }
            );

            if ($resultado instanceof RedirectResponse) {
                DB::rollBack();

                return $resultado;
            }

            foreach ($movimientos as $movimientoDelLote) {
                CostDistributionMovimiento::create([
                    'cost_distribution_id' => $resultado['distribution']->id,
                    'movimiento_id' => $movimientoDelLote->id,
                ]);

                $movimientoDelLote->update([
                    'prorrateo_decision' => 'aplicado',
                    'prorrateo_decidido_por' => auth()->id(),
                    'prorrateo_decidido_en' => now(),
                ]);

                MovimientoSeguimiento::create([
                    'movimiento_id' => $movimientoDelLote->id,
                    'estado' => $movimientoDelLote->estado,
                    'observaciones' => 'Prorrateo de costos aplicado.',
                    'user_id' => auth()->id(),
                ]);
            }

            DB::commit();

            return redirect()
                ->route('distribucion-costos.index')
                ->with('success', $this->mensajeExitoDistribucion($resultado));
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al distribuir costos manualmente (movimientos): '.$e->getMessage());

            return redirect()->back()->with('error', 'Ocurrió un error al distribuir los costos. Por favor, revisa los datos e intenta de nuevo.');
        }
    }

    private function mensajeExitoDistribucion(array $resultado): string
    {
        return $resultado['totalUsdSobrante'] > 0.01
            ? 'Costos distribuidos manualmente con éxito. Se registró un sobrante de '.
                number_format($resultado['totalUsdSobrante'], 2).' USD ('.
                number_format($resultado['totalCupSobrante'], 2).' CUP) como gasto directo.'
            : 'Costos distribuidos manualmente con éxito.';
    }

    /**
     * Núcleo compartido del prorrateo automático: financia con una o varias cuentas (CUP/USD
     * mezcladas), reparte el monto por peso proporcional — (costo_actual × cantidad) / total del
     * lote — entre los productos, actualiza el costo y registra auditoría
     * (CostDistributionItem/CostoHistorial). Usado tanto por compras como por movimientos; la
     * única diferencia entre ambos es de dónde sale $productosAgrupados y qué pivote de lote se
     * crea después (ver distribuirLoteCompras/distribuirLoteMovimientos).
     *
     * @param  Collection  $productosAgrupados  Producto con pivot->cantidad ya sumado (ver agruparProductosPorLinea/agruparProductosPorMovimiento).
     * @param  callable(Producto, float, float, mixed): void  $aplicarNuevoCosto  Dónde aplicar el incremento por unidad calculado — Compras lo aplica al costo global de la ficha y a los lotes que descienden de las líneas de compra de este lote (ver LoteStock::idsConDescendientes(), una ficha puede recibir de más de una compra desde 2026-09-20); Movimientos lo aplica solo al lote del almacén destino de ESE traslado (ver distribuirLoteCompras/distribuirLoteMovimientos). Firma: (Producto $producto, float $incrementoUnitario, float $nuevoCostoGlobalReferencia, mixed $productoAgrupado — el elemento actual de $productosAgrupados, con su pivot).
     * @return RedirectResponse|array{distribution: CostDistribution, totalUsdSobrante: float, totalCupSobrante: float}
     */
    private function ejecutarProrrateoAutomatico($productosAgrupados, array $validatedData, ?int $purchaseIdLegado, string $etiquetaLote, callable $aplicarNuevoCosto)
    {
        // Tasa de cambio de la operación — aplica solo a las cuentas CUP del lote; las cuentas
        // USD no la necesitan. Por defecto, la tasa CUP general del sistema.
        $monedaCUP = Moneda::where('codigo_moneda', 'CUP')->where('estado', true)->orderBy('tasa_cambio', 'desc')->first();
        $tasa_cambio = $validatedData['exchange_rate'] ?? ($monedaCUP->tasa_cambio ?? null);

        if (! $tasa_cambio || $tasa_cambio == 0) {
            return redirect()->back()->with('error', 'La tasa de cambio no está definida o es cero.');
        }

        // Cada cuenta financia en su propia moneda (CUP o USD, mezcladas está permitido).
        // monto_usd es el equivalente en USD de lo que esa cuenta aporta — CUP se convierte con
        // la tasa de la operación, USD entra directo, sin conversión.
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

            if ($cuentasAsignadas !== null && ! in_array($cuenta->id, $cuentasAsignadas)) {
                return redirect()->back()->with('error', "No tiene permiso para operar con la cuenta {$cuenta->nombre_cuenta}.");
            }

            if ($cuenta->tipo_cuenta === 'deudas') {
                return redirect()->back()->with('error', 'No se puede usar una cuenta de deudas para esta operación.');
            }

            if (! in_array($cuenta->moneda->codigo_moneda, ['CUP', 'USD'])) {
                return redirect()->back()->with('error', 'Solo se pueden usar cuentas en moneda CUP o USD para esta operación.');
            }

            if ($cuenta->saldo_cuenta < $item['monto']) {
                return redirect()->back()->with('error', "El saldo de la cuenta {$cuenta->nombre_cuenta} es insuficiente.");
            }
        }

        $totalUsdDisponible = $cuentasSeleccionadas->sum('monto_usd');
        // Legado: solo la parte que vino de cuentas CUP, informativo — la fuente real del
        // desglose por cuenta/moneda es cost_distribution_cuentas.
        $totalCupLegado = $cuentasSeleccionadas->filter(fn ($i) => $i['cuenta']->moneda->codigo_moneda === 'CUP')->sum('monto');

        $distribution = CostDistribution::create([
            // Campos legado (una sola compra/cuenta/monto) — se rellenan con la primera
            // compra/cuenta y el total combinado por compatibilidad; la fuente real del desglose
            // es cost_distribution_compras|cost_distribution_movimientos/cost_distribution_cuentas.
            // purchase_id queda null para un lote de movimientos (columna nullable desde
            // 2026_08_25_160425_make_purchase_id_and_account_id_nullable_on_cost_distributions_table).
            'purchase_id' => $purchaseIdLegado,
            'account_id' => $cuentasSeleccionadas->first()['cuenta']->id,
            'user_id' => auth()->id(),
            'amount_cup' => $totalCupLegado,
            'amount_usd' => $totalUsdDisponible,
            'exchange_rate' => $tasa_cambio,
            'details' => $validatedData['details'],
            'remaining_amount_usd' => 0,
            'remaining_amount_cup' => 0,
        ]);

        foreach ($cuentasSeleccionadas as $item) {
            CostDistributionCuenta::create([
                'cost_distribution_id' => $distribution->id,
                'cuenta_id' => $item['cuenta']->id,
                'monto' => $item['monto'],
            ]);
        }

        // Reparto 100% automático: el peso de cada producto es (costo actual × cantidad) / total
        // del lote. El monto que le toca a esa línea se divide entre sus unidades para obtener
        // el costo adicional por unidad — nunca se suma el monto total directo al costo unitario
        // (esa era la fórmula vieja, y era incorrecta).
        $totalLote = $productosAgrupados->sum(fn ($p) => $p->precio_compra_producto * $p->pivot->cantidad);

        $totalUsdDistribuidoProductos = 0;

        foreach ($productosAgrupados as $productoAgrupado) {
            $cantidad = $productoAgrupado->pivot->cantidad;
            $costoActual = $productoAgrupado->precio_compra_producto;
            $totalLinea = $costoActual * $cantidad;

            if ($totalLote <= 0 || $cantidad <= 0) {
                continue;
            }

            $peso = $totalLinea / $totalLote;
            $montoAsignado = $peso * $totalUsdDisponible;

            if ($montoAsignado <= 0) {
                continue;
            }

            $incrementoUnitario = $montoAsignado / $cantidad;
            $nuevoCosto = $costoActual + $incrementoUnitario;

            $producto = Producto::findOrFail($productoAgrupado->id);

            CostDistributionItem::create([
                'cost_distribution_id' => $distribution->id,
                'product_id' => $producto->id,
                'quantity' => $cantidad,
                'distributed_amount_usd' => $montoAsignado,
                'old_cost_usd' => $costoActual,
                'new_cost_usd' => $nuevoCosto,
            ]);

            CostoHistorial::create([
                'product_id' => $producto->id,
                'old_cost_usd' => $costoActual,
                'new_cost_usd' => $nuevoCosto,
                'cost_distribution_id' => $distribution->id,
                'comentario' => "Ajuste por distribución automática de costos ({$etiquetaLote}).",
            ]);

            $aplicarNuevoCosto($producto, $incrementoUnitario, $nuevoCosto, $productoAgrupado);

            $totalUsdDistribuidoProductos += $montoAsignado;
        }

        $totalUsdSobrante = $totalUsdDisponible - $totalUsdDistribuidoProductos;
        $totalCupSobrante = $totalUsdSobrante * $tasa_cambio;

        $distribution->update([
            'remaining_amount_usd' => $totalUsdSobrante,
            'remaining_amount_cup' => $totalCupSobrante,
        ]);

        // Cada cuenta aporta una proporción del total en USD — el movimiento financiero (y el
        // descuento de saldo) se reparte según esa proporción, no todo a una sola cuenta. El
        // movimiento de cada cuenta se registra en SU propia moneda (CUP o USD), no siempre en
        // CUP como antes.
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
                    'descripcion' => $validatedData['details']." - Distribución costos productos {$etiquetaLote}",
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
                    'descripcion' => $validatedData['details']." - Sobrante no distribuido {$etiquetaLote}",
                    'fecha_operacion' => now(),
                    'estado' => 'completado',
                ]);
            }

            $cuenta->decrement('saldo_cuenta', $item['monto']);
        }

        return [
            'distribution' => $distribution,
            'totalUsdSobrante' => $totalUsdSobrante,
            'totalCupSobrante' => $totalCupSobrante,
        ];
    }

    /**
     * Omite el prorrateo de uno o varios movimientos en lote — no aplica ningún cálculo, solo
     * marca la decisión (housekeeping: sacarlos de la cola de pendientes). No hay gate que
     * "liberar" — recibir() nunca estuvo bloqueado, esto es solo dejar constancia de que ya se
     * revisó y no aplica.
     */
    public function omitirProrrateo(Request $request)
    {
        if (! in_array(Auth::user()->role, ['admin', 'moderador'])) {
            abort(403, 'Solo admin/moderador puede omitir el prorrateo de movimientos.');
        }

        $request->validate([
            'movimiento_ids' => 'required|array|min:1',
            'movimiento_ids.*' => 'required|exists:movimientos,id',
        ]);

        DB::beginTransaction();

        try {
            // Mismo criterio que la cola de pendientes (datosMovimientosPendientes): cualquier
            // estado salvo rechazado/cancelado, no solo en_transito — omitir es igual de válido
            // antes o después de recibir.
            $movimientos = Movimiento::whereNotIn('estado', ['rechazado', 'cancelado'])
                ->where('requiere_prorrateo', true)
                ->whereNull('prorrateo_decision')
                ->whereIn('id', $request->movimiento_ids)
                ->get();

            if ($movimientos->isEmpty()) {
                DB::rollBack();

                return redirect()->back()->with('error', 'No se encontraron movimientos pendientes de decisión entre los seleccionados.');
            }

            $lotesAcumulados = 0;

            foreach ($movimientos as $movimiento) {
                $movimiento->update([
                    'prorrateo_decision' => 'omitido',
                    'prorrateo_decidido_por' => auth()->id(),
                    'prorrateo_decidido_en' => now(),
                ]);

                MovimientoSeguimiento::create([
                    'movimiento_id' => $movimiento->id,
                    'estado' => $movimiento->estado,
                    'observaciones' => 'Prorrateo de costos omitido.',
                    'user_id' => auth()->id(),
                ]);

                // Sin prorrateo no hay motivo para mantener un lote aparte: sus unidades se acumulan
                // al lote existente del almacén destino cuando es idéntico (mismo costo).
                if ($movimiento->almacen_destino_id) {
                    $lotesAcumulados += app(FusionLotesService::class)->acumularMovimientoEnLoteExistente($movimiento, auth()->user());
                }
            }

            DB::commit();

            $mensaje = 'Prorrateo omitido en '.$movimientos->count().' movimiento(s).';
            if ($lotesAcumulados > 0) {
                $mensaje .= " {$lotesAcumulados} lote(s) se acumularon al lote existente del almacén destino.";
            }

            return redirect()->route('distribucion-costos.index')
                ->with('success', $mensaje);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al omitir prorrateo de movimientos: '.$e->getMessage());

            return redirect()->back()->with('error', 'Ocurrió un error al omitir el prorrateo. Intenta de nuevo.');
        }
    }

    /**
     * Elimina compras de la lista de Distribución de Costos SIN prorratear (la decisión "omitido"),
     * igual que con los movimientos: la lista no crece sin fin. Como no se prorratea, los lotes que
     * la compra creó al aprobarse se acumulan al lote idéntico que el almacén ya tenía. Solo
     * admin/moderador (mueve lotes). Solo compras aprobadas o anuladas y aún sin decisión: una
     * pendiente no tiene lotes todavía, y una ya prorrateada tiene su historial de distribución.
     */
    public function omitirProrrateoCompras(Request $request): RedirectResponse
    {
        if (! in_array(Auth::user()->role, ['admin', 'moderador'])) {
            abort(403, 'Solo admin/moderador puede eliminar compras de la lista de prorrateos.');
        }

        $request->validate([
            'compra_ids' => 'required|array|min:1',
            'compra_ids.*' => 'required|exists:compras,id',
        ]);

        DB::beginTransaction();

        try {
            $compras = Compra::whereIn('id', $request->compra_ids)
                ->whereNull('prorrateo_decision')
                ->whereIn('estado', ['aprobada', 'anulada'])
                ->get();

            if ($compras->isEmpty()) {
                DB::rollBack();

                return redirect()->back()->with('error', 'Ninguna de las compras seleccionadas se puede eliminar de la lista: solo las aprobadas o anuladas que aún no se prorratearon.');
            }

            $lotesAcumulados = 0;

            foreach ($compras as $compra) {
                $compra->update([
                    'prorrateo_decision' => 'omitido',
                    'prorrateo_decidido_por' => auth()->id(),
                    'prorrateo_decidido_en' => now(),
                ]);

                if ($compra->estado === 'aprobada') {
                    $lotesAcumulados += app(FusionLotesService::class)->acumularCompraEnLoteExistente($compra, auth()->user());
                }
            }

            DB::commit();

            $mensaje = $compras->count().' compra(s) eliminada(s) de la lista sin prorratear.';
            if ($lotesAcumulados > 0) {
                $mensaje .= " {$lotesAcumulados} lote(s) se acumularon al lote existente del almacén.";
            }
            if ($compras->count() < count($request->compra_ids)) {
                $mensaje .= ' Las demás no se pudieron eliminar (pendientes o ya prorrateadas).';
            }

            return redirect()->route('distribucion-costos.index')->with('success', $mensaje);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al eliminar compras de la lista de prorrateos: '.$e->getMessage());

            return redirect()->back()->with('error', 'Ocurrió un error al eliminar las compras de la lista. Intenta de nuevo.');
        }
    }

    /**
     * Historial de todas las distribuciones de costos ya confirmadas. Acepta ?compra_id=X o
     * ?movimiento_id=X para ver solo las distribuciones que cubrieron esa compra/movimiento en
     * particular (usado por el botón "Detalles"/"Ver distribución" de los listados).
     */
    public function historial(Request $request)
    {
        $compraId = $request->input('compra_id', '');
        $movimientoId = $request->input('movimiento_id', '');
        // 'compras'|'movimientos' — filtro de categoría (no una compra/movimiento puntual), usado
        // por los widgets "Operaciones realizadas"/"Operaciones de Prorrateo realizadas" del index.
        $tipo = $request->input('tipo', '');
        $fecha = $request->input('fecha', '');

        $distribuciones = CostDistribution::with(['compras.compra', 'movimientos.movimiento', 'cuentas.cuenta.moneda', 'user', 'items'])
            ->when($compraId !== '', fn ($query) => $query->whereHas('compras', fn ($q) => $q->where('compra_id', $compraId)))
            ->when($movimientoId !== '', fn ($query) => $query->whereHas('movimientos', fn ($q) => $q->where('movimiento_id', $movimientoId)))
            ->when($tipo === 'compras', fn ($query) => $query->whereHas('compras'))
            ->when($tipo === 'movimientos', fn ($query) => $query->whereHas('movimientos'))
            ->when($fecha !== '', fn ($query) => $query->whereDate('created_at', $fecha))
            ->orderByDesc('created_at')
            ->paginate(10)
            ->withQueryString();

        $distribuciones->through(function ($distribucion) {
            return [
                'id' => $distribucion->id,
                'fecha' => $distribucion->created_at,
                'usuario' => $distribucion->user->name ?? null,
                'compras' => $distribucion->compras->pluck('compra_id')->sort()->values(),
                'movimientos' => $distribucion->movimientos->pluck('movimiento_id')->sort()->values(),
                'cuentas' => $distribucion->cuentas->map(fn ($c) => [
                    'nombre' => $c->cuenta->nombre_cuenta ?? null,
                    'moneda' => $c->cuenta->moneda->codigo_moneda ?? null,
                    'monto' => $c->monto,
                ]),
                'monto_total_usd' => $distribucion->amount_usd,
                'productos_afectados' => $distribucion->items->count(),
                'comentario' => $distribucion->details,
            ];
        });

        return Inertia::render('DistribucionCostos/Historial', [
            'distribuciones' => $distribuciones,
            'filtros' => [
                'compra_id' => $compraId,
                'movimiento_id' => $movimientoId,
                'tipo' => $tipo,
                'fecha' => $fecha,
            ],
        ]);
    }

    /**
     * Detalle de una distribución de costos ya confirmada: resumen de la operación, desglose por
     * producto, y el historial completo de costo de cada producto afectado (no solo esta
     * distribución, para ver la evolución completa en el tiempo).
     */
    public function show(CostDistribution $distribucion)
    {
        $distribucion->load(['compras.compra', 'movimientos.movimiento', 'cuentas.cuenta.moneda', 'user', 'items.product']);

        $productoIds = $distribucion->items->pluck('product_id');
        $historialesPorProducto = CostoHistorial::with('distribution')
            ->whereIn('product_id', $productoIds)
            ->orderBy('created_at')
            ->get()
            ->groupBy('product_id');

        return Inertia::render('DistribucionCostos/Show', [
            'distribucion' => [
                'id' => $distribucion->id,
                'fecha' => $distribucion->created_at,
                'usuario' => $distribucion->user->name ?? null,
                'comentario' => $distribucion->details,
                'tasa_cambio' => $distribucion->exchange_rate,
                'monto_total_usd' => $distribucion->amount_usd,
                'compras' => $distribucion->compras->pluck('compra_id')->sort()->values(),
                'movimientos' => $distribucion->movimientos->pluck('movimiento_id')->sort()->values(),
                'cuentas' => $distribucion->cuentas->map(fn ($c) => [
                    'nombre' => $c->cuenta->nombre_cuenta ?? null,
                    'moneda' => $c->cuenta->moneda->codigo_moneda ?? null,
                    'monto' => $c->monto,
                ]),
            ],
            'productos' => $distribucion->items->map(function ($item) use ($historialesPorProducto, $distribucion) {
                $cantidad = $item->quantity;
                $porcentajeAumento = $item->old_cost_usd > 0
                    ? (($item->new_cost_usd - $item->old_cost_usd) / $item->old_cost_usd) * 100
                    : 0;

                return [
                    'producto_id' => $item->product_id,
                    'nombre' => $item->product->nombre_producto ?? "Producto #{$item->product_id}",
                    'cantidad' => $cantidad,
                    'costo_anterior' => $item->old_cost_usd,
                    'monto_asignado' => $item->distributed_amount_usd,
                    'costo_nuevo' => $item->new_cost_usd,
                    'porcentaje_aumento' => $porcentajeAumento,
                    'historial' => ($historialesPorProducto->get($item->product_id) ?? collect())->map(fn ($h) => [
                        'fecha' => $h->created_at,
                        'costo_anterior' => $h->old_cost_usd,
                        'costo_nuevo' => $h->new_cost_usd,
                        'comentario' => $h->comentario,
                        'es_esta_distribucion' => $h->cost_distribution_id === $distribucion->id,
                    ])->values(),
                ];
            }),
        ]);
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
                $producto->pivot->cantidad = $lineas->sum(fn ($p) => $p->pivot->cantidad);
                // IDs de compra_producto que aportaron a este total — desde 2026-09-20 un mismo
                // producto_id puede recibir líneas de más de una compra (ver
                // procesarLineasProducto()), así que distribuirLoteCompras() necesita saber
                // exactamente cuáles para ubicar solo los lotes propios (ver
                // LoteStock::idsConDescendientes()), no todos los del producto.
                $producto->pivot->compra_producto_ids = $lineas->pluck('pivot.id')->filter()->values()->all();

                return $producto;
            })
            ->values();
    }

    /**
     * Agrupa MovimientoDetalle por producto (mismo producto en dos movimientos del lote suma
     * cantidad_despachada, no aparece dos veces), devolviendo Producto con un pivot->cantidad
     * sintético — mismo shape que agruparProductosPorLinea(), así ejecutarProrrateoAutomatico()
     * no necesita saber si el lote es de compras o de movimientos.
     *
     * Usa cantidad_despachada (no cantidad_recibida): el prorrateo pasa mientras el movimiento
     * sigue en_transito, antes de que recibir() exista para esas líneas.
     */
    private function agruparProductosPorMovimiento($detalles)
    {
        return $detalles
            ->groupBy('producto_id')
            ->map(function ($lineas) {
                $producto = $lineas->first()->producto;
                $producto->pivot = (object) ['cantidad' => $lineas->sum('cantidad_despachada')];

                return $producto;
            })
            ->values();
    }
}
