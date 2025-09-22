<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\Cuenta;
use App\Models\Producto;
use App\Models\TasaCambio;
use App\Models\CostDistribution;
use App\Models\CostDistributionItem;
use App\Models\CostoHistorial;
use App\Models\TransaccionCuenta;
use App\Http\Requests\DistribuirCostosManualRequest;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Log; // Importar la clase Log

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
     * Muestra el formulario para distribuir costos de una compra específica.
     *
     * @param  \App\Models\Compra  $compra
     * @return \Inertia\Response
     */
    public function mostrarFormularioDistribucion(Compra $compra)
    {
        // Carga la relación 'productos' para que la vista tenga acceso a ellos
        $compra->load('productos');

        // Traer las cuentas con todos sus tipos
        $cuentas = Cuenta::all();

        // Obtener la tasa de cambio más reciente para la conversión CUP -> USD
        $tasaCambioActual = TasaCambio::latest('fecha_actualizacion')->first();

        return Inertia::render('Transacciones/DistribuirCostosView', [
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
                return redirect()->back()->with('error', 'No se puede usar una cuenta de deudas para esta operación.');
            }

            $tasa_cambio = $validatedData['exchange_rate'] ?? TasaCambio::latest('fecha_actualizacion')->first()->tasa;
            $totalUsdDistribuido = (float) $validatedData['amount_cup'] / $tasa_cambio;

            // 1. Creamos el registro principal de la distribución
            $distribution = CostDistribution::create([
                'purchase_id'   => $validatedData['purchase_id'],
                'account_id'    => $validatedData['account_id'],
                'amount_cup'    => $validatedData['amount_cup'],
                'exchange_rate' => $tasa_cambio,
                'amount_usd'    => $totalUsdDistribuido,
                'details'       => $validatedData['details'],
            ]);

            // 2. Iteramos sobre los productos enviados desde el formulario
            foreach ($validatedData['productos'] as $productoData) {
                // Solo procesamos si el monto a distribuir es mayor que cero
                if ((float) $productoData['amount_usd'] > 0) {
                    $producto = Producto::find($productoData['product_id']);

                    // Obtenemos la cantidad de la tabla pivote de la compra
                    $pivotData = $compra->productos()->where('producto_id', $producto->id)->firstOrFail()->pivot;
                    $cantidad = $pivotData->cantidad;

                    // Guardamos el costo actual del producto ANTES de modificarlo
                    $costoActual = $producto->precio_compra_producto;

                    // 3. La fórmula clave: calculamos el nuevo costo
                    $incrementoUnitario = (float) $productoData['amount_usd'] / $cantidad;
                    $nuevoCosto = $costoActual + $incrementoUnitario;

                    // 4. Creamos el registro de "item" con el detalle
                    $distribution->items()->create([
                        'product_id'           => $producto->id,
                        'quantity'             => $cantidad,
                        'distributed_amount_usd' => $productoData['amount_usd'],
                        'old_cost_usd'         => $costoActual,
                        'new_cost_usd'         => $nuevoCosto,
                    ]);

                    // 5. Creamos el registro en la tabla de historial de costos
                    CostoHistorial::create([
                        'product_id'           => $producto->id,
                        'old_cost_usd'         => $costoActual,
                        'new_cost_usd'         => $nuevoCosto,
                        'cost_distribution_id' => $distribution->id,
                        'comentario'           => 'Ajuste por distribución manual de costos.',
                    ]);

                    // 6. Actualizamos el campo de costo en la tabla principal de productos
                    $producto->update(['precio_compra_producto' => $nuevoCosto]);
                }
            }

            // 7. Finalmente, descontamos el dinero de la cuenta de origen
            $cuenta->decrement('saldo', (float) $validatedData['amount_cup']);

            DB::commit();

            return redirect()->route('transacciones')->with('success', 'Costos distribuidos manualmente con éxito.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al distribuir costos manualmente: ' . $e->getMessage()); // Registro del error
            return redirect()->back()->with('error', 'Ocurrió un error al distribuir los costos. Por favor, revisa los datos e intenta de nuevo.');
        }
    }
}
