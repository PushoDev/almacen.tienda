<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\Cuenta;
use App\Models\Producto;
use App\Models\TasaCambio;
use App\Models\CostDistribution;
use App\Models\CostoHistorial;
use App\Models\TransaccionCuenta;
use App\Http\Requests\DistribuirCostosManualRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;
use Exception; // Importamos Exception para manejo de errores

class TransaccionController extends Controller
{
    // NO HAY CONSTRUCTOR: Eliminamos la inyección de MovimientoFinancieroService

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

            $totalUsdDistribuido = (float) $validatedData['amount_cup'] / $tasa_cambio;

            if ($cuenta->saldo_cuenta < (float) $validatedData['amount_cup']) {
                DB::rollBack();
                return redirect()->back()->with('error', 'El saldo en la cuenta de origen es insuficiente.');
            }

            $distribution = CostDistribution::create([
                'purchase_id'   => $validatedData['purchase_id'],
                'account_id'    => $validatedData['account_id'],
                'amount_cup'    => $validatedData['amount_cup'],
                'exchange_rate' => $tasa_cambio,
                'amount_usd'    => $totalUsdDistribuido,
                'details'       => $validatedData['details'],
            ]);

            foreach ($validatedData['productos'] as $productoData) {
                if ((float) $productoData['amount_usd'] > 0) {
                    $producto = Producto::findOrFail($productoData['product_id']);

                    $pivotData = $compra->productos->find($producto->id)->pivot;

                    $cantidad = $pivotData->cantidad;
                    $costoActual = $producto->precio_compra_producto;
                    $incrementoUnitario = (float) $productoData['amount_usd'];
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

            $cuenta->decrement('saldo_cuenta', (float) $validatedData['amount_cup']);

            TransaccionCuenta::create([
                'user_id' => auth()->id(),
                'cuenta_origen_id' => $cuenta->id,
                'monto' => (float) $validatedData['amount_cup'],
                'tipo' => 'gasto_adicional',
                'comentario' => $validatedData['details']
                    ?? 'Gasto de distribución de costos por compra #' . $compra->id,
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
    // === NUEVOS MÉTODOS DE REGISTRO DE MOVIMIENTOS FINANCIEROS (Lógica Simplificada) ===
    // =======================================================

    /**
     * Registra un Gasto (Egreso de una cuenta).
     * Nota: Utiliza TransaccionCuenta para el registro y decrementa directamente saldo_cuenta.
     */
    public function registrarGasto(Request $request)
    {
        $request->validate([
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|in:USD,EUR,MLC,CUP',
            'cuenta_origen_id' => 'required|exists:cuentas,id',
            'descripcion' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();

        try {
            $monto = (float) $request->input('monto');
            $cuenta = Cuenta::findOrFail($request->input('cuenta_origen_id'));

            // 1. Verificación de saldo (usando saldo_cuenta, ya que saldo_disponible no es manejado aquí)
            if ($cuenta->saldo_cuenta < $monto) {
                DB::rollBack();
                return back()->with('error', 'Saldo insuficiente en la cuenta para registrar el gasto.')->withInput();
            }

            // 2. Actualización de saldos
            $cuenta->decrement('saldo_cuenta', $monto);
            // Si también manejas saldo_disponible, descomenta y ajusta esta línea:
            // $cuenta->decrement('saldo_disponible', $monto);

            // 3. Registro de la transacción
            TransaccionCuenta::create([
                'user_id' => auth()->id(),
                'cuenta_origen_id' => $cuenta->id,
                'monto' => $monto,
                'tipo' => 'gasto_operativo', // Tipo que definas en tu sistema
                'comentario' => $request->input('descripcion')
            ]);

            DB::commit();
            return back()->with('success', 'Gasto registrado correctamente.');
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar gasto: ' . $e->getMessage());
            return back()->with('error', 'Error al procesar el gasto: ' . $e->getMessage())->withInput();
        }
    }

    /**
     * Registra un Ingreso/Ganancia (Entrada a una cuenta).
     * Nota: Utiliza TransaccionCuenta para el registro y actualiza directamente saldo_cuenta.
     */
    public function registrarIngreso(Request $request)
    {
        $request->validate([
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|in:USD,EUR,MLC,CUP',
            'cuenta_destino_id' => 'required|exists:cuentas,id',
            'tasa_cambio' => 'nullable|numeric|min:0.01',
            'descripcion' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();

        try {
            $monto = (float) $request->input('monto');
            $cuenta = Cuenta::findOrFail($request->input('cuenta_destino_id'));

            // 1. Aquí iría la lógica de conversión de divisas si es necesaria (omitida para simplificar sin el servicio).
            // Por ahora, asumimos que el monto se suma directamente.

            // 2. Actualización de saldos
            $cuenta->increment('saldo_cuenta', $monto);
            // Si también manejas saldo_disponible, descomenta y ajusta esta línea:
            // $cuenta->increment('saldo_disponible', $monto);

            // 3. Registro de la transacción
            TransaccionCuenta::create([
                'user_id' => auth()->id(),
                'cuenta_destino_id' => $cuenta->id,
                'monto' => $monto,
                'tipo' => 'ingreso_venta', // Tipo que definas en tu sistema
                'comentario' => $request->input('descripcion')
            ]);

            DB::commit();
            return back()->with('success', 'Ingreso registrado correctamente.');
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar ingreso: ' . $e->getMessage());
            return back()->with('error', 'Error al procesar el ingreso: ' . $e->getMessage())->withInput();
        }
    }

    /**
     * Registra una Transferencia Interna (Movimiento entre Origen y Destino).
     * Nota: Actualiza ambas cuentas y usa TransaccionCuenta.
     */
    public function registrarTransferencia(Request $request)
    {
        $request->validate([
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|in:USD,EUR,MLC,CUP',
            'cuenta_origen_id' => 'required|exists:cuentas,id|different:cuenta_destino_id',
            'cuenta_destino_id' => 'required|exists:cuentas,id',
            'tasa_cambio' => 'nullable|numeric|min:0.01',
            'descripcion' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();

        try {
            $monto = (float) $request->input('monto');
            $cuentaOrigen = Cuenta::findOrFail($request->input('cuenta_origen_id'));
            $cuentaDestino = Cuenta::findOrFail($request->input('cuenta_destino_id'));

            // 1. Verificación de saldo
            if ($cuentaOrigen->saldo_cuenta < $monto) {
                DB::rollBack();
                return back()->with('error', 'Saldo insuficiente en la cuenta de origen para la transferencia.')->withInput();
            }

            // 2. Actualización de saldos (Egreso en origen, Ingreso en destino)
            $cuentaOrigen->decrement('saldo_cuenta', $monto);
            $cuentaDestino->increment('saldo_cuenta', $monto);

            // 3. Registro de la transacción
            TransaccionCuenta::create([
                'user_id' => auth()->id(),
                'cuenta_origen_id' => $cuentaOrigen->id,
                'cuenta_destino_id' => $cuentaDestino->id,
                'monto' => $monto,
                'tipo' => 'transferencia_interna', // Tipo que definas en tu sistema
                'comentario' => $request->input('descripcion')
            ]);

            DB::commit();
            return back()->with('success', 'Transferencia registrada correctamente.');
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar transferencia: ' . $e->getMessage());
            return back()->with('error', 'Error al procesar la transferencia: ' . $e->getMessage())->withInput();
        }
    }
}
