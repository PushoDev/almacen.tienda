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
use App\Http\Controllers\ProductoVendedorController;

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
            ->get();

        // ✅ Filtrar cuentas según el rol del usuario
        if (auth()->user()->role === 'vendedor') {
            $cuentas = auth()->user()->cuentas()->with('moneda')->get();
        } else {
            $cuentas = Cuenta::with('moneda')->get();
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
            'cuentas' => $cuentas,
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
                    $pivotData = $compra->productos->find($producto->id)->pivot;

                    $cantidad = $pivotData->cantidad;
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
    // === LÓGICA MODERNA DE TASAS DE CAMBIO CON MONEDAS ===
    // =======================================================

    /**
     * Obtiene la moneda principal del sistema
     */
    private function obtenerMonedaPrincipal(): Moneda
    {
        $monedaPrincipal = Moneda::where('principal', true)
            ->where('estado', true)
            ->first();

        if (!$monedaPrincipal) {
            throw new \Exception('No hay una moneda principal definida en el sistema.');
        }

        return $monedaPrincipal;
    }

    /**
     * Obtiene una moneda por su código (puede haber múltiples con mismo código)
     */
    private function obtenerMonedaPorCodigo(string $codigo): Moneda
    {
        $moneda = Moneda::where('codigo_moneda', $codigo)
            ->where('estado', true)
            ->orderBy('tasa_cambio', 'desc')
            ->first();

        if (!$moneda) {
            throw new \Exception("La moneda {$codigo} no está disponible o no existe.");
        }

        return $moneda;
    }

    /**
     * Obtiene códigos de monedas activas para validación
     */
    private function obtenerCodigosMonedasActivas(): array
    {
        return Moneda::where('estado', true)
            ->pluck('codigo_moneda')
            ->unique()
            ->toArray();
    }

    /**
     * Lógica moderna para obtener la tasa de cambio a aplicar
     */
    private function resolveTasaCambio(Request $request): ?float
    {
        $monedaPrincipal = $this->obtenerMonedaPrincipal();

        // Si la moneda de la transacción es la principal, no necesita conversión
        if ($request->moneda === $monedaPrincipal->codigo_moneda) {
            return 1.0;
        }

        // 1. Usar la tasa enviada por el usuario si existe y es válida
        if ($request->filled('tasa_cambio_aplicada') && $request->tasa_cambio_aplicada > 0) {
            return (float)$request->tasa_cambio_aplicada;
        }

        // 2. Obtener la tasa de cambio desde la tabla 'monedas'
        try {
            $monedaTransaccion = $this->obtenerMonedaPorCodigo($request->moneda);
            $tasaCambio = $monedaTransaccion->tasa_cambio;

            if ($tasaCambio <= 0) {
                throw new \Exception("La tasa de cambio para {$request->moneda} no es válida.");
            }

            return $tasaCambio;
        } catch (\Exception $e) {
            throw new \Exception('No se puede procesar la transacción: ' . $e->getMessage());
        }
    }

    // =======================================================
    // === MÉTODOS DE MOVIMIENTOS FINANCIEROS ACTUALIZADOS ===
    // =======================================================

    /**
     * Registrar Gasto (Cuenta o Cliente)
     */
    public function gastar(Request $request)
    {
        $monedasValidas = $this->obtenerCodigosMonedasActivas();

        $request->validate([
            'origen_tipo' => 'required|string|in:cuenta,cliente',
            'origen_id' => 'required|integer',
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|string|in:' . implode(',', $monedasValidas),
            'comentario' => 'nullable|string|max:255',
            'tasa_cambio_aplicada' => 'nullable|numeric|min:0.0001',
        ]);

        DB::beginTransaction();

        try {
            $tasaCambioAplicada = $this->resolveTasaCambio($request);

            $movimientoData = [
                'user_id' => auth()->id(),
                'tipo_movimiento_id' => 1,
                'monto' => $request->monto,
                'moneda' => $request->moneda,
                'tasa_cambio_aplicada' => $tasaCambioAplicada,
                'descripcion' => $request->comentario,
                'fecha_operacion' => now(),
                'estado' => 'completado',
                'cuenta_origen_id' => null,
                'cliente_origen_id' => null,
                'cuenta_destino_id' => null,
                'cliente_destino_id' => null,
                'proveedor_destino_id' => null,
            ];

            if ($request->origen_tipo === 'cuenta') {
                $origen = Cuenta::with('moneda')->lockForUpdate()->findOrFail($request->origen_id);

                // ✅ Validar que el vendedor tenga acceso a esta cuenta
                if (auth()->user()->role === 'vendedor') {
                    $cuentasAsignadas = auth()->user()->cuentas()->pluck('id')->toArray();
                    if (!in_array($origen->id, $cuentasAsignadas)) {
                        throw new \Exception('No tiene permiso para operar con esta cuenta.');
                    }
                }

                // ✅ Validar que la moneda de la cuenta coincida
                if ($origen->moneda->codigo_moneda !== $request->moneda) {
                    throw new \Exception("La moneda de la cuenta ({$origen->moneda->codigo_moneda}) no coincide con la transacción ({$request->moneda}).");
                }

                if ($origen->saldo_cuenta < $request->monto) {
                    throw new \Exception('Saldo insuficiente en la cuenta.');
                }
                $origen->decrement('saldo_cuenta', $request->monto);

                $movimientoData['cuenta_origen_id'] = $origen->id;
                $movimientoData['descripcion'] = $request->comentario ?? "Gasto desde cuenta: {$origen->nombre_cuenta}";
            } else {
                $origen = Cliente::lockForUpdate()->findOrFail($request->origen_id);
                $origen->decrement('deuda_pago_cliente', $request->monto);

                $movimientoData['cliente_origen_id'] = $origen->id;
                $movimientoData['descripcion'] = $request->comentario ?? "Gasto desde cliente: {$origen->nombre_cliente}";
            }

            MovimientoFinanciero::create($movimientoData);

            DB::commit();
            return Redirect::back()->with('success', "✅ Gasto de {$request->monto} {$request->moneda} registrado con éxito.");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar gasto: ' . $e->getMessage());
            return Redirect::back()->with('error', '❌ Error al registrar el gasto: ' . $e->getMessage());
        }
    }

    /**
     * Registrar Ingreso (Cuenta, Cliente o Proveedor)
     */
    public function ingresar(Request $request)
    {
        $monedasValidas = $this->obtenerCodigosMonedasActivas();

        $request->validate([
            'destino_tipo' => 'required|string|in:cuenta,cliente,proveedor',
            'destino_id' => 'required|integer',
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|string|in:' . implode(',', $monedasValidas),
            'comentario' => 'nullable|string|max:255',
            'tasa_cambio_aplicada' => 'nullable|numeric|min:0.0001',
        ]);

        DB::beginTransaction();

        try {
            $tasaCambioAplicada = $this->resolveTasaCambio($request);

            $movimientoData = [
                'user_id' => auth()->id(),
                'tipo_movimiento_id' => 2,
                'monto' => $request->monto,
                'moneda' => $request->moneda,
                'tasa_cambio_aplicada' => $tasaCambioAplicada,
                'descripcion' => $request->comentario,
                'fecha_operacion' => now(),
                'estado' => 'completado',
                'cuenta_origen_id' => null,
                'cliente_origen_id' => null,
                'cuenta_destino_id' => null,
                'cliente_destino_id' => null,
                'proveedor_destino_id' => null,
            ];

            if ($request->destino_tipo === 'cuenta') {
                $destino = Cuenta::with('moneda')->lockForUpdate()->findOrFail($request->destino_id);

                // ✅ Validar que el vendedor tenga acceso a esta cuenta
                if (auth()->user()->role === 'vendedor') {
                    $cuentasAsignadas = auth()->user()->cuentas()->pluck('id')->toArray();
                    if (!in_array($destino->id, $cuentasAsignadas)) {
                        throw new \Exception('No tiene permiso para operar con esta cuenta.');
                    }
                }

                // ✅ Validar que la moneda de la cuenta coincida
                if ($destino->moneda->codigo_moneda !== $request->moneda) {
                    throw new \Exception("La moneda de la cuenta ({$destino->moneda->codigo_moneda}) no coincide con la transacción ({$request->moneda}).");
                }

                $destino->increment('saldo_cuenta', $request->monto);

                $movimientoData['cuenta_destino_id'] = $destino->id;
                $movimientoData['descripcion'] = $request->comentario ?? "Ingreso a cuenta: {$destino->nombre_cuenta}";
            } else if ($request->destino_tipo === 'cliente') {
                $destino = Cliente::lockForUpdate()->findOrFail($request->destino_id);
                $destino->increment('deuda_pago_cliente', $request->monto);

                $movimientoData['cliente_destino_id'] = $destino->id;
                $movimientoData['descripcion'] = $request->comentario ?? "Ingreso a cliente: {$destino->nombre_cliente}";
            } else {
                // ✅ NUEVO: Manejo de proveedores
                $destino = Proveedor::lockForUpdate()->findOrFail($request->destino_id);
                $destino->increment('saldo_proveedor', $request->monto);

                $movimientoData['proveedor_destino_id'] = $destino->id;
                $movimientoData['descripcion'] = $request->comentario ?? "Ingreso a proveedor: {$destino->nombre_proveedor}";
            }

            MovimientoFinanciero::create($movimientoData);

            DB::commit();
            return Redirect::back()->with('success', "✅ Ingreso de {$request->monto} {$request->moneda} registrado con éxito.");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar ingreso: ' . $e->getMessage());
            return Redirect::back()->with('error', '❌ Error al registrar el ingreso: ' . $e->getMessage());
        }
    }

    /**
     * Registrar Transferencia (Cuenta ↔ Cliente ↔ Proveedor) con soporte multi-moneda
     */
    public function transferir(Request $request)
    {
        $monedasValidas = $this->obtenerCodigosMonedasActivas();

        $request->validate([
            'origen_tipo' => 'required|string|in:cuenta,cliente',
            'origen_id' => 'required|integer',
            'destino_tipo' => 'required|string|in:cuenta,cliente,proveedor',
            'destino_id' => 'required|integer',
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|string|in:' . implode(',', $monedasValidas),
            'comentario' => 'nullable|string|max:255',
            'tasa_cambio_aplicada' => 'nullable|numeric|min:0.0001',
        ]);

        if ($request->origen_tipo === $request->destino_tipo && (int)$request->origen_id === (int)$request->destino_id) {
            return Redirect::back()->withErrors([
                'destino_id' => 'El origen y el destino no pueden ser la misma entidad.'
            ])->withInput();
        }

        DB::beginTransaction();

        try {
            // Obtener entidades con sus monedas
            $origen = $this->obtenerEntidadConMoneda($request->origen_tipo, $request->origen_id);
            $destino = $this->obtenerEntidadConMoneda($request->destino_tipo, $request->destino_id);

            // Validar acceso para vendedores
            $this->validarAccesoVendedor($origen, $request->origen_tipo);
            $this->validarAccesoVendedor($destino, $request->destino_tipo);

            // Obtener monedas
            $monedaOrigen = $this->obtenerMonedaEntidad($origen, $request->origen_tipo);
            $monedaDestino = $this->obtenerMonedaEntidad($destino, $request->destino_tipo);

            // Validar que la moneda del origen coincida con la transacción
            if ($monedaOrigen->codigo_moneda !== $request->moneda) {
                throw new \Exception("La moneda del origen ({$monedaOrigen->codigo_moneda}) no coincide con la moneda de la transacción ({$request->moneda}).");
            }

            // Calcular tasas de cambio y montos convertidos
            $montoOrigen = (float)$request->monto;
            $montoDestino = $this->calcularMontoConvertido($montoOrigen, $monedaOrigen, $monedaDestino, $request->tasa_cambio_aplicada, $request->origen_tipo, $request->destino_tipo);
            $tasaCambioAplicada = $this->obtenerTasaCambioFinal($monedaOrigen, $monedaDestino, $request->tasa_cambio_aplicada, $request->origen_tipo, $request->destino_tipo);

            // Validar saldo suficiente
            $this->validarSaldoOrigen($origen, $request->origen_tipo, $montoOrigen);

            // Validar límite máximo para el destino
            $this->validarLimiteDestino($destino, $request->destino_tipo, $montoDestino, $monedaDestino);

            // Realizar débito en origen
            $this->realizarDebito($origen, $request->origen_tipo, $montoOrigen);

            // Realizar crédito en destino
            $this->realizarCredito($destino, $request->destino_tipo, $montoDestino);

            // Obtener nombres para descripción
            $origenNombre = $this->obtenerNombreEntidad($origen, $request->origen_tipo);
            $destinoNombre = $this->obtenerNombreEntidad($destino, $request->destino_tipo);

            // Crear movimiento financiero
            MovimientoFinanciero::create([
                'user_id' => auth()->id(),
                'tipo_movimiento_id' => 3,
                'cuenta_origen_id' => $request->origen_tipo === 'cuenta' ? $origen->id : null,
                'cliente_origen_id' => $request->origen_tipo === 'cliente' ? $origen->id : null,
                'cuenta_destino_id' => $request->destino_tipo === 'cuenta' ? $destino->id : null,
                'cliente_destino_id' => $request->destino_tipo === 'cliente' ? $destino->id : null,
                'proveedor_destino_id' => $request->destino_tipo === 'proveedor' ? $destino->id : null,
                'monto' => $montoOrigen,
                'moneda' => $request->moneda,
                'tasa_cambio_aplicada' => $tasaCambioAplicada,
                'descripcion' => $request->comentario ?? "Transferencia: {$montoOrigen} {$monedaOrigen->codigo_moneda} → {$montoDestino} {$monedaDestino->codigo_moneda} ({$origenNombre} → {$destinoNombre})",
                'fecha_operacion' => now(),
                'estado' => 'completado',
            ]);

            DB::commit();

            $mensajeExito = $monedaOrigen->codigo_moneda === $monedaDestino->codigo_moneda
                ? "✅ Transferencia de {$montoOrigen} {$monedaOrigen->codigo_moneda} registrada con éxito."
                : "✅ Transferencia de {$montoOrigen} {$monedaOrigen->codigo_moneda} → {$montoDestino} {$monedaDestino->codigo_moneda} registrada con éxito (Tasa: {$tasaCambioAplicada}).";

            return Redirect::back()->with('success', $mensajeExito);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar transferencia: ' . $e->getMessage());
            return Redirect::back()->with('error', '❌ Error al registrar la transferencia: ' . $e->getMessage());
        }
    }

    // =======================================================
    // === MÉTODOS AUXILIARES PARA TRANSFERENCIAS MULTI-MONEDA ===
    // =======================================================

    /**
     * Obtiene la entidad con su moneda cargada
     */
    private function obtenerEntidadConMoneda(string $tipo, int $id)
    {
        switch ($tipo) {
            case 'cuenta':
                return Cuenta::with('moneda')->lockForUpdate()->findOrFail($id);
            case 'cliente':
                return Cliente::lockForUpdate()->findOrFail($id);
            case 'proveedor':
                return Proveedor::lockForUpdate()->findOrFail($id);
            default:
                throw new \Exception("Tipo de entidad no válido: {$tipo}");
        }
    }

    /**
     * Obtiene la moneda de una entidad
     */
    private function obtenerMonedaEntidad($entidad, string $tipo): Moneda
    {
        switch ($tipo) {
            case 'cuenta':
                return $entidad->moneda;
            case 'cliente':
            case 'proveedor':
                // Clientes y proveedores operan siempre en USD
                return $this->obtenerMonedaPorCodigo('USD');
            default:
                throw new \Exception("Tipo de entidad no válido para obtener moneda: {$tipo}");
        }
    }

    /**
     * Valida que el vendedor tenga acceso a la entidad
     */
    private function validarAccesoVendedor($entidad, string $tipo): void
    {
        if (auth()->user()->role === 'vendedor' && $tipo === 'cuenta') {
            $cuentasAsignadas = auth()->user()->cuentas()->pluck('id')->toArray();
            if (!in_array($entidad->id, $cuentasAsignadas)) {
                throw new \Exception('No tiene permiso para operar con esta cuenta.');
            }
        }
    }

    /**
     * Valida que el monto no exceda el límite máximo permitido para el destino
     */
    private function validarLimiteDestino($entidad, string $tipo, float $montoDestino, Moneda $monedaDestino): void
    {
        switch ($tipo) {
            case 'cuenta':
                // Límite máximo para cuentas: 1,000,000 de su moneda
                $limiteMaximoCuenta = 1000000;
                $saldoActual = (float)$entidad->saldo_cuenta;
                $saldoDespuesDeTransferencia = $saldoActual + $montoDestino;
                
                if ($saldoDespuesDeTransferencia > $limiteMaximoCuenta) {
                    throw new \Exception("La transferencia excedería el saldo máximo permitido para esta cuenta. Límite: {$limiteMaximoCuenta} {$monedaDestino->codigo_moneda}, Saldo actual: {$saldoActual}, Saldo después: {$saldoDespuesDeTransferencia} {$monedaDestino->codigo_moneda}");
                }
                break;

            case 'cliente':
                // Límite máximo para clientes: 50,000 USD
                $limiteMaximoCliente = 50000;
                $saldoActual = (float)$entidad->deuda_pago_cliente;
                $saldoDespuesDeTransferencia = $saldoActual + $montoDestino;
                
                if ($saldoDespuesDeTransferencia > $limiteMaximoCliente) {
                    throw new \Exception("La transferencia excedería el límite máximo permitido para este cliente. Límite: {$limiteMaximoCliente} USD, Saldo actual: {$saldoActual}, Saldo después: {$saldoDespuesDeTransferencia} USD");
                }
                break;

            case 'proveedor':
                // Límite máximo para proveedores: 100,000 USD
                $limiteMaximoProveedor = 100000;
                $saldoActual = (float)$entidad->saldo_proveedor;
                $saldoDespuesDeTransferencia = $saldoActual + $montoDestino;
                
                if ($saldoDespuesDeTransferencia > $limiteMaximoProveedor) {
                    throw new \Exception("La transferencia excedería el límite máximo permitido para este proveedor. Límite: {$limiteMaximoProveedor} USD, Saldo actual: {$saldoActual}, Saldo después: {$saldoDespuesDeTransferencia} USD");
                }
                break;
        }
    }

    /**
     * Calcula el monto convertido según tasas de cambio y tipos de entidad
     */
    private function calcularMontoConvertido(float $montoOrigen, Moneda $monedaOrigen, Moneda $monedaDestino, ?float $tasaPersonalizada, string $origenTipo, string $destinoTipo): float
    {
        // Clientes y Proveedores siempre operan en USD
        $origenEsCuenta = $origenTipo === 'cuenta';
        $destinoEsCuenta = $destinoTipo === 'cuenta';
        
        // Si son la misma moneda y mismo tipo de entidad, no hay conversión
        if ($monedaOrigen->codigo_moneda === $monedaDestino->codigo_moneda && $origenEsCuenta === $destinoEsCuenta) {
            return $montoOrigen;
        }

        // Si es cliente/proveedor → cliente/proveedor, ambos USD, sin conversión
        if (!$origenEsCuenta && !$destinoEsCuenta) {
            return $montoOrigen;
        }

        // Calcular monto convertido según el tipo de transferencia
        if ($origenEsCuenta && $destinoEsCuenta) {
            // CUENTA → CUENTA: Dividir por tasa de la moneda destino (relativo a USD)
            $tasaDestino = $tasaPersonalizada ?? $monedaDestino->tasa_cambio;
            if ($tasaDestino <= 0) {
                throw new \Exception("La tasa de cambio para {$monedaDestino->codigo_moneda} no es válida.");
            }
            $montoConvertido = $montoOrigen / $tasaDestino;
            
        } elseif ($origenEsCuenta && !$destinoEsCuenta) {
            // CUENTA → CLIENTE/PROVEEDOR: Convertir de moneda cuenta a USD
            $tasaOrigen = $tasaPersonalizada ?? $monedaOrigen->tasa_cambio;
            if ($tasaOrigen <= 0) {
                throw new \Exception("La tasa de cambio para {$monedaOrigen->codigo_moneda} no es válida.");
            }
            $montoConvertido = $montoOrigen / $tasaOrigen;
            
        } elseif (!$origenEsCuenta && $destinoEsCuenta) {
            // CLIENTE/PROVEEDOR → CUENTA: Convertir de USD a moneda cuenta
            $tasaDestino = $tasaPersonalizada ?? $monedaDestino->tasa_cambio;
            if ($tasaDestino <= 0) {
                throw new \Exception("La tasa de cambio para {$monedaDestino->codigo_moneda} no es válida.");
            }
            $montoConvertido = $montoOrigen * $tasaDestino;
            
        } else {
            // Ambos son cliente/proveedor (USD), sin conversión
            $montoConvertido = $montoOrigen;
        }

        // Redondear a 2 decimales
        return round($montoConvertido, 2);
    }

    /**
     * Obtiene la tasa de cambio entre dos monedas
     */
    private function obtenerTasaCambioEntreMonedas(Moneda $monedaOrigen, Moneda $monedaDestino): float
    {
        // Si el origen es USD, la tasa es la de la moneda destino
        if ($monedaOrigen->codigo_moneda === 'USD') {
            return $monedaDestino->tasa_cambio;
        }

        // Si el destino es USD, la tasa es la de la moneda origen
        if ($monedaDestino->codigo_moneda === 'USD') {
            return $monedaOrigen->tasa_cambio;
        }

        // Para otras conversiones, calculamos relativo a USD
        // Ejemplo: CUP → EUR = (CUP/USD) / (EUR/USD)
        return $monedaOrigen->tasa_cambio / $monedaDestino->tasa_cambio;
    }

    /**
     * Obtiene la tasa de cambio final que se aplicará
     */
    private function obtenerTasaCambioFinal(Moneda $monedaOrigen, Moneda $monedaDestino, ?float $tasaPersonalizada, string $origenTipo, string $destinoTipo): float
    {
        // Si son la misma moneda y mismo tipo, tasa es 1.0
        if ($monedaOrigen->codigo_moneda === $monedaDestino->codigo_moneda && $origenTipo === $destinoTipo) {
            return 1.0;
        }

        // Si hay tasa personalizada, usarla
        if ($tasaPersonalizada && $tasaPersonalizada > 0) {
            return $tasaPersonalizada;
        }

        // Determinar qué tasa usar según el tipo de transferencia
        $origenEsCuenta = $origenTipo === 'cuenta';
        $destinoEsCuenta = $destinoTipo === 'cuenta';

        if ($origenEsCuenta && $destinoEsCuenta) {
            // CUENTA → CUENTA: Usar tasa de la moneda destino
            return $monedaDestino->tasa_cambio;
            
        } elseif ($origenEsCuenta && !$destinoEsCuenta) {
            // CUENTA → CLIENTE/PROVEEDOR: Usar tasa de la moneda origen
            return $monedaOrigen->tasa_cambio;
            
        } elseif (!$origenEsCuenta && $destinoEsCuenta) {
            // CLIENTE/PROVEEDOR → CUENTA: Usar tasa de la moneda destino
            return $monedaDestino->tasa_cambio;
            
        } else {
            // CLIENTE/PROVEEDOR → CLIENTE/PROVEEDOR: Ambos USD
            return 1.0;
        }
    }

    /**
     * Valida saldo suficiente en origen
     */
    private function validarSaldoOrigen($entidad, string $tipo, float $monto): void
    {
        switch ($tipo) {
            case 'cuenta':
                if ($entidad->saldo_cuenta < $monto) {
                    throw new \Exception('Saldo insuficiente en la cuenta origen.');
                }
                break;
            case 'cliente':
                $saldoActual = (float)($entidad->deuda_pago_cliente ?? 0);
                if ($saldoActual < $monto) {
                    throw new \Exception('Saldo insuficiente en la cuenta del cliente.');
                }
                break;
        }
    }

    /**
     * Realiza débito en la entidad de origen
     */
    private function realizarDebito($entidad, string $tipo, float $monto): void
    {
        switch ($tipo) {
            case 'cuenta':
                $entidad->decrement('saldo_cuenta', $monto);
                break;
            case 'cliente':
                $entidad->decrement('deuda_pago_cliente', $monto);
                break;
        }
    }

    /**
     * Realiza crédito en la entidad de destino
     */
    private function realizarCredito($entidad, string $tipo, float $monto): void
    {
        switch ($tipo) {
            case 'cuenta':
                $entidad->increment('saldo_cuenta', $monto);
                break;
            case 'cliente':
                $entidad->increment('deuda_pago_cliente', $monto);
                break;
            case 'proveedor':
                $entidad->increment('saldo_proveedor', $monto);
                break;
        }
    }

    /**
     * Obtiene el nombre descriptivo de la entidad
     */
    private function obtenerNombreEntidad($entidad, string $tipo): string
    {
        switch ($tipo) {
            case 'cuenta':
                return "Cuenta: {$entidad->nombre_cuenta}";
            case 'cliente':
                return "Cliente: {$entidad->nombre_cliente}";
            case 'proveedor':
                return "Proveedor: {$entidad->nombre_proveedor}";
            default:
                return "Entidad desconocida";
        }
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
            MovimientoFinanciero::create([
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
    private function distribuirTransportacion(Compra $compra, float $montoTotalUSD, string $tipo, array $distribucionManual = []): array
    {
        $productos = $compra->productos;
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
