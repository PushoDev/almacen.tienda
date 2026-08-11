<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\Cuenta;
use App\Models\Cliente;
use App\Models\Proveedor;
use App\Models\Producto;
use App\Models\Moneda;
use App\Models\CostDistribution;
use App\Models\CostDistributionItem;
use App\Models\CostoHistorial;
use App\Models\MovimientoFinanciero;
use App\Http\Requests\DistribuirCostosManualRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;
use Exception;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Notification;
use App\Http\Controllers\ProductoVendedorController;
use App\Notifications\MovimientoFinancieroNotification;
use App\Services\NotificationService;

class TransaccionController extends Controller
{
    /**
     * Vista principal de transacciones.
     */
    public function index()
    {
        $compras = Compra::with('productos')
            ->orderByDesc('fecha_compra')
            ->limit(50)
            ->get()
            ->each(fn ($compra) => $compra->setRelation('productos', $this->agruparProductosPorLinea($compra->productos)));

        // Origen: vendedor solo ve sus cuentas asignadas personales; destino: cuentas asignadas a cualquier usuario
        if (auth()->user()->role === 'vendedor') {
            $cuentasOrigen = auth()->user()->cuentas()->where('tipo_titular', 'personal')->with('moneda')->get();
            $cuentasDestino = Cuenta::with('moneda')->whereHas('users')->get();
        } else {
            $cuentasOrigen = Cuenta::with('moneda')->get();
            $cuentasDestino = Cuenta::with('moneda')->get();
        }

        $clientes = Cliente::all();
        $proveedores = Proveedor::all();

        // ✅ Obtener monedas activas y tasa CUP por defecto
        $monedasActivas = Moneda::where('estado', true)->get();
        $monedaCUP = Moneda::where('codigo_moneda', 'CUP')
            ->where('estado', true)
            ->orderBy('tasa_cambio', 'desc')
            ->first();

        return Inertia::render('Transacciones/Index', [
            'compras' => $compras,
            'cuentasOrigen' => $cuentasOrigen,
            'cuentasDestino' => $cuentasDestino,
            'clientes' => $clientes,
            'proveedores' => $proveedores,
            'monedasActivas' => $monedasActivas,
            'tasaCambioActual' => $monedaCUP ? $monedaCUP->tasa_cambio : 0,
            'userRole' => auth()->user()->role ?? 'vendedor',
        ]);
    }

    /**
     * Muestra formulario de distribución manual para una compra.
     */
    public function mostrarFormularioDistribucion(Compra $compra)
    {
        $compra->load([
            'productos' => fn($query) => $query->withPivot('cantidad', 'precio')
        ]);
        $compra->setRelation('productos', $this->agruparProductosPorLinea($compra->productos));

        // ✅ Filtrar cuentas según el rol del usuario y que tengan moneda CUP
        if (auth()->user()->role === 'vendedor') {
            $cuentas = auth()->user()->cuentas()
                ->whereHas('moneda', function ($query) {
                    $query->where('codigo_moneda', 'CUP')->where('estado', true);
                })
                ->with('moneda')
                ->get();
        } else {
            $cuentas = Cuenta::whereHas('moneda', function ($query) {
                $query->where('codigo_moneda', 'CUP')->where('estado', true);
            })->with('moneda')->get();
        }

        // ✅ Obtener moneda CUP por defecto
        $monedaCUP = Moneda::where('codigo_moneda', 'CUP')
            ->where('estado', true)
            ->orderBy('tasa_cambio', 'desc')
            ->first();

        return Inertia::render('Transacciones/CambiarCostoManual', [
            'compra' => $compra,
            'cuentas' => $cuentas,
            'monedaCUP' => $monedaCUP,
            'tasaCambioActual' => $monedaCUP ? $monedaCUP->tasa_cambio : 0,
        ]);
    }

    /**
     * Procesa la distribución manual de costos (solo con cuentas).
     */
    public function distribuirCostosManual(DistribuirCostosManualRequest $request)
    {
        $validatedData = $request->validated();

        DB::beginTransaction();

        try {
            $compra = Compra::with('productos')->findOrFail($validatedData['purchase_id']);
            $cuenta = Cuenta::with('moneda')->findOrFail($validatedData['account_id']);

            // ✅ Validar que el vendedor tenga acceso a esta cuenta
            if (auth()->user()->role === 'vendedor') {
                $cuentasAsignadas = auth()->user()->cuentas()->pluck('id')->toArray();
                if (!in_array($cuenta->id, $cuentasAsignadas)) {
                    DB::rollBack();
                    return redirect()->back()->with('error', 'No tiene permiso para operar con esta cuenta.');
                }
            }

            if ($cuenta->tipo_cuenta === 'deudas') {
                DB::rollBack();
                return redirect()->back()->with('error', 'No se puede usar una cuenta de deudas para esta operación.');
            }

            // ✅ Validar que la cuenta tenga moneda CUP
            if ($cuenta->moneda->codigo_moneda !== 'CUP') {
                DB::rollBack();
                return redirect()->back()->with('error', 'Solo se pueden usar cuentas en moneda CUP para esta operación.');
            }

            // ✅ Obtener tasa de cambio desde la moneda de la cuenta
            $tasa_cambio = $validatedData['exchange_rate'] ?? $cuenta->moneda->tasa_cambio;

            if (!$tasa_cambio || $tasa_cambio == 0) {
                DB::rollBack();
                return redirect()->back()->with('error', 'La tasa de cambio no está definida o es cero.');
            }

            $totalCupDistribuir = (float)$validatedData['amount_cup'];
            $totalUsdDisponible = $totalCupDistribuir / $tasa_cambio;

            if ($cuenta->saldo_cuenta < $totalCupDistribuir) {
                DB::rollBack();
                return redirect()->back()->with('error', 'El saldo en la cuenta de origen es insuficiente.');
            }

            $distribution = CostDistribution::create([
                'purchase_id' => $validatedData['purchase_id'],
                'account_id' => $validatedData['account_id'],
                'amount_cup' => $totalCupDistribuir,
                'amount_usd' => $totalUsdDisponible,
                'exchange_rate' => $tasa_cambio,
                'details' => $validatedData['details'],
                'remaining_amount_usd' => 0,
                'remaining_amount_cup' => 0,
            ]);

            $totalUsdDistribuidoProductos = 0;

            foreach ($validatedData['productos'] as $productoData) {
                if ((float)$productoData['amount_usd'] > 0) {
                    $producto = Producto::findOrFail($productoData['product_id']);
                    // Un producto puede tener varias líneas en la compra (distintos almacenes/colores);
                    // se suma la cantidad de todas para este resumen, en vez de tomar solo la primera.
                    $cantidad = $compra->productos->where('id', $producto->id)->sum(fn($p) => $p->pivot->cantidad);
                    $costoActual = $producto->precio_compra_producto;
                    $incrementoUnitario = (float)$productoData['amount_usd'];
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

                    $totalUsdDistribuidoProductos += (float)$productoData['amount_usd'];
                }
            }

            $totalUsdSobrante = $totalUsdDisponible - $totalUsdDistribuidoProductos;
            $totalCupSobrante = $totalUsdSobrante * $tasa_cambio;

            $distribution->update([
                'remaining_amount_usd' => $totalUsdSobrante,
                'remaining_amount_cup' => $totalCupSobrante,
            ]);

            if ($totalUsdDistribuidoProductos > 0) {
                $montoCupProductos = $totalUsdDistribuidoProductos * $tasa_cambio;

                MovimientoFinanciero::create([
                    'tipo_movimiento_id' => 1,
                    'cuenta_origen_id' => $cuenta->id,
                    'cliente_origen_id' => null,
                    'cuenta_destino_id' => null,
                    'cliente_destino_id' => null,
                    'proveedor_destino_id' => null,
                    'monto' => $montoCupProductos,
                    'moneda' => 'CUP',
                    'tasa_cambio_aplicada' => $tasa_cambio,
                    'descripcion' => $validatedData['details'] . ' - Distribución costos productos compra #' . $compra->id,
                    'fecha_operacion' => now(),
                    'estado' => 'completado',
                ]);
            }

            if ($totalUsdSobrante > 0.01) {
                MovimientoFinanciero::create([
                    'tipo_movimiento_id' => 1,
                    'cuenta_origen_id' => $cuenta->id,
                    'cliente_origen_id' => null,
                    'cuenta_destino_id' => null,
                    'cliente_destino_id' => null,
                    'proveedor_destino_id' => null,
                    'monto' => $totalCupSobrante,
                    'moneda' => 'CUP',
                    'tasa_cambio_aplicada' => $tasa_cambio,
                    'descripcion' => $validatedData['details'] . ' - Sobrante no distribuido compra #' . $compra->id,
                    'fecha_operacion' => now(),
                    'estado' => 'completado',
                ]);
            }

            $cuenta->decrement('saldo_cuenta', $totalCupDistribuir);

            $mensajeExito = $totalUsdSobrante > 0.01
                ? 'Costos distribuidos manualmente con éxito. Se registró un sobrante de ' .
                number_format($totalUsdSobrante, 2) . ' USD (' .
                number_format($totalCupSobrante, 2) . ' CUP) como gasto directo.'
                : 'Costos distribuidos manualmente con éxito.';

            DB::commit();

            return redirect()
                ->route('transacciones')
                ->with('success', $mensajeExito);
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error al distribuir costos manualmente: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Ocurrió un error al distribuir los costos. Por favor, revisa los datos e intenta de nuevo.');
        }
    }

    // =======================================================

    // Mostrar detalles de una transacción específica
    public function show(MovimientoFinanciero $movimiento)
    {
        // ✅ Validar que el vendedor solo pueda ver sus transacciones
        if (auth()->user()->role === 'vendedor') {
            $cuentasAsignadas = auth()->user()->cuentas()->pluck('id')->toArray();

            // Verificar si la transacción involucra alguna de sus cuentas asignadas
            $involucraCuentaAsignada = in_array($movimiento->cuenta_origen_id, $cuentasAsignadas) ||
                in_array($movimiento->cuenta_destino_id, $cuentasAsignadas);

            // Si no es admin y no involucra sus cuentas, denegar acceso
            if (!$involucraCuentaAsignada && auth()->user()->role !== 'admin') {
                abort(403, 'No tiene permiso para ver esta transacción.');
            }
        }

        // ✅ Cargar TODAS las relaciones necesarias de forma eager
        $movimiento->load([
            'user',
            'tipoMovimiento',
            'cuentaOrigen.moneda',
            'cuentaDestino.moneda',
            'clienteOrigen',
            'clienteDestino',
            'proveedorDestino'
        ]);

        // ✅ Calcular diferencias de saldo si los datos existen
        $detallesOrigen = null;
        $detallesDestino = null;

        // Construir detalles del ORIGEN
        if ($movimiento->cuenta_origen_id || $movimiento->cliente_origen_id) {
            $detallesOrigen = [
                'tipo' => $movimiento->cuenta_origen_id ? 'cuenta' : 'cliente',
                'nombre' => $movimiento->nombreOrigen,
                'moneda' => $movimiento->moneda_origen ?? $movimiento->moneda,
                'tiene_datos_historicos' => $movimiento->saldo_anterior_origen !== null,
                'saldo_anterior' => $movimiento->saldo_anterior_origen,
                'saldo_posterior' => $movimiento->saldo_posterior_origen,
                'monto_operacion' => -1 * abs($movimiento->monto), // Negativo porque sale dinero
                'saldo_actual' => $movimiento->cuentaOrigen?->saldo_cuenta ??
                    $movimiento->clienteOrigen?->deuda_pago_cliente,
            ];
        }

        // Construir detalles del DESTINO
        if ($movimiento->cuenta_destino_id || $movimiento->cliente_destino_id || $movimiento->proveedor_destino_id) {
            $tipoDestino = 'cuenta';
            $saldoActual = null;

            if ($movimiento->cuenta_destino_id) {
                $tipoDestino = 'cuenta';
                $saldoActual = $movimiento->cuentaDestino?->saldo_cuenta;
            } elseif ($movimiento->cliente_destino_id) {
                $tipoDestino = 'cliente';
                $saldoActual = $movimiento->clienteDestino?->deuda_pago_cliente;
            } elseif ($movimiento->proveedor_destino_id) {
                $tipoDestino = 'proveedor';
                $saldoActual = $movimiento->proveedorDestino?->saldo_proveedor;
            }

            $detallesDestino = [
                'tipo' => $tipoDestino,
                'nombre' => $movimiento->nombreDestino,
                'moneda' => $movimiento->moneda_destino ?? $movimiento->moneda,
                'tiene_datos_historicos' => $movimiento->saldo_anterior_destino !== null,
                'saldo_anterior' => $movimiento->saldo_anterior_destino,
                'saldo_posterior' => $movimiento->saldo_posterior_destino,
                'monto_operacion' => abs($movimiento->monto), // Positivo porque entra dinero
                'saldo_actual' => $saldoActual,
            ];
        }

        return Inertia::render('Transacciones/Show', [
            'movimiento' => $movimiento,
            'detallesOrigen' => $detallesOrigen,
            'detallesDestino' => $detallesDestino,
            'userRole' => auth()->user()->role ?? 'vendedor',
        ]);
    }

    // =======================================================
    // === MÉTODO NUEVO: GASTOS POR TRANSPORTACIÓN ===
    // =======================================================

    /**
     * Registrar Gasto por Transportación y distribuir entre productos de una compra
     */
    public function gastoTransportacion(Request $request)
    {
        $request->validate([
            'compra_id' => 'required|exists:compras,id',
            'cuenta_id' => 'required|exists:cuentas,id',
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|string|in:CUP',
            'comentario' => 'nullable|string|max:255',
            'tasa_cambio_aplicada' => 'nullable|numeric|min:0.0001',
            'distribucion_tipo' => 'required|string|in:proporcional,igualitario,manual',
            'distribucion_productos' => 'nullable|array',
            'distribucion_productos.*.producto_id' => 'required|exists:productos,id',
            'distribucion_productos.*.monto_usd' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();

        try {
            $compra = Compra::with('productos')->findOrFail($request->compra_id);
            $cuenta = Cuenta::with('moneda')->findOrFail($request->cuenta_id);

            // ✅ Validar que el vendedor tenga acceso a esta cuenta
            if (auth()->user()->role === 'vendedor') {
                $cuentasAsignadas = auth()->user()->cuentas()->pluck('id')->toArray();
                if (!in_array($cuenta->id, $cuentasAsignadas)) {
                    throw new \Exception('No tiene permiso para operar con esta cuenta.');
                }
            }

            // Validar que la cuenta sea CUP
            if ($cuenta->moneda->codigo_moneda !== 'CUP') {
                throw new \Exception('Solo se pueden usar cuentas en CUP para gastos de transportación.');
            }

            // Validar saldo suficiente
            if ($cuenta->saldo_cuenta < $request->monto) {
                throw new \Exception('Saldo insuficiente en la cuenta.');
            }

            $tasa_cambio = $request->tasa_cambio_aplicada ?? $cuenta->moneda->tasa_cambio;
            $montoTotalUSD = $request->monto / $tasa_cambio;

            // Diferentes métodos de distribución
            $distribuciones = $this->distribuirTransportacion(
                $compra,
                $montoTotalUSD,
                $request->distribucion_tipo,
                $request->distribucion_productos ?? []
            );

            // Registrar el movimiento financiero
            $movimiento = MovimientoFinanciero::create([
                'user_id' => auth()->id(),
                'tipo_movimiento_id' => 1,
                'cuenta_origen_id' => $cuenta->id,
                'cliente_origen_id' => null,
                'cuenta_destino_id' => null,
                'cliente_destino_id' => null,
                'proveedor_destino_id' => null,
                'monto' => $request->monto,
                'moneda' => 'CUP',
                'tasa_cambio_aplicada' => $tasa_cambio,
                'descripcion' => $request->comentario ?? "Gasto por transportación - Compra #{$compra->id}",
                'fecha_operacion' => now(),
                'estado' => 'completado',
            ]);

            // Actualizar costos de productos
            foreach ($distribuciones as $distribucion) {
                $producto = Producto::find($distribucion['producto_id']);
                $nuevoCosto = $producto->precio_compra_producto + $distribucion['monto_usd'];

                CostoHistorial::create([
                    'product_id' => $producto->id,
                    'old_cost_usd' => $producto->precio_compra_producto,
                    'new_cost_usd' => $nuevoCosto,
                    'comentario' => 'Ajuste por gasto de transportación.',
                ]);

                $producto->update(['precio_compra_producto' => $nuevoCosto]);

                // Actualizar ganancias de vendedores
                app(ProductoVendedorController::class)
                    ->actualizarGananciaPorCambioCosto($producto->id);
            }

            // Descontar de la cuenta
            $cuenta->decrement('saldo_cuenta', $request->monto);

            DB::commit();

            // Notificar a usuarios relevantes del gasto de transportación
            try {
                $notificationService = new NotificationService();
                $datosNotificacion = $notificationService->prepararDatosGastoTransportacion($movimiento, $cuenta->id);
                $usuariosParaNotificar = $notificationService->getUsuariosParaNotificar($datosNotificacion);
                
                // Debug: Log para verificar usuarios
                Log::info('Usuarios para notificar (gasto transportación): ' . $usuariosParaNotificar->pluck('id')->implode(','));
                Log::info('Total usuarios notificados: ' . $usuariosParaNotificar->count());
                
                // Cargar relaciones necesarias para la notificación
                $movimiento->load(['user', 'cuentaOrigen']);
                
                Notification::send($usuariosParaNotificar, new MovimientoFinancieroNotification($movimiento, 'gasto'));
                
                Log::info('Notificación de gasto transportación enviada exitosamente');
            } catch (\Exception $e) {
                Log::error('Error enviando notificación de gasto transportación: ' . $e->getMessage());
                Log::error('Stack trace: ' . $e->getTraceAsString());
            }

            return Redirect::back()->with(
                'success',
                "✅ Gasto por transportación de {$request->monto} CUP distribuido entre " .
                    count($distribuciones) . " productos."
            );
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error en gasto por transportación: ' . $e->getMessage());
            return Redirect::back()->with('error', '❌ Error: ' . $e->getMessage());
        }
    }

    /**
     * Distribuye el monto de transportación entre productos
     */
    /**
     * Agrupa las líneas de compra_producto por producto (un producto puede tener varias líneas
     * en la misma compra desde distintos almacenes/colores) sumando la cantidad, para las
     * pantallas que reparten un gasto por producto, no por línea.
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

    private function distribuirTransportacion(Compra $compra, float $montoTotalUSD, string $tipo, array $distribucionManual = []): array
    {
        // 'proporcional'/'igualitario' reparten por producto, no por línea — si el mismo producto
        // tiene varias líneas en esta compra (distintos almacenes/colores), no debe pesar el doble.
        $productos = $compra->productos->unique('id')->values();
        $distribuciones = [];

        switch ($tipo) {
            case 'proporcional':
                $costoTotal = $productos->sum('precio_compra_producto');
                foreach ($productos as $producto) {
                    $porcentaje = $producto->precio_compra_producto / $costoTotal;
                    $montoUSD = $montoTotalUSD * $porcentaje;
                    $distribuciones[] = [
                        'producto_id' => $producto->id,
                        'monto_usd' => $montoUSD
                    ];
                }
                break;

            case 'igualitario':
                $montoPorProducto = $montoTotalUSD / $productos->count();
                foreach ($productos as $producto) {
                    $distribuciones[] = [
                        'producto_id' => $producto->id,
                        'monto_usd' => $montoPorProducto
                    ];
                }
                break;

            case 'manual':
                foreach ($distribucionManual as $item) {
                    $distribuciones[] = [
                        'producto_id' => $item['producto_id'],
                        'monto_usd' => $item['monto_usd']
                    ];
                }
                $sumaManual = collect($distribucionManual)->sum('monto_usd');
                if (abs($sumaManual - $montoTotalUSD) > 0.01) {
                    throw new \Exception("La distribución manual no coincide con el monto total.");
                }
                break;
        }

        return $distribuciones;
    }
}
