<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\Cuenta;
use App\Models\TasaCambio;
use App\Models\CostDistribution;
use App\Models\CostDistributionItem;
use App\Models\TransaccionCuenta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class TransaccionController extends Controller
{
    /**
     * Muestra la página principal de transacciones y los datos necesarios.
     */
    public function index()
    {
        // Traer las compras con un límite para no sobrecargar la vista
        $compras = Compra::with('productos')->orderByDesc('fecha_compra')->limit(50)->get();

        // Traer las cuentas con todos sus tipos
        $cuentas = Cuenta::all();

        // Obtener la tasa de cambio más reciente para la conversión CUP -> USD
        $tasaCambioActual = TasaCambio::latest('fecha_actualizacion')->first();

        return Inertia::render('Transacciones/Index', [
            'compras' => $compras,
            'cuentas' => $cuentas,
            'tasaCambioActual' => $tasaCambioActual ? $tasaCambioActual->tasa : 0,
        ]);
    }

    /**
     * Procesa la distribución de costos adicionales.
     */
    public function distribuirCostos(Request $request)
    {
        // Validar los datos de entrada
        $request->validate([
            'purchase_id' => 'required|exists:compras,id',
            'amount_cup' => 'required|numeric|min:0.01',
            'account_id' => 'required|exists:cuentas,id',
            'exchange_rate' => 'nullable|numeric|min:0.01',
            'details' => 'nullable|string',
        ]);

        // Verificar que la cuenta seleccionada no sea de tipo 'deudas'
        $cuenta = Cuenta::findOrFail($request->account_id);
        if ($cuenta->tipo_cuenta === 'deudas') {
            return redirect()->back()->with('error', 'No se puede usar una cuenta de deudas para esta operación.');
        }

        // Usar una transacción de base de datos para asegurar la integridad
        DB::beginTransaction();

        try {
            $compra = Compra::with('productos')->findOrFail($request->purchase_id);
            $tasa_cambio = $request->exchange_rate ?? TasaCambio::latest('fecha_actualizacion')->first()->tasa;
            $monto_usd = $request->amount_cup / $tasa_cambio;

            // Calcular el costo total original de la compra
            $total_costo_compra_usd = 0;
            foreach ($compra->productos as $producto) {
                $costo_original_usd = $producto->pivot->precio;
                $cantidad_comprada = $producto->pivot->cantidad;
                $total_costo_compra_usd += ($costo_original_usd * $cantidad_comprada);
            }

            // Registrar la distribución de costos
            $costDistribution = CostDistribution::create([
                'purchase_id' => $compra->id,
                'amount_cup' => $request->amount_cup,
                'amount_usd' => $monto_usd,
                'exchange_rate' => $tasa_cambio,
                'account_id' => $request->account_id,
                'details' => $request->details,
            ]);

            // Distribuir el monto entre los productos y actualizar sus costos
            foreach ($compra->productos as $producto) {
                $costo_original_usd = $producto->pivot->precio;
                $cantidad_comprada = $producto->pivot->cantidad;

                $proporcion = 0;
                if ($total_costo_compra_usd > 0) {
                    $proporcion = ($costo_original_usd * $cantidad_comprada) / $total_costo_compra_usd;
                }

                $monto_distribuido_usd = $monto_usd * $proporcion;
                $nuevo_costo_usd = $costo_original_usd + ($monto_distribuido_usd / $cantidad_comprada);

                // Registrar el ítem de la distribución
                $costDistribution->items()->create([
                    'product_id' => $producto->id,
                    'distributed_amount_usd' => $monto_distribuido_usd,
                    'old_cost_usd' => $costo_original_usd,
                    'new_cost_usd' => $nuevo_costo_usd,
                ]);

                // Actualizar el costo del producto principal en la tabla de productos
                $producto->update(['precio_compra_producto' => $nuevo_costo_usd]);
            }

            DB::commit();

            return redirect()->back()->with('success', 'Costos distribuidos exitosamente.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Ocurrió un error al distribuir los costos: ' . $e->getMessage());
        }
    }
}
