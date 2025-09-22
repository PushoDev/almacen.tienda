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
     * Muestra la página principal de transacciones y los datos necesarios.
     */
    public function index()
    {
        $compras = Compra::with('productos')->orderByDesc('fecha_compra')->limit(50)->get();
        $cuentas = Cuenta::all();
        $tasaCambioActual = TasaCambio::latest('fecha_actualizacion')->first();

        return Inertia::render('Transacciones/Index', [
            'compras' => $compras,
            'cuentas' => $cuentas,
            'tasaCambioActual' => $tasaCambioActual ? $tasaCambioActual->tasa : 0,
        ]);
    }

    /**
     * Muestra la vista completa para distribuir costos de una compra específica.
     *
     * @param  \App\Models\Compra  $compra
     * @return \Inertia\Response
     */
    public function mostrarFormularioDistribucion(Compra $compra)
    {
        // Carga la relación 'productos' para que la vista tenga acceso a ellos
        $compra->load('productos');
        $cuentas = Cuenta::all();
        $tasaCambioActual = TasaCambio::latest('fecha_actualizacion')->first();

        // RENDERIZA LA VISTA COMPLETA ESPECIFICADA
        return Inertia::render('Transacciones/CambiarelMalditoPrecio', [
            'compra' => $compra,
            'cuentas' => $cuentas,
            'tasaCambioActual' => $tasaCambioActual ? $tasaCambioActual->tasa : 0,
        ]);
    }

    /**
     * Procesa la distribución MANUAL de costos adicionales.
     */
    public function distribuirCostosManual(DistribuirCostosManualRequest $request)
    {
        $validatedData = $request->validated();

        DB::beginTransaction();

        try {
            $compra = Compra::findOrFail($validatedData['purchase_id']);
            $cuenta = Cuenta::findOrFail($validatedData['account_id']);

            if ($cuenta->tipo_cuenta === 'deudas') {
                DB::rollBack();
                return redirect()->back()->with('error', 'No se puede usar una cuenta de deudas para esta operación.');
            }

            $tasa_cambio = $validatedData['exchange_rate'] ?? TasaCambio::latest('fecha_actualizacion')->first()->tasa;
            $totalUsdDistribuido = (float) $validatedData['amount_cup'] / $tasa_cambio;

            if ($cuenta->saldo < (float) $validatedData['amount_cup']) {
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
                    $producto = Producto::find($productoData['product_id']);
                    $pivotData = $compra->productos()->where('producto_id', $producto->id)->firstOrFail()->pivot;
                    $cantidad = $pivotData->cantidad;
                    $costoActual = $producto->precio_compra_producto;
                    $incrementoUnitario = (float) $productoData['amount_usd'] / $cantidad;
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

            $cuenta->decrement('saldo', (float) $validatedData['amount_cup']);

            TransaccionCuenta::create([
                'cuenta_id' => $cuenta->id,
                'tipo' => 'gasto_adicional',
                'monto' => (float) $validatedData['amount_cup'],
                'descripcion' => $validatedData['details'] ?? 'Gasto de distribución de costos por compra #' . $compra->id,
            ]);

            DB::commit();

            return redirect()->route('transacciones')->with('success', 'Costos distribuidos manualmente con éxito.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al distribuir costos manualmente: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Ocurrió un error al distribuir los costos. Por favor, revisa los datos e intenta de nuevo.');
        }
    }
}
