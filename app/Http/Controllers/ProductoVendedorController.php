<?php

namespace App\Http\Controllers;

use App\Models\Producto; // ✅ Productos disponibles
use App\Models\PrecioHistorial; // ✅ Historia
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log; // Usaremos Log para manejar el error

class ProductoVendedorController extends Controller
{
    /**
     * Mostrar productos con precios de vendedor
     */
    public function index()
    {
        $user = Auth::user();

        // Consulta base de productos
        $query = Producto::with(['categoria']);

        // Filtrado por rol y almacenes
        if ($user->role === 'admin') {
            $query->with(['almacenes' => fn($q) => $q->withPivot('cantidad')]);
        } else {
            $almacenIds = $user->almacenes->pluck('id');
            $query->whereHas('almacenes', fn($q) => $q->whereIn('almacens.id', $almacenIds))
                ->with(['almacenes' => fn($q) => $q->whereIn('almacens.id', $almacenIds)->withPivot('cantidad')]);
        }

        // Cargar datos específicos del vendedor actual
        $query->with(['vendedores' => function ($q) use ($user) {
            $q->where('user_id', $user->id)
                ->select('users.id', 'producto_vendedors.precio_venta', 'producto_vendedors.venta_ganancia');
        }])->get(); // Añadido get() aquí

        // Obtener productos
        $productos = $query->get();

        // Transformar datos para el frontend
        $productosTransformados = $productos->map(function ($producto) use ($user) {
            $vendedor = $producto->vendedores->first();

            return [
                'id' => $producto->id,
                'nombre_producto' => $producto->nombre_producto,
                'marca_producto' => $producto->marca_producto,
                'categoria' => $producto->categoria->nombre_categoria ?? 'Sin categoría',
                'precio_compra' => $producto->precio_compra_producto,
                'stock_total' => $producto->almacenes->sum('pivot.cantidad'),
                'precio_venta' => $vendedor?->pivot->precio_venta ?? null,
                'ganancia' => $vendedor?->pivot->venta_ganancia ?? null,
                'tiene_precio' => ($vendedor?->pivot->precio_venta ?? 0) > 0,
            ];
        });

        return Inertia::render('Productos/Vendor/Index', [
            'productos' => $productosTransformados,
            'meta' => [
                'total_productos' => $productosTransformados->count(),
                'role_usuario' => $user->role,
            ],
        ]);
    }

    /**
     * Actualizar precio y ganancia (Método principal)
     */
    public function update(Request $request, $productoId)
    {
        $user = Auth::user();
        $producto = Producto::findOrFail($productoId);

        // Validación de datos
        $validated = $request->validate([
            'precio_venta' => ['required', 'numeric', 'min:0.01'],
        ]);

        // Calcular valores
        $precioVenta = round($validated['precio_venta'], 2);
        // La ganancia se calcula correctamente con el precio_compra_producto actualizado
        $ganancia = round($precioVenta - $producto->precio_compra_producto, 2);

        // Verificar acceso al producto (solo para vendedores)
        if ($user->role !== 'admin') {
            $almacenIds = $user->almacenes->pluck('id');
            if (!$producto->almacenes->whereIn('id', $almacenIds)->isNotEmpty()) {
                return response()->json([
                    'error' => 'No tienes acceso a este producto.',
                ], 403);
            }
        }

        // 💡 Obtenemos el precio anterior antes de actualizar
        $precioAnterior = DB::table('producto_vendedors')
            ->where('producto_id', $productoId)
            ->where('user_id', $user->id)
            ->value('precio_venta');

        // 🛠️ Flag para detectar cambio de precio
        $precioCambio = $precioAnterior !== null &&
            round($precioAnterior, 2) != $precioVenta;

        // Crear o actualizar el registro pivot
        DB::table('producto_vendedors')->updateOrInsert(
            [
                'producto_id' => $productoId,
                'user_id' => $user->id,
            ],
            [
                'precio_venta' => $precioVenta,
                'venta_ganancia' => $ganancia,
                'updated_at' => now(),
            ]
        );

        // 📜 Registramos en el historial solo si hubo cambio
        if ($precioCambio) {
            PrecioHistorial::create([
                'producto_id' => $productoId,
                'user_id' => $user->id,
                'precio_anterior' => $precioAnterior ?? 0.00,
                'precio_nuevo' => $precioVenta,
                'accion' => 'Venta Manual', // 👈 Podrías considerar un campo 'accion' si no existe
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Precio actualizado correctamente',
            'new_profit' => $ganancia,
            'new_price' => $precioVenta,
            'history_recorded' => $precioCambio, // ✅ Información adicional opcional
        ]);
    }

    // ---------------------------------------------------------------------------------------
    // === NUEVO MÉTODO PARA SINCRONIZAR GANANCIAS POR CAMBIO DE COSTO ===
    // ---------------------------------------------------------------------------------------

    /**
     * Recalcula la ganancia (venta_ganancia) para todos los vendedores
     * que tienen un precio de venta establecido para un producto cuyo
     * precio de compra (costo) ha cambiado.
     * * Este método es llamado internamente por TransaccionController.
     *
     * @param int $productoId
     * @return \Illuminate\Http\JsonResponse
     */
    public function actualizarGananciaPorCambioCosto($productoId)
    {
        // Usamos una transacción para asegurar la atomicidad de la actualización masiva
        DB::beginTransaction();

        try {
            // 1. Obtener el producto y su nuevo costo
            $producto = Producto::findOrFail($productoId);
            $nuevoCosto = $producto->precio_compra_producto;

            // 2. Obtener todos los registros pivot (vendedores) para este producto
            // Bloqueamos los registros para evitar conflictos si un vendedor actualiza al mismo tiempo.
            $registrosVendedor = DB::table('producto_vendedors')
                ->where('producto_id', $productoId)
                ->whereNotNull('precio_venta') // Solo vendedores con precio de venta definido
                ->lockForUpdate() // Bloquear las filas seleccionadas
                ->get();

            $updatedCount = 0;

            foreach ($registrosVendedor as $registro) {
                // 3. Recalcular la ganancia: (Precio de Venta ya establecido - Nuevo Costo)
                $nuevaGanancia = round($registro->precio_venta - $nuevoCosto, 2);

                // 4. Actualizar el registro pivot SOLO con la nueva ganancia
                DB::table('producto_vendedors')
                    ->where('producto_id', $productoId)
                    ->where('user_id', $registro->user_id)
                    ->update([
                        'venta_ganancia' => $nuevaGanancia,
                        'updated_at' => now(),
                    ]);

                $updatedCount++;
            }

            DB::commit();

            // Retornamos una respuesta JSON simple, ya que se llama internamente
            return response()->json([
                'success' => true,
                'message' => "Ganancias actualizadas para {$updatedCount} vendedores.",
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al actualizar ganancias por cambio de costo (ProductoID: ' . $productoId . '): ' . $e->getMessage());

            // Retornamos error. El TransaccionController puede continuar si es un error no crítico.
            // Nota: Como esta función es llamada desde el otro controlador dentro de su propia transacción,
            // un error aquí no revierte la distribución, sino que solo falla la actualización de la ganancia.
            // Podrías decidir que esto lance una excepción fatal si prefieres la atomicidad total.
            return response()->json([
                'error' => 'Error al actualizar las ganancias por cambio de costo.',
                'details' => $e->getMessage(),
            ], 500);
        }
    }

    // ---------------------------------------------------------------------------------------
    // === MÉTODOS EXISTENTES (Historial, create, store, etc.) ===
    // ---------------------------------------------------------------------------------------

    /**
     * Historial de Precios
     */
    public function historial($productoId)
    {
        $historial = PrecioHistorial::with(['usuario', 'producto'])
            ->where('producto_id', $productoId)
            ->latest()
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'producto' => $item->producto->nombre_producto,
                    'usuario' => $item->usuario->name,
                    'precio_anterior' => $item->precio_anterior,
                    'precio_nuevo' => $item->precio_nuevo,
                    'accion' => $item->accion ?? 'Desconocida', // Manejo de 'accion' nulo
                    'fecha' => $item->created_at->format('d/m/Y H:i'),
                ];
            });

        return Inertia::render('Reportes/Report/HistorialPrecios', [
            'historial' => $historial,
        ]);
    }

    /**
     * Métodos no implementados (seguridad)
     */
    public function create()
    {
        abort(404);
    }

    public function store(Request $request)
    {
        abort(405, 'Método no permitido');
    }

    public function show($id)
    {
        abort(404);
    }

    public function edit($id)
    {
        abort(404);
    }

    public function destroy($id)
    {
        abort(405, 'Método no permitido');
    }
}
