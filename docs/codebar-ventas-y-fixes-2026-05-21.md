# Codebar en Ventas + Fixes — 2026-05-21

## Resumen

Sesión de trabajo enfocada en tres áreas: completar el sistema multi-codebar para el flujo de ventas, corregir el accessor faltante en el modelo `Producto`, y asegurar que todos los `ProductoCodigo` generen su imagen de barcode en formato Code128 (DNS1D + C128).

---

## 1. Sistema Multi-Codebar en Ventas

### Contexto
El commit anterior (`e69087dd`) había completado el lado de **Compras**: un producto puede tener múltiples `ProductoCodigo`, y al registrar una compra se crea o actualiza el código correspondiente con su stock. Esta sesión extendió la misma lógica al flujo de **Ventas**.

### Migración
**Archivo:** `database/migrations/2026_05_21_120000_add_producto_codigo_id_to_venta_detalles_table.php`

Agrega la columna `producto_codigo_id` a `venta_detalles`:
- `nullable()` — no rompe registros históricos
- FK a `producto_codigos` con `nullOnDelete()`
- Ya aplicada en producción (migración corrida previamente)

### Backend — `VentaController`

| Método | Cambio |
|---|---|
| `getProductosPorAlmacen` | Devuelve `codigos[]` con `es_default` por cada producto |
| `procesarVenta` | Valida `producto_codigo_id` como `required`, verifica que pertenezca al producto, descuenta stock del código exacto en vez de FIFO |
| `anularVenta` | Devuelve stock al mismo código usado; fallback al default para ventas antiguas sin `producto_codigo_id` |
| `show` | Carga relación `detalles.productoCodigo`, expone `codigo_vendido` en la respuesta |

**Lógica de descuento anterior (eliminada):**
```php
// FIFO automático por todos los códigos
$codigos = ProductoCodigo::where('producto_id', ...)
    ->where('cantidad', '>', 0)
    ->orderBy('es_default', 'asc')
    ->get();
```

**Lógica nueva:**
```php
// Descuento directo al código seleccionado en la venta
$codigoVenta = ProductoCodigo::where('id', $item['producto_codigo_id'])
    ->where('producto_id', $item['producto_id'])
    ->first();
$codigoVenta->decrement('cantidad', $item['cantidad']);
```

### Backend — `VentaDetalle` model

- `producto_codigo_id` agregado a `$fillable`
- Relación `productoCodigo()` → `belongsTo(ProductoCodigo::class)`

### Frontend — `Vendor/Index.tsx`

**Nuevas interfaces:**
- `ProductoCodigoVenta` — `{ id, codigo_barras, cantidad, es_default? }`
- `ItemCarrito` extendido con `producto_codigo_id` y `codigo_barras_usado`

**Nueva función `resolverCodigoParaVenta(producto, codigoForzadoId?)`:**
Prioridad de resolución:
1. `codigoForzadoId` si se pasa explícitamente (scan directo, Enter en búsqueda)
2. Selección del usuario en `codigoSeleccionadoPorProducto`
3. Coincidencia exacta con el texto de búsqueda actual
4. Único código disponible
5. Código marcado como `es_default` o primero disponible

**UI:**
- Tarjetas de producto muestran un `Select` cuando hay más de un código con stock disponible
- El carrito muestra `Codebar: {codigo_barras_usado}` por cada ítem
- Stock máximo calculado como `min(stock_almacen, codigo.cantidad)`
- Búsqueda filtra por `codigos[].codigo_barras` además de nombre/marca
- Presionar **Enter** en búsqueda agrega el producto si hay coincidencia exacta de codebar
- Modal de Vista Rápida incluye el mismo `Select` de selección de código

**Vista Rápida modal (fix adicional):**
- Selector de código integrado cuando el producto tiene múltiples codebarras
- Botón "Agregar" deshabilitado si `codigosDisponibles.length === 0`

### TypeScript — `types/index.d.ts`

- `VentaDetalleProps` extendida con `producto_codigo_id?: number | null`
- `VentaDetalleProps.producto` extendida con `codigo_vendido?: string | null`

---

## 2. Fix: Accessor `barcode_image_url` faltante

**Archivo:** `app/Models/Producto.php`

**Error:** `BadMethodCallException: Call to undefined method App\Models\Producto::getBarcodeImageUrlAttribute()`

**Causa:** El campo `barcode_image_url` estaba en `$appends` pero el accessor correspondiente nunca fue creado.

**Fix — accessor agregado:**
```php
public function getBarcodeImageUrlAttribute(): ?string
{
    if (!$this->barcode_image || !file_exists(public_path($this->barcode_image))) {
        return null;
    }
    return asset($this->barcode_image);
}
```

Devuelve `null` si el archivo no existe (consistente con `barcodeImageExists()`), URL completa si existe.

---

## 3. Fix: Generación de imágenes barcode (DNS1D + C128)

### Problema
Los `ProductoCodigo` creados desde el flujo de Compras (`CompraController::store`) tenían `imagen_barcode = null`. Solo `generarYGuardarDefault()` generaba la imagen (para códigos auto-generados). El frontend mostraba el ícono placeholder `<QrCode />` de lucide-react cuando `imagen_barcode` era null, confundiéndose con un QR real.

**Todos los barcodes usan:** `DNS1D::getBarcodePNG($codigo, 'C128', 2, 60, [0, 0, 0], true)` — formato Code128 lineal.

### Fix 1 — `CompraController::store`

Al crear un `ProductoCodigo` nuevo, genera y guarda la imagen inmediatamente:

```php
if (!$productoCodigo->exists) {
    $productoCodigo->es_default = $esPrimerCodigo;
    try {
        $productoCodigo->imagen_barcode = ProductoCodigo::generarImagenBarcode($codigoBarrasInput);
    } catch (\Exception $e) {
        logger()->warning('No se pudo generar barcode para ' . $codigoBarrasInput . ': ' . $e->getMessage());
    }
}
```

### Fix 2 — `ProductoController::show` (lazy generation)

Para registros existentes en BD sin imagen, genera al primer acceso al detalle del producto:

```php
foreach ($producto->codigos as $codigo) {
    if (!$codigo->imagen_barcode) {
        try {
            $imagen = ProductoCodigo::generarImagenBarcode($codigo->codigo_barras);
            $codigo->update(['imagen_barcode' => $imagen]);
        } catch (\Exception $e) {
            logger()->warning('No se pudo generar barcode para ' . $codigo->codigo_barras . ': ' . $e->getMessage());
        }
    }
}
```

---

## Deploy a Producción

Secuencia recomendada para aplicar todos estos cambios sin downtime perceptible:

```bash
php artisan down          # pantalla de mantenimiento
git pull                  # traer cambios
php artisan migrate       # migración nullable, segura
npm run build             # recompilar frontend (~30-60s)
php artisan up            # volver a producción
```

**Por qué es seguro:**
- La migración agrega `producto_codigo_id` como `nullable` — registros existentes no se afectan
- `anularVenta` tiene fallback para ventas antiguas sin `producto_codigo_id`
- `imagen_barcode` se genera lazily al abrir el detalle del producto, sin comandos extra

---

## 4. Fix: N+1 en MovimientosController

### Problema
`MovimientosController::index()` y `show()` cargaban `detalles.producto` sin incluir `almacenes` en el eager load. El accessor `cantidad_total` del modelo `Producto` necesita la relación `almacenes` para calcular `$this->almacenes->sum('pivot.cantidad')`. Al no estar precargada, Eloquent la resolvía con una query lazy por cada producto — una query extra por producto en cada movimiento listado.

Este mismo problema era la causa raíz del error de Inertia en producción:
> *All Inertia requests must receive a valid Inertia response, however a plain JSON response was received.*

Laravel lanzaba una excepción al serializar los productos (por el accessor `getBarcodeImageUrlAttribute` faltante, ya corregido), devolvía HTML de error 500, e Inertia lo rechazaba mostrando ese cartel.

### Fix — `MovimientosController`

```php
// index() — antes
Movimiento::with(['almacenOrigen', 'almacenDestino', 'usuario', 'detalles.producto'])

// index() — después
Movimiento::with(['almacenOrigen', 'almacenDestino', 'usuario', 'detalles.producto.almacenes'])

// show() — antes
$movimiento->load(['almacenOrigen', 'almacenDestino', 'usuario', 'detalles.producto.categoria', 'seguimientos.usuario'])

// show() — después
$movimiento->load(['almacenOrigen', 'almacenDestino', 'usuario', 'detalles.producto.categoria', 'detalles.producto.almacenes', 'seguimientos.usuario'])
```

---

## Archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `database/migrations/2026_05_21_120000_add_producto_codigo_id_to_venta_detalles_table.php` | Nueva migración |
| `app/Models/VentaDetalle.php` | fillable + relación |
| `app/Models/Producto.php` | Accessor `getBarcodeImageUrlAttribute` |
| `app/Http/Controllers/VentaController.php` | procesarVenta, show, anularVenta, getProductosPorAlmacen |
| `app/Http/Controllers/CompraController.php` | Generación de imagen barcode en ProductoCodigo nuevo |
| `app/Http/Controllers/ProductoController.php` | Lazy generation de imágenes barcode en show |
| `app/Http/Controllers/MovimientosController.php` | Eager load de `almacenes` en index y show |
| `resources/js/pages/Vendor/Index.tsx` | UI multi-codebar completa + Vista Rápida modal |
| `resources/js/types/index.d.ts` | VentaDetalleProps extendida |
