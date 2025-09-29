<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\Cuenta;
use App\Models\Producto;
use App\Models\TasaCambio;
use App\Models\CostDistribution;
use App\Models\CostoHistorial;
use App\Models\TransaccionCuenta; // USAMOS ESTE MODELO (Para Gasto, Ingreso, Transferencia)
use App\Http\Requests\DistribuirCostosManualRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;
use Exception;
use Illuminate\Validation\ValidationException; // ¡Importación Corregida!

class TransaccionController extends Controller
{
    // Las constantes TIPO_... ya no son estrictamente necesarias si TransaccionCuenta
    // usa el campo 'tipo' como string ('gasto_operativo', 'ingreso_venta', etc.),
    // pero las he mantenido fuera para simplificar.

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
    // === MÉTODOS DE REGISTRO DE MOVIMIENTOS FINANCIEROS (Usando TransaccionCuenta) ===
    // =======================================================

    /**
     * Registra un Gasto (Egreso de una cuenta).
     */
    public function registrarGasto(Request $request)
    {
        // Nota: Agregué 'fecha_operacion' a la validación ya que lo usaste en los ejemplos anteriores.
        $request->validate([
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|in:USD,EUR,MLC,CUP',
            'cuenta_origen_id' => 'required|exists:cuentas,id',
            'fecha_operacion' => 'required|date', // Requerido para consistencia con los otros métodos
            'descripcion' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();

        try {
            $monto = (float) $request->input('monto');
            $cuenta = Cuenta::lockForUpdate()->findOrFail($request->input('cuenta_origen_id'));

            // 1. Verificación de saldo
            if ($cuenta->saldo_cuenta < $monto) {
                // Usamos ValidationException aquí para mantener la coherencia con los métodos anteriores
                // y permitir que Laravel/Inertia maneje el error de validación.
                throw ValidationException::withMessages([
                    'monto' => 'Saldo insuficiente en la cuenta de origen.'
                ]);
            }

            // 2. Actualización de saldos
            $cuenta->decrement('saldo_cuenta', $monto);

            // 3. Registro de la transacción
            TransaccionCuenta::create([
                'user_id' => auth()->id(),
                'cuenta_origen_id' => $cuenta->id,
                'monto' => $monto,
                'moneda' => $request->input('moneda'), // Agregado para usar el valor del formulario
                'tipo' => 'gasto_operativo',
                'comentario' => $request->input('descripcion'),
                'fecha_operacion' => $request->input('fecha_operacion'),
            ]);

            DB::commit();
            return back()->with('success', 'Gasto registrado correctamente.');
        } catch (ValidationException $e) {
            DB::rollBack();
            throw $e; // Re-lanza la excepción de validación
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar gasto: ' . $e->getMessage());
            return back()->with('error', 'Error al procesar el gasto: ' . $e->getMessage())->withInput();
        }
    }

    /**
     * Registra un Ingreso/Ganancia (Entrada a una cuenta).
     */
    public function registrarIngreso(Request $request)
    {
        $request->validate([
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|in:USD,EUR,MLC,CUP',
            'cuenta_destino_id' => 'required|exists:cuentas,id',
            'fecha_operacion' => 'required|date',
            'tasa_cambio' => 'nullable|numeric|min:0.01',
            'descripcion' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();

        try {
            $montoOriginal = (float) $request->input('monto');
            $cuenta = Cuenta::lockForUpdate()->findOrFail($request->input('cuenta_destino_id'));

            $montoAfectar = $montoOriginal;
            $tasaAplicada = null;
            $monedaIngreso = $request->input('moneda');

            // Lógica de Conversión (Si la moneda de la transacción difiere de la cuenta)
            if ($monedaIngreso !== $cuenta->tipo_moneda) {
                $tasaCambio = (float) $request->input('tasa_cambio');
                if (!$tasaCambio || $tasaCambio <= 0) {
                    throw ValidationException::withMessages([
                        'tasa_cambio' => 'Se requiere una Tasa de Cambio para la conversión de moneda.'
                    ]);
                }
                $montoAfectar = $montoOriginal * $tasaCambio;
                $tasaAplicada = $tasaCambio;
            }


            // 2. Actualización de saldos
            $cuenta->increment('saldo_cuenta', $montoAfectar);

            // 3. Registro de la transacción
            TransaccionCuenta::create([
                'user_id' => auth()->id(),
                'cuenta_destino_id' => $cuenta->id,
                'monto' => $montoOriginal,
                'moneda' => $monedaIngreso,
                'tasa_cambio_aplicada' => $tasaAplicada, // Agregamos la tasa
                'tipo' => 'ingreso_venta',
                'comentario' => $request->input('descripcion'),
                'fecha_operacion' => $request->input('fecha_operacion'),
            ]);

            DB::commit();
            return back()->with('success', 'Ingreso registrado correctamente.');
        } catch (ValidationException $e) {
            DB::rollBack();
            throw $e;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar ingreso: ' . $e->getMessage());
            return back()->with('error', 'Error al procesar el ingreso: ' . $e->getMessage())->withInput();
        }
    }

    /**
     * Registra una Transferencia Interna (Movimiento entre Origen y Destino).
     */
    public function registrarTransferencia(Request $request)
    {
        $request->validate([
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|in:USD,EUR,MLC,CUP',
            'cuenta_origen_id' => 'required|exists:cuentas,id|different:cuenta_destino_id',
            'cuenta_destino_id' => 'required|exists:cuentas,id',
            'fecha_operacion' => 'required|date',
            'tasa_cambio' => 'nullable|numeric|min:0.01',
            'descripcion' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();

        try {
            $montoOriginal = (float) $request->input('monto');
            $origenId = $request->input('cuenta_origen_id');
            $destinoId = $request->input('cuenta_destino_id');

            // 1. Bloquear y cargar ambas cuentas
            $cuentaOrigen = Cuenta::lockForUpdate()->findOrFail($origenId);
            $cuentaDestino = Cuenta::lockForUpdate()->findOrFail($destinoId);

            // 2. Verificación de saldo en origen
            if ($cuentaOrigen->saldo_cuenta < $montoOriginal) {
                throw ValidationException::withMessages([
                    'monto' => 'Saldo insuficiente en la cuenta de origen para la transferencia.'
                ]);
            }

            // 3. Cálculo de la conversión para el destino
            $montoAfectarDestino = $montoOriginal;
            $tasaAplicada = null;
            $monedaTransferida = $request->input('moneda');

            if ($monedaTransferida !== $cuentaDestino->tipo_moneda) {
                $tasaCambio = (float) $request->input('tasa_cambio');
                if (!$tasaCambio || $tasaCambio <= 0) {
                    throw ValidationException::withMessages([
                        'tasa_cambio' => 'Se requiere una Tasa de Cambio para transferir entre monedas diferentes.'
                    ]);
                }
                $montoAfectarDestino = $montoOriginal * $tasaCambio;
                $tasaAplicada = $tasaCambio;
            }

            // 4. Actualización de saldos
            $cuentaOrigen->decrement('saldo_cuenta', $montoOriginal);
            $cuentaDestino->increment('saldo_cuenta', $montoAfectarDestino);

            // 5. Registro de la transacción
            TransaccionCuenta::create([
                'user_id' => auth()->id(),
                'cuenta_origen_id' => $origenId,
                'cuenta_destino_id' => $destinoId,
                'monto' => $montoOriginal,
                'moneda' => $monedaTransferida,
                'tasa_cambio_aplicada' => $tasaAplicada,
                'tipo' => 'transferencia_interna',
                'comentario' => $request->input('descripcion'),
                'fecha_operacion' => $request->input('fecha_operacion'),
            ]);

            DB::commit();
            return back()->with('success', 'Transferencia registrada correctamente.');
        } catch (ValidationException $e) {
            DB::rollBack();
            throw $e;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar transferencia: ' . $e->getMessage());
            return back()->with('error', 'Error al procesar la transferencia: ' . $e->getMessage())->withInput();
        }
    }
}
