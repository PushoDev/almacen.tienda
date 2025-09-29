<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\Cuenta;
use App\Models\Producto;
use App\Models\TasaCambio;
use App\Models\CostDistribution;
use App\Models\CostoHistorial;
use App\Models\MovimientoFinanciero;
use App\Http\Requests\DistribuirCostosManualRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;
use Exception;
use Illuminate\Validation\ValidationException;
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

        // Asumo que tu modelo TasaCambio tiene un método para obtener la tasa
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
     * Procesa la distribución manual de costos.
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

            $totalUsdDistribuido = (float)$validatedData['amount_cup'] / $tasa_cambio;

            if ($cuenta->saldo_cuenta < (float)$validatedData['amount_cup']) {
                DB::rollBack();
                return redirect()->back()->with('error', 'El saldo en la cuenta de origen es insuficiente.');
            }

            $distribution = CostDistribution::create([
                'purchase_id' => $validatedData['purchase_id'],
                'account_id' => $validatedData['account_id'],
                'amount_cup' => $validatedData['amount_cup'],
                'exchange_rate' => $tasa_cambio,
                'amount_usd' => $totalUsdDistribuido,
                'details' => $validatedData['details'],
            ]);

            foreach ($validatedData['productos'] as $productoData) {
                if ((float)$productoData['amount_usd'] > 0) {
                    $producto = Producto::findOrFail($productoData['product_id']);

                    $pivotData = $compra->productos->find($producto->id)->pivot;

                    $cantidad = $pivotData->cantidad;
                    $costoActual = $producto->precio_compra_producto;
                    $incrementoUnitario = (float)$productoData['amount_usd'];
                    $nuevoCosto = $costoActual + $incrementoUnitario;

                    $distribution->items()->create([
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
                }
            }

            $cuenta->decrement('saldo_cuenta', (float)$validatedData['amount_cup']);

            // Registrar movimiento financiero
            MovimientoFinanciero::create([
                'tipo_movimiento_id' => 1, // Asumiendo que 1 es para gastos
                'cuenta_origen_id' => $cuenta->id,
                'cuenta_destino_id' => null,
                'monto' => (float)$validatedData['amount_cup'],
                'moneda' => 'CUP',
                'descripcion' => $validatedData['details'] ?? 'Gasto de distribución de costos por compra #' . $compra->id,
                'fecha_operacion' => now(),
                'estado' => 'completado',
            ]);

            DB::commit();

            return redirect()
                ->route('transacciones')
                ->with('success', 'Costos distribuidos manualmente con éxito.');
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
            // 1. Encontrar y bloquear la cuenta
            $cuenta = Cuenta::lockForUpdate()->find($request->cuenta_origen_id);

            // 2. Verificar saldo y actualizar
            if ($cuenta->saldo_cuenta < $request->monto) {
                throw new \Exception('Saldo insuficiente para el gasto.');
            }

            $cuenta->saldo_cuenta -= $request->monto;
            $cuenta->save();

            // 3. Registrar el movimiento
            MovimientoFinanciero::create([
                'tipo_movimiento_id' => 1, // Asumiendo que 1 es para gastos
                'cuenta_origen_id' => $request->cuenta_origen_id,
                'cuenta_destino_id' => null,
                'monto' => $request->monto,
                'moneda' => $request->moneda,
                'descripcion' => $request->comentario ?? 'Gasto registrado',
                'fecha_operacion' => now(),
                'estado' => 'completado',
            ]);

            DB::commit();

            // CORREGIDO: Usar Redirect en lugar de response()->json
            return Redirect::back()->with('success', "✅ Gasto de {$request->monto} {$request->moneda} registrado con éxito. Nuevo saldo: {$cuenta->saldo_cuenta}");

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar gasto: ' . $e->getMessage());

            // CORREGIDO: Usar Redirect en lugar de response()->json
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
            // 1. Encontrar y bloquear la cuenta
            $cuenta = Cuenta::lockForUpdate()->find($request->cuenta_destino_id);

            // 2. Actualizar saldo (SUMAR)
            $cuenta->saldo_cuenta += $request->monto;
            $cuenta->save();

            // 3. Registrar el movimiento
            MovimientoFinanciero::create([
                'tipo_movimiento_id' => 2, // Asumiendo que 2 es para ingresos
                'cuenta_origen_id' => null,
                'cuenta_destino_id' => $request->cuenta_destino_id,
                'monto' => $request->monto,
                'moneda' => $request->moneda,
                'descripcion' => $request->comentario ?? 'Ingreso registrado',
                'fecha_operacion' => now(),
                'estado' => 'completado',
            ]);

            DB::commit();

            // CORREGIDO: Usar Redirect en lugar de response()->json
            return Redirect::back()->with('success', "✅ Ingreso de {$request->monto} {$request->moneda} registrado con éxito. Nuevo saldo: {$cuenta->saldo_cuenta}");

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar ingreso: ' . $e->getMessage());

            // CORREGIDO: Usar Redirect en lugar de response()->json
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
            // 1. Bloquear ambas cuentas
            $cuentaOrigen = Cuenta::lockForUpdate()->find($request->cuenta_origen_id);
            $cuentaDestino = Cuenta::lockForUpdate()->find($request->cuenta_destino_id);

            if (!$cuentaOrigen || !$cuentaDestino) {
                throw new \Exception('Una de las cuentas no existe.');
            }

            // 2. Validación de saldo en origen
            if ($cuentaOrigen->saldo_cuenta < $request->monto) {
                throw new \Exception('Saldo insuficiente para la transferencia.');
            }

            // 3. Actualizar Origen (RESTAR)
            $cuentaOrigen->saldo_cuenta -= $request->monto;
            $cuentaOrigen->save();

            // 4. Actualizar Destino (SUMAR)
            $cuentaDestino->saldo_cuenta += $request->monto;
            $cuentaDestino->save();

            // 5. Registrar el movimiento
            MovimientoFinanciero::create([
                'tipo_movimiento_id' => 3, // Asumiendo que 3 es para transferencias
                'cuenta_origen_id' => $request->cuenta_origen_id,
                'cuenta_destino_id' => $request->cuenta_destino_id,
                'monto' => $request->monto,
                'moneda' => $request->moneda,
                'descripcion' => $request->comentario ?? 'Transferencia entre cuentas',
                'fecha_operacion' => now(),
                'estado' => 'completado',
            ]);

            DB::commit();

            // CORREGIDO: Usar Redirect en lugar de response()->json
            return Redirect::back()->with('success', "✅ Transferencia de {$request->monto} {$request->moneda} registrada con éxito. Nuevo saldo origen: {$cuentaOrigen->saldo_cuenta}, Nuevo saldo destino: {$cuentaDestino->saldo_cuenta}");

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar transferencia: ' . $e->getMessage());

            // CORREGIDO: Usar Redirect en lugar de response()->json
            return Redirect::back()->with('error', '❌ Error al registrar la transferencia: ' . $e->getMessage());
        }
    }
}
