use App\Models\User;
use App\Models\Almacen;
use App\Models\Producto;
use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Models\PagoVenta;
use Illuminate\Support\Facades\DB;

// Seleccionar usuario
$user = User::first();

// Seleccionar un almacén que tenga productos asignados
$almacen = Almacen::has('productos')->first();

// Obtener un producto del almacén
$producto = Producto::with(['almacenes' => function($q) use ($almacen) {
    $q->where('almacens.id', $almacen->id);
}])->first();

// Obtener stock actual
$pivot = DB::table('almacen_producto')->where('almacen_id', $almacen->id)->where('producto_id', $producto->id)->first();
$stockAntes = $pivot->cantidad;

// Datos de venta
$cantidad = 2;
$precioVenta = $producto->vendedores->first()?->pivot->precio_venta ?? $producto->precio_compra_producto + 5;
$subtotal = $cantidad * $precioVenta;

// Crear venta
$venta = Venta::create([
    'user_id' => $user->id,
    'almacen_id' => $almacen->id,
    'total' => $subtotal,
]);

// Registrar detalle
VentaDetalle::create([
    'venta_id' => $venta->id,
    'producto_id' => $producto->id,
    'cantidad' => $cantidad,
    'precio_venta' => $precioVenta,
    'subtotal' => $subtotal,
]);

// Restar stock
DB::table('almacen_producto')->where('almacen_id', $almacen->id)->where('producto_id', $producto->id)->update([
    'cantidad' => $stockAntes - $cantidad
]);

// Registrar pago (opcional)
PagoVenta::create([
    'venta_id' => $venta->id,
    'tipo_pago' => 'efectivo',
    'monto' => $venta->total,
]);

// Cargar relaciones para verificar
$venta->load('detalles.producto', 'pagos');

// Mostrar resultados
echo "✅ Venta realizada exitosamente.\n";
echo "ID Venta: {$venta->id}\n";
echo "Total: \${$venta->total}\n";
echo "Stock actualizado: " . ($stockAntes - $cantidad) . "\n";
