<?php

namespace App\Http\Controllers;

use App\Models\Venta;
use App\Models\DetalleVenta;
use App\Models\Moneda;
use App\Models\Cuenta;
use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VentaController extends Controller
{
    public function index()
    {
        $ventas = Venta::with(['detalles.producto', 'pagos.moneda', 'pagos.cuenta'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);
        
        return inertia('Vendor/Index', [
            'ventas' => $ventas,
            'monedas' => Moneda::all(),
            'cuentas' => Cuenta::all()
        ]);
    }

    public function show(Venta $venta)
    {
        $venta->load([
            'detalles.producto',
            'pagos.moneda',
            'pagos.cuenta',
            'pagos.via'
        ]);

        // Calcular totales y ganancias
        $totalVenta = $venta->total;
        $totalPagado = $venta->pagos->sum('monto_equivalente_usd');
        $restantePorPagar = max(0, $totalVenta - $totalPagado);

        // Ganancia operacional (venta - costo de productos)
        $costoTotalProductos = $venta->detalles->sum(function ($detalle) {
            return $detalle->cantidad * $detalle->producto->costo;
        });
        $gananciaOperacional = $totalVenta - $costoTotalProductos;

        // Ganancia/pérdida cambiaria (diferencia entre lo que se esperaba recibir y lo real)
        $gananciaPerdidaCambiaria = $totalPagado - $venta->total;

        // Tasa de cambio principal usada en la venta
        $tasaCambioPrincipal = $venta->tasa_cambio ?? 1.000000;

        return inertia('Vendor/Show', [
            'venta' => $venta,
            'resumen' => [
                'totalVenta' => $totalVenta,
                'totalPagado' => $totalPagado,
                'restantePorPagar' => $restantePorPagar,
                'gananciaOperacional' => $gananciaOperacional,
                'gananciaPerdidaCambiaria' => $gananciaPerdidaCambiaria,
                'gananciaRealTotal' => $gananciaOperacional + $gananciaPerdidaCambiaria,
                'tasaCambioPrincipal' => $tasaCambioPrincipal,
            ],
            'monedas' => Moneda::all(),
            'cuentas' => Cuenta::all()
        ]);
    }

    public function create()
    {
        return inertia('Vendor/Create', [
            'monedas' => Moneda::all(),
            'cuentas' => Cuenta::all(),
            'productos' => Producto::all()
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|exists:productos,id',
            'detalles.*.cantidad' => 'required|integer|min:1',
            'detalles.*.precio_venta' => 'required|numeric|min:0',
            'pagos' => 'required|array|min:1',
            'pagos.*.moneda_id' => 'required|exists:monedas,id',
            'pagos.*.monto' => 'required|numeric|min:0',
            'pagos.*.cuenta_id' => 'required|exists:cuentas,id',
            'pagos.*.via_id' => 'required|exists:alias,id',
            'pagos.*.tasa_cambio' => 'required|numeric|min:0',
            'tasa_cambio' => 'required|numeric|min:0'
        ]);

        DB::beginTransaction();

        try {
            $venta = Venta::create([
                'total' => collect($request->detalles)->sum(function ($detalle) {
                    return $detalle['cantidad'] * $detalle['precio_venta'];
                }),
                'tasa_cambio' => $request->tasa_cambio
            ]);

            foreach ($request->detalles as $detalle) {
                DetalleVenta::create([
                    'venta_id' => $venta->id,
                    'producto_id' => $detalle['producto_id'],
                    'cantidad' => $detalle['cantidad'],
                    'precio_venta' => $detalle['precio_venta']
                ]);
            }

            foreach ($request->pagos as $pago) {
                $moneda = Moneda::find($pago['moneda_id']);
                $montoEquivalenteUsd = $pago['monto'] / $pago['tasa_cambio'];

                $venta->pagos()->create([
                    'moneda_id' => $pago['moneda_id'],
                    'monto_original' => $pago['monto'],
                    'monto_equivalente_usd' => $montoEquivalenteUsd,
                    'tasa_cambio_aplicada' => $pago['tasa_cambio'],
                    'cuenta_id' => $pago['cuenta_id'],
                    'via_id' => $pago['via_id']
                ]);
            }

            DB::commit();

            return redirect()->route('ventas.show', $venta->id)
                ->with('message', 'Venta creada exitosamente');
        } catch (\Exception $e) {
            DB::rollback();
            return redirect()->back()
                ->with('error', 'Error al crear la venta: ' . $e->getMessage());
        }
    }

    public function edit(Venta $venta)
    {
        $venta->load(['detalles.producto', 'pagos.moneda', 'pagos.cuenta', 'pagos.via']);

        return inertia('Vendor/Edit', [
            'venta' => $venta,
            'monedas' => Moneda::all(),
            'cuentas' => Cuenta::all(),
            'productos' => Producto::all()
        ]);
    }

    public function update(Request $request, Venta $venta)
    {
        $request->validate([
            'detalles' => 'required|array|min:1',
            'detalles.*.producto_id' => 'required|exists:productos,id',
            'detalles.*.cantidad' => 'required|integer|min:1',
            'detalles.*.precio_venta' => 'required|numeric|min:0',
            'pagos' => 'required|array|min:1',
            'pagos.*.moneda_id' => 'required|exists:monedas,id',
            'pagos.*.monto' => 'required|numeric|min:0',
            'pagos.*.cuenta_id' => 'exists:cuentas,id',
            'pagos.*.via_id' => 'exists:alias,id',
            'pagos.*.tasa_cambio' => 'required|numeric|min:0',
            'tasa_cambio' => 'required|numeric|min:0'
        ]);

        DB::beginTransaction();

        try {
            // Actualizar la venta
            $venta->update([
                'total' => collect($request->detalles)->sum(function ($detalle) {
                    return $detalle['cantidad'] * $detalle['precio_venta'];
                }),
                'tasa_cambio' => $request->tasa_cambio
            ]);

            // Actualizar detalles
            $venta->detalles()->delete();
            foreach ($request->detalles as $detalle) {
                DetalleVenta::create([
                    'venta_id' => $venta->id,
                    'producto_id' => $detalle['producto_id'],
                    'cantidad' => $detalle['cantidad'],
                    'precio_venta' => $detalle['precio_venta']
                ]);
            }

            // Actualizar pagos
            $venta->pagos()->delete();
            foreach ($request->pagos as $pago) {
                $montoEquivalenteUsd = $pago['monto'] / $pago['tasa_cambio'];

                $venta->pagos()->create([
                    'moneda_id' => $pago['moneda_id'],
                    'monto_original' => $pago['monto'],
                    'monto_equivalente_usd' => $montoEquivalenteUsd,
                    'tasa_cambio_aplicada' => $pago['tasa_cambio'],
                    'cuenta_id' => $pago['cuenta_id'],
                    'via_id' => $pago['via_id']
                ]);
            }

            DB::commit();

            return redirect()->route('ventas.show', $venta->id)
                ->with('message', 'Venta actualizada exitosamente');
        } catch (\Exception $e) {
            DB::rollback();
            return redirect()->back()
                ->with('error', 'Error al actualizar la venta: ' . $e->getMessage());
        }
    }

    public function destroy(Venta $venta)
    {
        $venta->delete();
        return redirect()->route('ventas.index')
            ->with('message', 'Venta eliminada exitosamente');
    }
}