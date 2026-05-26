# Pendiente: Actualizar CierreCajaController con Comisión Vendedor y Ganancia Agencia

## Objetivo

Agregar al cierre de caja los totales de **comisión del vendedor** (`total_comision`) y **ganancia de la agencia** (`ganancia_agencia`) del turno, aprovechando los campos que ya existen en la tabla `ventas` tras los cambios del 2026-05-25.

---

## Contexto

Tras los cambios del día anterior:
- `ventas.total_comision` → suma de comisiones del vendedor por todas las unidades vendidas en esa venta
- `ventas.ganancia_agencia` → lo que queda para la agencia = `ganancia - (comision_unitaria × cantidad)` por detalle

El cierre de caja actualmente calcula:
- Pagos a cuentas / pagos a clientes
- Comisiones a gestores (`comisiones_gestor_total`)
- Gastos, ingresos, transferencias

**Lo que falta:** mostrar en el cierre cuánto ganó el vendedor y cuánto quedó para la agencia en ese turno.

---

## Cambios necesarios

### 1. En `obtenerDetallesCierre()` — agregar sumas por turno

Dentro del método privado, después de procesar los pagos, agregar:

```php
// Sumar comisión del vendedor y ganancia agencia del turno
$totalComisionVendedor = Venta::where('user_id', $user->id)
    ->where('created_at', '>=', $inicioTurno)
    ->where('estado', 'completada')
    ->sum('total_comision');

$totalGananciaAgencia = Venta::where('user_id', $user->id)
    ->where('created_at', '>=', $inicioTurno)
    ->where('estado', 'completada')
    ->sum('ganancia_agencia');
```

Y agregar al array `$result`:

```php
$result = [
    // ...campos existentes...
    'comision_vendedor_total' => round((float) $totalComisionVendedor, 2),
    'ganancia_agencia_total'  => round((float) $totalGananciaAgencia, 2),
];
```

---

### 2. En `create()` — exponer los nuevos campos al frontend

Dentro del array `calculos` que se pasa a `Inertia::render('Cierres/Create', [...])`:

```php
'calculos' => [
    // ...campos existentes...
    'comision_vendedor_total' => $calculos['comision_vendedor_total'] ?? 0,
    'ganancia_agencia_total'  => $calculos['ganancia_agencia_total'] ?? 0,
],
```

---

### 3. En `store()` — guardar o solo exponer (solo reporte)

Estos campos son **solo para reporte** — no mueven dinero. No hace falta guardarlos en `cierre_cajas`. Solo asegurarse de que el frontend los reciba correctamente para mostrarlos en la vista de pre-cierre.

Si en el futuro se decide guardarlos, agregar las columnas a la migración y al modelo `CierreCaja`.

---

### 4. Fix del bug de variable `$codigo` sobreescrita

En `obtenerDetallesCierre()`, dentro del `foreach ($pagos as $pago)`:

**Línea 526** define:
```php
$codigo = $pago->moneda ? $pago->moneda->codigo_moneda : 'USD'; // moneda ej: 'USD'
```

**Línea 651** sobreescribe con el código del producto:
```php
$codigo = $producto ? $producto->codigo_producto : ''; // ← BUG: pisa la variable de moneda
```

**Fix:** renombrar la variable del producto:
```php
// Línea 651 — cambiar:
$codigo = $producto ? $producto->codigo_producto : '';
// Por:
$codigoProducto = $producto ? $producto->codigo_producto : '';
```

Y actualizar las referencias posteriores dentro de ese bloque que usen `$codigo` refiriéndose al código de producto.

---

## Orden de implementación

1. Fix bug `$codigoProducto` en `obtenerDetallesCierre()` (línea 651)
2. Agregar queries de `total_comision` y `ganancia_agencia` en `obtenerDetallesCierre()`
3. Agregar campos al array `$result`
4. Exponer en `create()` dentro del array `calculos`
5. Actualizar la vista `Cierres/Create` (frontend) para mostrar los nuevos totales

---

## Resultado esperado en el cierre

El pre-cierre mostrará:
- Ventas totales cobradas
- Comisiones a gestores pagadas
- **Comisión del vendedor** (nuevo — solo reporte)
- **Ganancia de la agencia** (nuevo — solo reporte)
