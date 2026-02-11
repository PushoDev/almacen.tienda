# Pendiente - Cierre de Caja: Repetición de productos en listado de ventas con múltiples métodos de pago

**Fecha:** 2026-02-09
**Prioridad:** Alta
**Estado:** Pendiente

## Problema

Al realizar una venta con varios métodos de pago, en el listado de productos del cierre de caja se repite cada producto tantas veces como métodos de pago se utilizaron.

**Ejemplo:** Una venta con 1 producto y 5 métodos de pago (efectivo, zelle, paypal, etc.) muestra el producto 5 veces en lugar de 1 vez.

## Ubicación del problema

El código está en `app/Http/Controllers/CierreCajaController.php`, método `obtenerDetallesCierre()` (líneas 267-375).

El problema está en el loop que procesa los pagos:

```php
// --- PROCESAR PAGOS DE VENTAS ---
foreach ($pagos as $pago) {
    // ... código actual itera sobre cada pago y agrega los productos a productos_resumen
    if ($pago->venta && $pago->venta->detalles) {
        foreach ($pago->venta->detalles as $det) {
            // Aquí se agrega el producto POR CADA PAGO, causando la repetición
        }
    }
}
```

## Solución requerida

Los productos de una venta deben contabilizarse **una sola vez**, independientemente de cuántos métodos de pago se usaron.

Posibles enfoques:

1. **Agrupar por venta_id** antes de procesar y acumular los montos de pago por separado
2. **Usar un array de venta_ids procesados** para evitar duplicados en el loop de productos
3. **Separar lógica de cálculo de productos vs. cálculo de pagos**

## Pasos a seguir

1. Revisar el método `obtenerDetallesCierre()`
2. Modificar el loop de pagos para que los productos se agreguen solo una vez por venta
3. Los montos de pago (efectivo/transferencia) sí deben separarse por método de pago
4. Verificar que los totales coincidan con los esperados
5. Probar con ventas de prueba con múltiples métodos de pago

## Archivos relacionados

## Tarea 2 (Nueva): Desglose detallado de operaciones por método de pago

**Fecha:** 2026-02-09
**Prioridad:** Alta
**Estado:** Pendiente

## Problema actual

En el cierre de caja, los métodos de pago muestran solo un resumen:

```
USD Zelle - 2 Operaciones - Total: 400
```

## Lo que se necesita ver

Se requiere expandir cada línea para mostrar el detalle de cada operación individual:

```
USD Zelle - 2 Operaciones - Total: 400
  ├── Venta #123 - Cliente Juan - $150 - [Ver detalles]
  └── Venta #456 - Cliente María - $250 - [Ver detalles]
```

Cada operación debe mostrar:

- ID de venta
- Nombre del cliente
- Monto de la operación
- Enlace/detalle a los productos de esa venta específica
- Hora de la transacción

## Cambios requeridos

### Backend (`CierreCajaController.php`)

1. Modificar `obtenerDetallesCierre()` para que cada item de pago incluya:
    - `venta_id`
    - `cliente_nombre`
    - `monto`
    - `hora`
    - `detalles_productos` (array de productos de esa venta)

2. En el método `obtenerResumenTransferencias()`:
    - Mantener resúmenes por método
    - Agregar array `operaciones_detalladas` con el desglose completo

### Frontend (`Create.tsx`)

1. En el componente de resumen de pagos:
    - Expandir/colapsar para mostrar operaciones individuales
    - Crear sub-componente o modal para ver productos de cada venta
    - Mostrar: cliente, hora, monto, y lista de productos

## Estructura de datos esperada

```php
// En productos_resumen o nuevo campo operaciones_por_metodo
'operaciones_detalle' => [
    [
        'venta_id' => 123,
        'cliente' => 'Juan Pérez',
        'monto' => 150.00,
        'hora' => '14:30',
        'productos' => [
            ['nombre' => 'Producto A', 'cantidad' => 2, 'total' => 100],
            ['nombre' => 'Producto B', 'cantidad' => 1, 'total' => 50],
        ]
    ],
    // ... más operaciones
]
```

## Archivos a modificar

- `app/Http/Controllers/CierreCajaController.php`
- `resources/js/pages/Cierres/Create.tsx`
- Posiblemente `resources/js/components/ui/accordion.tsx` (si existe)
