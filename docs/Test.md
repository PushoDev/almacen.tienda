use App\Models\User;
use App\Models\Almacen;
use App\Models\Producto;
use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Models\PagoVenta;
use Illuminate\Support\Facades\DB;

// Función reutilizable para registrar una venta
function realizarVenta($userId, $almacenId)
{
    $user = User::find($userId);
    if (!$user) {
        echo "❌ Usuario no encontrado: ID $userId\n";
        return;
    }

    $almacen = Almacen::find($almacenId);
    if (!$almacen) {
        echo "❌ Almacén no encontrado: ID $almacenId\n";
        return;
    }

    // Obtener un producto del almacén
    $producto = Producto::with(['almacenes' => function ($q) use ($almacen) {
        $q->where('almacens.id', $almacen->id);
    }])->first();

    if (!$producto) {
        echo "❌ No hay productos disponibles en el almacén ID $almacenId\n";
        return;
    }

    // Obtener stock actual
    $pivot = DB::table('almacen_producto')
        ->where('almacen_id', $almacenId)
        ->where('producto_id', $producto->id)
        ->first();

    if (!$pivot) {
        echo "❌ El producto no está asignado al almacén ID $almacenId\n";
        return;
    }

    $stockAntes = $pivot->cantidad;

    // Datos de venta
    $cantidad = 1;
    $precioVenta = $producto->vendedores->first()?->pivot->precio_venta ?? $producto->precio_compra_producto + 5;
    $subtotal = $cantidad * $precioVenta;

    // Crear venta
    $venta = \App\Models\Venta::create([
        'user_id' => $user->id,
        'almacen_id' => $almacen->id,
        'total' => $subtotal,
    ]);

    // Registrar detalle
    \App\Models\VentaDetalle::create([
        'venta_id' => $venta->id,
        'producto_id' => $producto->id,
        'cantidad' => $cantidad,
        'precio_venta' => $precioVenta,
        'subtotal' => $subtotal,
    ]);

    // Restar stock
    DB::table('almacen_producto')
        ->where('almacen_id', $almacen->id)
        ->where('producto_id', $producto->id)
        ->update([
            'cantidad' => $stockAntes - $cantidad
        ]);

    // Registrar pago (opcional)
    \App\Models\PagoVenta::create([
        'venta_id' => $venta->id,
        'tipo_pago' => 'efectivo',
        'tipo_moneda' => 'usd',
        'via_pago' => 'otros',
        'monto' => $venta->total,
    ]);

    // Cargar relaciones
    $venta->load('detalles.producto', 'pagos');

    // Mostrar resultados
    echo "✅ Venta realizada exitosamente.\n";
    echo "Usuario: {$user->name}\n";
    echo "ID Venta: {$venta->id}\n";
    echo "Total: \${$venta->total}\n";
    echo "Stock antes: $stockAntes → Stock después: " . ($stockAntes - $cantidad) . "\n\n";
}

// Realizar dos ventas con diferentes usuarios y almacenes
realizarVenta(2, 2); // Usuario ID 2 → Almacén ID 2
realizarVenta(3, 3); // Usuario ID 3 → Almacén ID 3
