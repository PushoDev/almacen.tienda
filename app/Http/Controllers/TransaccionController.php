<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\Cuenta;
use App\Models\Cliente;
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
        $clientes = Cliente::all();

        $tasaCambioActual = TasaCambio::latest('fecha_actualizacion')->first();

        return Inertia::render('Transacciones/Index', [
            'compras' => $compras,
            'cuentas' => $cuentas,
            'clientes' => $clientes,
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
     * Procesa la distribución manual de costos (solo con cuentas).
     */
    public function distribuirCostosManual(DistribuirCostosManualRequest $request)
    {
        $validatedData = $request->validated();

        DB::beginTransaction();

        try {
            $compra = Compra::with('productos')->findOrFail($validatedData['purchase_id']);
            $cuenta = Cuenta::findOrFail($validatedData['account_id']);

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
                    'cuenta_destino_id' => null,
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
                    'cuenta_destino_id' => null,
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
    // === MÉTODOS DE REGISTRO DE MOVIMIENTOS FINANCIEROS ===
    // =======================================================

    /**
     * Registrar Gasto (Cuenta o Cliente)
     */
    public function gastar(Request $request)
    {
        $request->validate([
            'origen_tipo' => 'required|string|in:cuenta,cliente',
            'origen_id' => 'required|integer',
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|string|in:USD,EUR,CUP',
            'comentario' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();

        try {
            if ($request->origen_tipo === 'cuenta') {
                $origen = Cuenta::lockForUpdate()->findOrFail($request->origen_id);
                if ($origen->saldo_cuenta < $request->monto) {
                    throw new \Exception('Saldo insuficiente en la cuenta.');
                }
                $origen->decrement('saldo_cuenta', $request->monto);

                MovimientoFinanciero::create([
                    'tipo_movimiento_id' => 1,
                    'cuenta_origen_id' => $origen->id,
                    'cuenta_destino_id' => null,
                    'monto' => $request->monto,
                    'moneda' => $request->moneda,
                    'descripcion' => $request->comentario ?? "Gasto desde cuenta: {$origen->nombre_cuenta}",
                    'fecha_operacion' => now(),
                    'estado' => 'completado',
                ]);
            } else {
                $origen = Cliente::lockForUpdate()->findOrFail($request->origen_id);
                if ($origen->deuda_pago_cliente < $request->monto) {
                    throw new \Exception('Saldo insuficiente en el cliente.');
                }
                $origen->decrement('deuda_pago_cliente', $request->monto);

                MovimientoFinanciero::create([
                    'tipo_movimiento_id' => 1,
                    'cuenta_origen_id' => null,
                    'cuenta_destino_id' => null,
                    'monto' => $request->monto,
                    'moneda' => $request->moneda,
                    'descripcion' => $request->comentario ?? "Gasto desde cliente: {$origen->nombre_cliente}",
                    'fecha_operacion' => now(),
                    'estado' => 'completado',
                ]);
            }

            DB::commit();
            return Redirect::back()->with('success', "✅ Gasto de {$request->monto} {$request->moneda} registrado con éxito.");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar gasto: ' . $e->getMessage());
            return Redirect::back()->with('error', '❌ Error al registrar el gasto: ' . $e->getMessage());
        }
    }

    /**
     * Registrar Ingreso (Cuenta o Cliente)
     */
    public function ingresar(Request $request)
    {
        $request->validate([
            'destino_tipo' => 'required|string|in:cuenta,cliente',
            'destino_id' => 'required|integer',
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|string|in:USD,EUR,CUP',
            'comentario' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();

        try {
            if ($request->destino_tipo === 'cuenta') {
                $destino = Cuenta::lockForUpdate()->findOrFail($request->destino_id);
                $destino->increment('saldo_cuenta', $request->monto);

                MovimientoFinanciero::create([
                    'tipo_movimiento_id' => 2,
                    'cuenta_origen_id' => null,
                    'cuenta_destino_id' => $destino->id,
                    'monto' => $request->monto,
                    'moneda' => $request->moneda,
                    'descripcion' => $request->comentario ?? "Ingreso a cuenta: {$destino->nombre_cuenta}",
                    'fecha_operacion' => now(),
                    'estado' => 'completado',
                ]);
            } else {
                $destino = Cliente::lockForUpdate()->findOrFail($request->destino_id);
                $destino->increment('deuda_pago_cliente', $request->monto);

                MovimientoFinanciero::create([
                    'tipo_movimiento_id' => 2,
                    'cuenta_origen_id' => null,
                    'cuenta_destino_id' => null,
                    'monto' => $request->monto,
                    'moneda' => $request->moneda,
                    'descripcion' => $request->comentario ?? "Ingreso a cliente: {$destino->nombre_cliente}",
                    'fecha_operacion' => now(),
                    'estado' => 'completado',
                ]);
            }

            DB::commit();
            return Redirect::back()->with('success', "✅ Ingreso de {$request->monto} {$request->moneda} registrado con éxito.");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar ingreso: ' . $e->getMessage());
            return Redirect::back()->with('error', '❌ Error al registrar el ingreso: ' . $e->getMessage());
        }
    }

    /**
     * Registrar Transferencia (Cuenta ↔ Cliente)
     */
    public function transferir(Request $request)
    {
        $request->validate([
            'origen_tipo' => 'required|string|in:cuenta,cliente',
            'origen_id' => 'required|integer',
            'destino_tipo' => 'required|string|in:cuenta,cliente|different:origen_tipo,origen_id',
            'destino_id' => 'required|integer',
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|string|in:USD,EUR,CUP',
            'comentario' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();

        try {
            // Origen
            if ($request->origen_tipo === 'cuenta') {
                $origen = Cuenta::lockForUpdate()->findOrFail($request->origen_id);
                if ($origen->saldo_cuenta < $request->monto) {
                    throw new \Exception('Saldo insuficiente en la cuenta origen.');
                }
                $origen->decrement('saldo_cuenta', $request->monto);
            } else {
                $origen = Cliente::lockForUpdate()->findOrFail($request->origen_id);
                if ($origen->deuda_pago_cliente < $request->monto) {
                    throw new \Exception('Saldo insuficiente en el cliente origen.');
                }
                $origen->decrement('deuda_pago_cliente', $request->monto);
            }

            // Destino
            if ($request->destino_tipo === 'cuenta') {
                $destino = Cuenta::lockForUpdate()->findOrFail($request->destino_id);
                $destino->increment('saldo_cuenta', $request->monto);
            } else {
                $destino = Cliente::lockForUpdate()->findOrFail($request->destino_id);
                $destino->increment('deuda_pago_cliente', $request->monto);
            }

            MovimientoFinanciero::create([
                'tipo_movimiento_id' => 3,
                'cuenta_origen_id' => $request->origen_tipo === 'cuenta' ? $origen->id : null,
                'cuenta_destino_id' => $request->destino_tipo === 'cuenta' ? $destino->id : null,
                'monto' => $request->monto,
                'moneda' => $request->moneda,
                'descripcion' => $request->comentario ?? "Transferencia de {$request->origen_tipo} a {$request->destino_tipo}",
                'fecha_operacion' => now(),
                'estado' => 'completado',
            ]);

            DB::commit();
            return Redirect::back()->with('success', "✅ Transferencia de {$request->monto} {$request->moneda} registrada con éxito.");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar transferencia: ' . $e->getMessage());
            return Redirect::back()->with('error', '❌ Error al registrar la transferencia: ' . $e->getMessage());
        }
    }
}
