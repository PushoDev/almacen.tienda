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
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log;

class TransaccionController extends Controller
{
    /**
     * Vista principal de transacciones
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
     * Muestra formulario de distribución manual para una compra
     */
    public function mostrarFormularioDistribucion(Compra $compra)
    {
        $compra->load('productos');
        $cuentas = Cuenta::all();
        $tasaCambioActual = TasaCambio::latest('fecha_actualizacion')->first();

        return Inertia::render('Transacciones/CambiarCostoManual', [
            'compra' => $compra,
            'cuentas' => $cuentas,
            'tasaCambioActual' => $tasaCambioActual ? $tasaCambioActual->tasa : 0,
        ]);
    }

    /**
     * Procesa la distribución manual de costos
     */
    public function distribuirCostosManual(DistribuirCostosManualRequest $request)
    {
        $validatedData = $request->validated();

        DB::beginTransaction();

        try {
            $compra = Compra::findOrFail($validatedData['purchase_id']);
            $cuenta = Cuenta::findOrFail($validatedData['account_id']);

            // Validar tipo de cuenta
            if ($cuenta->tipo_cuenta === 'deudas') {
                DB::rollBack();
                return redirect()->back()->with('error', 'No se puede usar una cuenta de deudas para esta operación.');
            }

            // Tasa de cambio
            $tasa_cambio = $validatedData['exchange_rate']
                ?? TasaCambio::latest('fecha_actualizacion')->first()->tasa;

            $totalUsdDistribuido = (float) $validatedData['amount_cup'] / $tasa_cambio;

            // Validar saldo
            if ($cuenta->saldo_cuenta < (float) $validatedData['amount_cup']) {
                DB::rollBack();
                return redirect()->back()->with('error', 'El saldo en la cuenta de origen es insuficiente.');
            }

            // Crear cabecera de distribución
            $distribution = CostDistribution::create([
                'purchase_id'   => $validatedData['purchase_id'],
                'account_id'    => $validatedData['account_id'],
                'amount_cup'    => $validatedData['amount_cup'],
                'exchange_rate' => $tasa_cambio,
                'amount_usd'    => $totalUsdDistribuido,
                'details'       => $validatedData['details'],
            ]);

            // Procesar productos
            foreach ($validatedData['productos'] as $productoData) {
                if ((float) $productoData['amount_usd'] > 0) {
                    $producto = Producto::findOrFail($productoData['product_id']);
                    $pivotData = $compra->productos()
                        ->where('producto_id', $producto->id)
                        ->firstOrFail()
                        ->pivot;

                    $cantidad = $pivotData->cantidad;
                    $costoActual = $producto->precio_compra_producto;
                    $incrementoUnitario = (float) $productoData['amount_usd'] / $cantidad;
                    $nuevoCosto = $costoActual + $incrementoUnitario;

                    // Registrar detalle de distribución
                    $distribution->items()->create([
                        'product_id' => $producto->id,
                        'quantity' => $cantidad,
                        'distributed_amount_usd' => $productoData['amount_usd'],
                        'old_cost_usd' => $costoActual,
                        'new_cost_usd' => $nuevoCosto,
                    ]);

                    // Guardar historial de costos
                    CostoHistorial::create([
                        'product_id' => $producto->id,
                        'old_cost_usd' => $costoActual,
                        'new_cost_usd' => $nuevoCosto,
                        'cost_distribution_id' => $distribution->id,
                        'comentario' => 'Ajuste por distribución manual de costos.',
                    ]);

                    // Actualizar producto
                    $producto->update(['precio_compra_producto' => $nuevoCosto]);
                }
            }

            // Descontar saldo de la cuenta
            $cuenta->decrement('saldo_cuenta', (float) $validatedData['amount_cup']);

            // Registrar transacción en cuentas
            TransaccionCuenta::create([
                'user_id' => auth()->id(),
                'cuenta_origen_id' => $cuenta->id, // ⚠️ usa el nombre de campo real de tu migración
                'monto' => (float) $validatedData['amount_cup'],
                'tipo' => 'gasto_adicional',
                'comentario' => $validatedData['details']
                    ?? 'Gasto de distribución de costos por compra #' . $compra->id,
            ]);

            DB::commit();

            return redirect()
                ->route('transacciones')
                ->with('success', 'Costos distribuidos manualmente con éxito.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al distribuir costos manualmente: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Ocurrió un error al distribuir los costos. Por favor, revisa los datos e intenta de nuevo.');
        }
    }
}
