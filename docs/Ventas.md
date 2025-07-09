<!-- Detalles para funcionalidad -->
$user = User::find(2); // Cambiar por ID válido
$almacen = Almacen::find(2); // Cambiar por ID válido



<!-- Copy - Paste  -->
<!-- php artisan tinker -->



use App\Models\User;
use App\Models\Almacen;
use App\Models\Producto;
use App\Models\Venta;
use App\Models\VentaDetalle;
use App\Models\PagoVenta;
use Illuminate\Support\Facades\DB;

// Seleccionar un usuario válido
// $user = User::first();
$user = User::find(3);

// Seleccionar un almacén que tenga productos asignados
// $almacen = Almacen::has('productos')->first();
$almacen = Almacen::find(4);

if (!$almacen) {
    echo "❌ No se encontró un almacén con productos.\n";
    return;
}

// Obtener un producto del almacén seleccionado
$producto = Producto::with(['almacenes' => function($q) use ($almacen) {
    $q->where('almacens.id', $almacen->id);
}])->first();

if (!$producto) {
    echo "❌ No hay productos disponibles en este almacén.\n";
    return;
}

// Obtener stock actual del producto en ese almacén
$pivotStock = DB::table('almacen_producto')->where('almacen_id', $almacen->id)->where('producto_id', $producto->id)->first();

if (!$pivotStock) {
    echo "❌ El producto no está asignado a este almacén.\n";
    return;
}

$stockAntes = $pivotStock->cantidad;

// Validar stock suficiente
if ($stockAntes < 2) {
    echo "❌ Stock insuficiente para realizar la venta.\n";
    return;
}

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

// Registrar detalle de venta
VentaDetalle::create([
    'venta_id' => $venta->id,
    'producto_id' => $producto->id,
    'cantidad' => $cantidad,
    'precio_venta' => $precioVenta,
    'subtotal' => $subtotal,
]);

// Restar stock en el almacén
DB::table('almacen_producto')->where('almacen_id', $almacen->id)->where('producto_id', $producto->id)->update([
    'cantidad' => $stockAntes - $cantidad
]);

// Registrar pago
PagoVenta::create([
    'venta_id' => $venta->id,
    'tipo_pago' => 'efectivo',
    'via_pago' => 'transfermovil',
    'tipo_moneda' => 'cup',
    'monto' => $venta->total,
]);

// Cargar relaciones
$venta->load('detalles.producto', 'pagos');

// Mostrar resultados
echo "✅ Venta realizada exitosamente.\n";
echo "Usuario: {$user->name}\n";
echo "ID Venta: {$venta->id}\n";
echo "Total: \${$venta->total}\n";
echo "Stock antes: $stockAntes → Stock después: " . ($stockAntes - $cantidad) . "\n";

foreach ($venta->pagos as $pago) {
    echo "💵 Pago: {$pago->tipo_pago} via {$pago->via_pago}, Monto: \${$pago->monto} ({$pago->tipo_moneda})\n";
}
