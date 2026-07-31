# Comisión Vendedor y Gestor — Cambios 2026-05-25

> ⚠️ **Snapshot histórico**: para las reglas de comisión vigentes (incluye los casos añadidos después, como venta especial → comisión 0) usar [ventas/contexto-actual.md](ventas/contexto-actual.md), que es el documento actualizado. Este archivo queda como referencia del cambio original.

## Resumen

Se implementó el tracking de comisiones de vendedor por venta, con soporte correcto para ventas mediante gestor donde el precio sube por encima del precio base del almacén.

---

## Modelo de negocio

Cada producto en `producto_vendedors` tiene tres campos clave:

| Campo          | Descripción                                      |
|----------------|--------------------------------------------------|
| `precio_venta` | Precio base del almacén                          |
| `comision`     | Lo que gana el **vendedor** por unidad vendida   |
| `venta_ganancia` | Ganancia bruta = precio_venta - precio_compra  |

### Fórmulas

**Venta normal (sin gestor):**
- Ganancia Total = `(precio_venta - costo) × cantidad`
- Comisión Vendedor = `comision_base × cantidad`
- Ganancia Agencia = `Ganancia Total - Comisión Vendedor`

**Venta con gestor (precio inflado):**
- El gestor sube el precio: `precio_venta_gestor > precio_base`
- Ganancia Total = `(precio_venta_gestor - costo) × cantidad`
- Comisión Vendedor = `(comision_base + markup) × cantidad`
  - donde `markup = precio_venta_gestor - precio_base`
- Ganancia Agencia = `Ganancia Total - Comisión Vendedor` → **igual que sin gestor**

### Ejemplo con BATIDORA EKO RECARGABLE

| | Sin gestor | Con gestor |
|---|---|---|
| Precio venta | $45 | $50 |
| Costo | $18 | $18 |
| Ganancia Total | $27 | $32 |
| Comisión base | $3 | $3 |
| Markup gestor | $0 | $5 (50-45) |
| Comisión Vendedor | $3 | $8 |
| **Ganancia Agencia** | **$24** | **$24** ✅ |

---

## Cambios en base de datos

### Migración: `comision_unitaria` en `venta_detalles`
```
2026_05_25_000001_add_comision_unitaria_to_venta_detalles_table.php
```
- Columna: `comision_unitaria DECIMAL(10,2) DEFAULT 0`

### Migración: `total_comision` en `ventas`
```
2026_05_25_000002_add_total_comision_to_ventas_table.php
```
- Columna: `total_comision DECIMAL(10,2) DEFAULT 0`

---

## Cambios en modelos

### `app/Models/VentaDetalle.php`
- Añadido `comision_unitaria` a `$fillable`

### `app/Models/Venta.php`
- Añadido `total_comision` a `$fillable` y `$casts` (`decimal:2`)

---

## Cambios en el backend

### `app/Http/Controllers/VentaController.php` — `procesarVenta()`

**Antes (incorrecto):** Ponía `comision_unitaria = 0` para ventas con gestor.

**Después (correcto):** Siempre lee `precio_base` y `comision` desde `producto_vendedors`, calcula el markup del gestor y lo suma a la comisión:

```php
$productoVendedor = DB::table('producto_vendedors')
    ->where('producto_id', $item['producto_id'])
    ->where('almacen_id', $validatedData['almacen_id'])
    ->where('user_id', $saveUserId)
    ->first();

$precioBase     = $productoVendedor ? (float) $productoVendedor->precio_venta : (float) $item['precio_venta'];
$baseComision   = $productoVendedor ? (float) $productoVendedor->comision : 0;

$markup          = max(0, (float) $item['precio_venta'] - $precioBase);
$comisionUnitaria = $baseComision + $markup;
$total_comision  += round($comisionUnitaria * $item['cantidad'], 2);
```

### `app/Http/Controllers/VentaController.php` — `show()`

`ganancia_agencia` se calcula como `ganancia - (comision_unitaria × cantidad)`:

```php
'ganancia_agencia' => round($venta->detalles->sum(fn($d) =>
    (float)$d->ganancia - ((float)$d->comision_unitaria * $d->cantidad)
), 2),
```

---

## Cambios en el frontend

### `resources/js/pages/Vendor/Show.tsx`

1. **Interfaz `Venta`** — añadido campo `ganancia_agencia: number`
2. **Etiqueta renombrada** — "Comisión Almacén" → "Comisión Vendedor" (el campo representa la ganancia del vendedor, no del almacén)
3. **Fórmula corregida** — Ganancia Agencia usa `currentVenta.ganancia_agencia` (calculado en backend) en lugar de `total_ganancia - total_comision`
   - Afecta: card de resumen superior, tfoot de la tabla de productos, sección de resumen financiero

---

## Archivos nuevos

| Archivo | Descripción |
|---------|-------------|
| `app/Exports/PreciosVendedorExport.php` | Exporta precios del vendedor a Excel con columnas ID, Producto, Categoría, Stock, Precio Venta (editable), Comisión (editable) |
| `app/Imports/PreciosVendedorImport.php` | Importa precios desde Excel, actualiza `producto_vendedors`, registra en `PrecioHistorial` |

### Export/Import de precios vendedor
- Exporta con hoja protegida (contraseña: `almacen_precios`), columnas editables amarillas
- Import: valida MIME type con `mimetypes:...` (no `mimes:`) para evitar rechazo de xlsx por el browser
- Columna ID visible para verificación y lectura correcta
- Columna Stock incluida para referencia del usuario

---

## Notas importantes

- La comisión es **solo para reporte** — no mueve dinero automáticamente. El dueño distribuye manualmente.
- `saveUserId`: admin/moderador → `user_id = 1`, vendedor → su propio id.
- El gestor NO afecta la comisión base del vendedor. La comisión del gestor es adicional.
- `ganancia_agencia` es la misma con o sin gestor para el mismo producto al mismo precio base.
