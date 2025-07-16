<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\Cuenta;
use App\Models\Producto;
use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Models\PagoVenta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class VentaController extends Controller
{
    public function getAlmacenes()
    {
        $user = Auth::user();
        $almacenes = $user->role === 'admin'
            ? Almacen::select('id', 'nombre_almacen')->get()
            : $user->almacenes()->select('id', 'nombre_almacen')->get();

        return response()->json($almacenes);
    }

    public function getProductosPorAlmacen($id)
    {
        $user = Auth::user();

        if ($user->role !== 'admin' && !$user->almacenes->contains('id', $id)) {
            return response()->json(['error' => 'Acceso denegado al almacén'], 403);
        }

        $productos = Producto::whereHas('almacenes', function ($q) use ($id) {
            $q->where('almacens.id', $id);
        })
            ->with([
                'categoria',
                'vendedores' => function ($q) use ($user) {
                    $q->where('user_id', $user->id)
                        ->select('users.id', 'producto_vendedors.precio_venta', 'producto_vendedors.venta_ganancia');
                },
                'almacenes' => function ($q) use ($id) {
                    $q->where('almacens.id', $id)
                        ->select('almacens.id', 'almacens.nombre_almacen', 'almacen_producto.cantidad as stock_disponible');
                }
            ])
            ->get()
            ->map(function ($producto) {
                $vendedor = $producto->vendedores->first();
                $almacen = $producto->almacenes->first();

                return [
                    'id' => $producto->id,
                    'nombre_producto' => $producto->nombre_producto,
                    'marca_producto' => $producto->marca_producto,
                    'categoria_nombre' => $producto->categoria?->nombre_categoria ?? 'Sin categoría',
                    'precio_compra_producto' => $producto->precio_compra_producto,
                    'stock_total' => $producto->almacenes->sum('pivot.cantidad'),
                    'precio_venta' => $vendedor?->pivot->precio_venta ?? null,
                    'tiene_precio' => ($vendedor?->pivot->precio_venta ?? 0) > 0,
                ];
            });

        return response()->json($productos);
    }

    public function index()
    {
        $user = Auth::user();

        return Inertia::render('Vendor/Index', [
            'productos' => [],
            'meta' => [
                'role_usuario' => $user->role,
                'almacenes_usuario' => $user->almacenes->map(fn($a) => ['id' => $a->id, 'nombre' => $a->nombre_almacen]),
            ],
            'cuentas' => Cuenta::whereIn('tipo_cuenta', ['permanentes', 'temporales'])->get(),
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::user();
        $validated = $this->validarDatos($request);
        $total = $this->calcularTotal($validated['productos']);
        $almacenId = $validated['almacen_id'];

        if ($user->role !== 'admin' && !$user->almacenes->contains('id', $almacenId)) {
            return response()->json(['error' => 'No tienes acceso a este almacén'], 403);
        }

        DB::beginTransaction();

        try {
            // Crear venta
            $venta = Venta::create([
                'user_id' => $user->id,
                'almacen_id' => $almacenId,
                'cliente_id' => $validated['cliente_id'] ?? null,
                'total' => round($total, 2),
                'detalles_venta' => $validated['detalles_venta'] ?? null,
            ]);

            // Registrar detalles y actualizar stock
            $this->registrarDetallesVenta($venta->id, $validated['productos'], $almacenId);

            // Registrar pagos
            $this->registrarPagos($venta->id, $validated['pagos']);

            DB::commit();

            // Cargar relaciones
            $venta->load(['detalles.producto', 'pagos.cuenta']);

            // Formatear respuesta
            return $this->formatearVenta($venta);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function validarDatos(Request $request): array
    {
        return $request->validate([
            'almacen_id' => 'required|exists:almacens,id',
            'cliente_id' => 'nullable|exists:clientes,id',
            'detalles_venta' => 'nullable|string|max:255',

            'productos' => 'required|array|min:1',
            'productos.*.producto_id' => 'required|exists:productos,id',
            'productos.*.cantidad' => 'required|integer|min:1',
            'productos.*.precio_venta' => 'required|numeric|min:0.01',

            'pagos' => 'required|array|min:1',
            'pagos.*.tipo_pago' => ['required', Rule::in(['efectivo', 'tarjeta', 'transferencia', 'otros'])],
            'pagos.*.via_pago' => ['required', Rule::in(['zelle', 'visa', 'paypal', 'mastercard', 'stripe', 'transfermovil', 'enzona', 'otros'])],
            'pagos.*.tipo_moneda' => ['required', Rule::in(['usd', 'euro', 'mlc', 'cup'])],
            'pagos.*.monto' => 'required|numeric|min:0.01',
            'pagos.*.cuenta_id' => [
                'required',
                'exists:cuentas,id',
                Rule::in(Cuenta::whereIn('tipo_cuenta', ['permanentes', 'temporales'])->pluck('id'))
            ],
        ]);
    }

    private function calcularTotal(array $productos): float
    {
        return collect($productos)->sum(fn($p) => $p['cantidad'] * $p['precio_venta']);
    }

    private function registrarDetallesVenta(int $ventaId, array $productos, int $almacenId): void
    {
        foreach ($productos as $item) {
            $producto = Producto::findOrFail($item['producto_id']);
            $cantidad = $item['cantidad'];
            $precioVenta = $item['precio_venta'];
            $subtotal = round($cantidad * $precioVenta, 2);

            $this->validarStock($producto->id, $cantidad, $almacenId);
            $this->validarPrecio($precioVenta, $producto->precio_compra_producto);

            VentaDetalle::create([
                'venta_id' => $ventaId,
                'producto_id' => $producto->id,
                'cantidad' => $cantidad,
                'precio_venta' => $precioVenta,
                'subtotal' => $subtotal,
            ]);

            $this->actualizarStock($producto->id, $almacenId, $cantidad);
        }
    }

    private function validarStock(int $productoId, int $cantidad, int $almacenId): void
    {
        $stockDisponible = Producto::findOrFail($productoId)
            ->almacenes()
            ->where('almacens.id', $almacenId)
            ->first()?->pivot->cantidad ?? 0;

        if ($stockDisponible < $cantidad) {
            throw new \Exception("Stock insuficiente para el producto ID: $productoId");
        }
    }

    private function validarPrecio(float $precioVenta, float $precioCompra): void
    {
        if ($precioVenta <= $precioCompra) {
            throw new \Exception("Precio de venta debe ser mayor al costo");
        }
    }

    private function actualizarStock(int $productoId, int $almacenId, int $cantidad): void
    {
        $producto = Producto::findOrFail($productoId);
        $stockActual = $producto->almacenes()
            ->where('almacens.id', $almacenId)
            ->first()->pivot->cantidad;

        $producto->almacenes()->updateExistingPivot($almacenId, [
            'cantidad' => $stockActual - $cantidad
        ]);
    }

    private function registrarPagos(int $ventaId, array $pagos): void
    {
        foreach ($pagos as $pago) {
            PagoVenta::create([
                'venta_id' => $ventaId,
                'tipo_pago' => $pago['tipo_pago'],
                'via_pago' => $pago['via_pago'],
                'tipo_moneda' => $pago['tipo_moneda'],
                'monto' => $pago['monto'],
                'cuenta_id' => $pago['cuenta_id'],
            ]);
        }
    }

    private function formatearVenta(Venta $venta): \Illuminate\Http\JsonResponse
    {
        $venta->load(['detalles.producto', 'pagos.cuenta']);

        $detalles = $venta->detalles->map(function ($detalle) {
            return [
                'id' => $detalle->id,
                'venta_id' => $detalle->venta_id,
                'producto_id' => $detalle->producto_id,
                'cantidad' => $detalle->cantidad,
                'precio_venta' => number_format($detalle->precio_venta, 2),
                'subtotal' => number_format($detalle->subtotal, 2),
                'producto' => [
                    'id' => $detalle->producto->id,
                    'nombre_producto' => $detalle->producto->nombre_producto,
                    'precio_compra_producto' => number_format($detalle->producto->precio_compra_producto, 2),
                ],
            ];
        });

        $pagosFormateados = $venta->pagos->map(function ($pago) {
            return [
                'id' => $pago->id,
                'venta_id' => $pago->venta_id,
                'tipo_pago' => $pago->tipo_pago,
                'via_pago' => $pago->via_pago,
                'tipo_moneda' => $pago->tipo_moneda,
                'monto' => number_format($pago->monto, 2),
                'cuenta_id' => $pago->cuenta_id,
                'cuenta' => [
                    'id' => $pago->cuenta->id,
                    'nombre_cuenta' => $pago->cuenta->nombre_cuenta,
                    'saldo_cuenta' => number_format($pago->cuenta->saldo_cuenta, 2),
                    'tipo_cuenta' => $pago->cuenta->tipo_cuenta,
                ],
            ];
        });

        return response()->json([
            'success' => true,
            'venta' => [
                'id' => $venta->id,
                'user_id' => $venta->user_id,
                'almacen_id' => $venta->almacen_id,
                'total' => number_format($venta->total, 2),
                'created_at' => $venta->created_at->toISOString(),
                'updated_at' => $venta->updated_at->toISOString(),
                'detalles' => $detalles,
                'pagos' => $pagosFormateados,
            ],
        ], 201);
    }
}
