<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\Cuenta;
use App\Models\Producto;
use App\Models\TasaCambio;
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

        $cuentas = Cuenta::all();

        $tasaCambioActual = TasaCambio::latest('fecha_actualizacion')->first();

        return Inertia::render('Transacciones/Index', [
            'compras' => $compras,
            'cuentas' => $cuentas,
            'tasaCambioActual' => $tasaCambioActual ? $tasaCambioActual->tasa : 0,
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

        $cuentas = Cuenta::where('tipo_moneda', 'CUP')->get();
        $tasaCambioActual = TasaCambio::latest('fecha_actualizacion')->first();

        return Inertia::render('Transacciones/CambiarCostoManual', [
            'compra' => $compra,
            'cuentas' => $cuentas,
            'tasaCambioActual' => $tasaCambioActual ? $tasaCambioActual->tasa : 0,
        ]);
    }

    /**
     * Procesa la distribución manual de costos CON MANEJO DE SOBRANTES.
     */
    public function distribuirCostosManual(DistribuirCostosManualRequest $request)
    {
        $validatedData = $request->validated();

        DB::beginTransaction();

        try {
            // === 1. OBTENER RECURSOS NECESARIOS ===
            $compra = Compra::with('productos')->findOrFail($validatedData['purchase_id']);
            $cuenta = Cuenta::findOrFail($validatedData['account_id']);

            // === 2. VALIDACIONES DE NEGOCIO ===
            if ($cuenta->tipo_cuenta === 'deudas') {
                DB::rollBack();
                return redirect()->back()->with('error', 'No se puede usar una cuenta de deudas para esta operación.');
            }

            $tasaCambioModel = TasaCambio::latest('fecha_actualizacion')->first();
            $tasa_cambio = $validatedData['exchange_rate'] ?? ($tasaCambioModel ? $tasaCambioModel->tasa : 0);

            if (!$tasa_cambio || $tasa_cambio == 0) {
                DB::rollBack();
                return redirect()->back()->with('error', 'La tasa de cambio actual no está definida o es cero.');
            }

            $totalCupDistribuir = (float)$validatedData['amount_cup'];
            $totalUsdDisponible = $totalCupDistribuir / $tasa_cambio;

            if ($cuenta->saldo_cuenta < $totalCupDistribuir) {
                DB::rollBack();
                return redirect()->back()->with('error', 'El saldo en la cuenta de origen es insuficiente.');
            }

            // === 3. CREAR REGISTRO DE DISTRIBUCIÓN ===
            $distribution = CostDistribution::create([
                'purchase_id' => $validatedData['purchase_id'],
                'account_id' => $validatedData['account_id'],
                'amount_cup' => $totalCupDistribuir,
                'amount_usd' => $totalUsdDisponible,
                'exchange_rate' => $tasa_cambio,
                'details' => $validatedData['details'],
                'remaining_amount_usd' => 0, // Inicialmente en 0
                'remaining_amount_cup' => 0, // Inicialmente en 0
            ]);

            // === 4. DISTRIBUIR A PRODUCTOS Y CALCULAR TOTAL DISTRIBUIDO ===
            $totalUsdDistribuidoProductos = 0;

            foreach ($validatedData['productos'] as $productoData) {
                if ((float)$productoData['amount_usd'] > 0) {
                    $producto = Producto::findOrFail($productoData['product_id']);
                    $pivotData = $compra->productos->find($producto->id)->pivot;

                    $cantidad = $pivotData->cantidad;
                    $costoActual = $producto->precio_compra_producto;
                    $incrementoUnitario = (float)$productoData['amount_usd'];
                    $nuevoCosto = $costoActual + $incrementoUnitario;

                    // Registrar item de distribución
                    CostDistributionItem::create([
                        'cost_distribution_id' => $distribution->id,
                        'product_id' => $producto->id,
                        'quantity' => $cantidad,
                        'distributed_amount_usd' => $productoData['amount_usd'],
                        'old_cost_usd' => $costoActual,
                        'new_cost_usd' => $nuevoCosto,
                    ]);

                    // Guardar historial de costo
                    CostoHistorial::create([
                        'product_id' => $producto->id,
                        'old_cost_usd' => $costoActual,
                        'new_cost_usd' => $nuevoCosto,
                        'cost_distribution_id' => $distribution->id,
                        'comentario' => 'Ajuste por distribución manual de costos.',
                    ]);

                    // Actualizar costo del producto
                    $producto->update(['precio_compra_producto' => $nuevoCosto]);

                    // Acumular total distribuido
                    $totalUsdDistribuidoProductos += (float)$productoData['amount_usd'];
                }
            }

            // === 5. 🆕 CALCULAR Y MANEJAR SOBRANTE ===
            $totalUsdSobrante = $totalUsdDisponible - $totalUsdDistribuidoProductos;
            $totalCupSobrante = $totalUsdSobrante * $tasa_cambio;

            // Actualizar la distribución con los sobrantes calculados
            $distribution->update([
                'remaining_amount_usd' => $totalUsdSobrante,
                'remaining_amount_cup' => $totalCupSobrante,
            ]);

            // === 6. REGISTRAR MOVIMIENTOS FINANCIEROS ===

            // Movimiento 1: Gasto por lo distribuido a productos
            if ($totalUsdDistribuidoProductos > 0) {
                $montoCupProductos = $totalUsdDistribuidoProductos * $tasa_cambio;

                MovimientoFinanciero::create([
                    'tipo_movimiento_id' => 1, // Gasto
                    'cuenta_origen_id' => $cuenta->id,
                    'cuenta_destino_id' => null,
                    'monto' => $montoCupProductos,
                    'moneda' => 'CUP',
                    'tasa_cambio_aplicada' => $tasa_cambio,
                    'descripcion' => $validatedData['details'] . ' - Distribución costos productos compra #' . $compra->id,
                    'fecha_operacion' => now(),
                    'estado' => 'completado',
                ]);
            }

            // Movimiento 2: Gasto por el sobrante no distribuido
            if ($totalUsdSobrante > 0.01) { // Solo si el sobrante es significativo
                MovimientoFinanciero::create([
                    'tipo_movimiento_id' => 1, // Gasto
                    'cuenta_origen_id' => $cuenta->id,
                    'cuenta_destino_id' => null,
                    'monto' => $totalCupSobrante,
                    'moneda' => 'CUP',
                    'tasa_cambio_aplicada' => $tasa_cambio,
                    'descripcion' => $validatedData['details'] . ' - Sobrante no distribuido compra #' . $compra->id,
                    'fecha_operacion' => now(),
                    'estado' => 'completado',
                ]);
            }

            // === 7. ACTUALIZAR SALDOS ===
            $cuenta->decrement('saldo_cuenta', $totalCupDistribuir);

            // === 8. MENSAJE INFORMATIVO ===
            if ($totalUsdSobrante > 0.01) {
                $mensajeExito = 'Costos distribuidos manualmente con éxito. Se registró un sobrante de ' .
                    number_format($totalUsdSobrante, 2) . ' USD (' .
                    number_format($totalCupSobrante, 2) . ' CUP) como gasto directo.';
            } else {
                $mensajeExito = 'Costos distribuidos manualmente con éxito.';
            }

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
    // === MÉTODOS DE REGISTRO DE MOVIMIENTOS FINANCIEROS ===
    // =======================================================

    /**
     * Registrar Gasto
     */
    public function gastar(Request $request)
    {
        $request->validate([
            'cuenta_origen_id' => 'required|exists:cuentas,id',
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|string|in:USD,EUR,CUP',
            'comentario' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();

        try {
            $cuenta = Cuenta::lockForUpdate()->find($request->cuenta_origen_id);

            if ($cuenta->saldo_cuenta < $request->monto) {
                throw new \Exception('Saldo insuficiente para el gasto.');
            }

            $cuenta->saldo_cuenta -= $request->monto;
            $cuenta->save();

            MovimientoFinanciero::create([
                'tipo_movimiento_id' => 1,
                'cuenta_origen_id' => $request->cuenta_origen_id,
                'cuenta_destino_id' => null,
                'monto' => $request->monto,
                'moneda' => $request->moneda,
                'descripcion' => $request->comentario ?? 'Gasto registrado',
                'fecha_operacion' => now(),
                'estado' => 'completado',
            ]);

            DB::commit();

            return Redirect::back()->with('success', "✅ Gasto de {$request->monto} {$request->moneda} registrado con éxito. Nuevo saldo: {$cuenta->saldo_cuenta}");

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar gasto: ' . $e->getMessage());
            return Redirect::back()->with('error', '❌ Error al registrar el gasto: ' . $e->getMessage());
        }
    }

    /**
     * Registrar Ingreso
     */
    public function ingresar(Request $request)
    {
        $request->validate([
            'cuenta_destino_id' => 'required|exists:cuentas,id',
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|string|in:USD,EUR,CUP',
            'comentario' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();

        try {
            $cuenta = Cuenta::lockForUpdate()->find($request->cuenta_destino_id);

            $cuenta->saldo_cuenta += $request->monto;
            $cuenta->save();

            MovimientoFinanciero::create([
                'tipo_movimiento_id' => 2,
                'cuenta_origen_id' => null,
                'cuenta_destino_id' => $request->cuenta_destino_id,
                'monto' => $request->monto,
                'moneda' => $request->moneda,
                'descripcion' => $request->comentario ?? 'Ingreso registrado',
                'fecha_operacion' => now(),
                'estado' => 'completado',
            ]);

            DB::commit();

            return Redirect::back()->with('success', "✅ Ingreso de {$request->monto} {$request->moneda} registrado con éxito. Nuevo saldo: {$cuenta->saldo_cuenta}");

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar ingreso: ' . $e->getMessage());
            return Redirect::back()->with('error', '❌ Error al registrar el ingreso: ' . $e->getMessage());
        }
    }

    /**
     * Registrar Transferencia
     */
    public function transferir(Request $request)
    {
        $request->validate([
            'cuenta_origen_id' => 'required|exists:cuentas,id',
            'cuenta_destino_id' => 'required|exists:cuentas,id|different:cuenta_origen_id',
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|string|in:USD,EUR,CUP',
            'comentario' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();

        try {
            $cuentaOrigen = Cuenta::lockForUpdate()->find($request->cuenta_origen_id);
            $cuentaDestino = Cuenta::lockForUpdate()->find($request->cuenta_destino_id);

            if (!$cuentaOrigen || !$cuentaDestino) {
                throw new \Exception('Una de las cuentas no existe.');
            }

            if ($cuentaOrigen->saldo_cuenta < $request->monto) {
                throw new \Exception('Saldo insuficiente para la transferencia.');
            }

            $cuentaOrigen->saldo_cuenta -= $request->monto;
            $cuentaOrigen->save();

            $cuentaDestino->saldo_cuenta += $request->monto;
            $cuentaDestino->save();

            MovimientoFinanciero::create([
                'tipo_movimiento_id' => 3,
                'cuenta_origen_id' => $request->cuenta_origen_id,
                'cuenta_destino_id' => $request->cuenta_destino_id,
                'monto' => $request->monto,
                'moneda' => $request->moneda,
                'descripcion' => $request->comentario ?? 'Transferencia entre cuentas',
                'fecha_operacion' => now(),
                'estado' => 'completado',
            ]);

            DB::commit();

            return Redirect::back()->with('success', "✅ Transferencia de {$request->monto} {$request->moneda} registrada con éxito. Nuevo saldo origen: {$cuentaOrigen->saldo_cuenta}, Nuevo saldo destino: {$cuentaDestino->saldo_cuenta}");

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar transferencia: ' . $e->getMessage());
            return Redirect::back()->with('error', '❌ Error al registrar la transferencia: ' . $e->getMessage());
        }
    }
}
