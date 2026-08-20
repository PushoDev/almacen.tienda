<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\Compra;
use App\Models\CostDistribution;
use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\Proveedor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DistribucionCostosController extends Controller
{
    /**
     * Vista principal de Distribución de Costos: listado de compras para prorratear.
     */
    public function index(Request $request)
    {
        $buscar = trim((string) $request->input('buscar', ''));
        $proveedorId = $request->input('proveedor_id', '');
        $almacenId = $request->input('almacen_id', '');
        $fecha = $request->input('fecha', '');

        $compras = Compra::with(['productos', 'proveedor', 'cliente'])
            ->when($buscar !== '', function ($query) use ($buscar) {
                $query->where(function ($sub) use ($buscar) {
                    $sub->where('id', 'like', "%{$buscar}%")
                        ->orWhereHas('proveedor', fn ($q) => $q->where('nombre_proveedor', 'like', "%{$buscar}%"))
                        ->orWhereHas('cliente', fn ($q) => $q->where('nombre_cliente', 'like', "%{$buscar}%"));
                });
            })
            ->when($proveedorId !== '', fn ($query) => $query->where('proveedor_id', $proveedorId))
            ->when($almacenId !== '', fn ($query) => $query->whereHas('productos', fn ($q) => $q->wherePivot('almacen_id', $almacenId)))
            ->when($fecha !== '', fn ($query) => $query->whereDate('fecha_compra', $fecha))
            ->orderByDesc('fecha_compra')
            ->paginate(10)
            ->withQueryString();

        // Nombres de almacén — resueltos en un solo query para todas las compras de esta
        // página, en vez de uno por compra (un almacén_id vive en el pivot compra_producto,
        // no hay relación directa Compra→Almacen).
        $almacenIds = $compras->getCollection()
            ->flatMap(fn ($compra) => $compra->productos->pluck('pivot.almacen_id'))
            ->filter()
            ->unique();
        $nombresAlmacen = Almacen::whereIn('id', $almacenIds)->pluck('nombre_almacen', 'id');

        // Compras que ya tienen al menos una distribución de costo registrada — determina si el
        // listado ofrece "Distribuir" o también "Detalles" para esa fila.
        $comprasConDistribucion = CostDistribution::whereIn('purchase_id', $compras->getCollection()->pluck('id'))
            ->pluck('purchase_id')
            ->unique();

        $compras->through(function ($compra) use ($nombresAlmacen, $comprasConDistribucion) {
            $compra->tiene_distribucion = $comprasConDistribucion->contains($compra->id);
            $compra->origen = $compra->proveedor->nombre_proveedor ?? $compra->cliente->nombre_cliente ?? null;
            $compra->almacenes = $compra->productos
                ->pluck('pivot.almacen_id')
                ->filter()
                ->unique()
                ->map(fn ($id) => $nombresAlmacen[$id] ?? null)
                ->filter()
                ->values();
            $compra->setRelation('productos', $this->agruparProductosPorLinea($compra->productos));
            return $compra;
        });

        // Vendedor solo ve sus cuentas asignadas personales; el resto de roles ve todas.
        if (auth()->user()->role === 'vendedor') {
            $cuentas = auth()->user()->cuentas()->where('tipo_titular', 'personal')->with('moneda')->get();
        } else {
            $cuentas = Cuenta::with('moneda')->get();
        }

        $monedaCUP = Moneda::where('codigo_moneda', 'CUP')
            ->where('estado', true)
            ->orderBy('tasa_cambio', 'desc')
            ->first();

        return Inertia::render('DistribucionCostos/Index', [
            'compras' => $compras,
            'cuentas' => $cuentas,
            'tasaCambioActual' => $monedaCUP ? $monedaCUP->tasa_cambio : 0,
            // Solo proveedores/almacenes que realmente participan en alguna compra — no la lista
            // completa del sistema, para no ofrecer filtros que siempre den cero resultados.
            'proveedores' => Proveedor::whereHas('compras')->orderBy('nombre_proveedor')->get(['id', 'nombre_proveedor']),
            'almacenes' => Almacen::whereIn('id', DB::table('compra_producto')->whereNotNull('almacen_id')->distinct()->pluck('almacen_id'))
                ->orderBy('nombre_almacen')
                ->get(['id', 'nombre_almacen']),
            'filtros' => [
                'buscar' => $buscar,
                'proveedor_id' => $proveedorId,
                'almacen_id' => $almacenId,
                'fecha' => $fecha,
            ],
        ]);
    }

    /**
     * Agrupa las líneas de compra_producto por producto (un producto puede tener varias líneas
     * en la misma compra desde distintos almacenes/precios) sumando la cantidad, para el listado
     * que reparte un gasto por producto, no por línea.
     */
    private function agruparProductosPorLinea($productos)
    {
        return $productos
            ->groupBy('id')
            ->map(function ($lineas) {
                $producto = $lineas->first();
                $producto->pivot->cantidad = $lineas->sum(fn($p) => $p->pivot->cantidad);
                return $producto;
            })
            ->values();
    }
}
