# Propuesta: costo promedio ponderado por almacén

**Estado: propuesta, sin implementar.** Analizado el 2026-08-15 a partir de una duda del cliente sobre qué pasa al comprar un producto ya existente que además requiere prorratearse dos veces (movimientos a almacenes lejanos). Este doc es para proponérselo al cliente antes de tocar código — no arrancar la implementación sin luz verde explícita.

## El problema, en palabras del cliente

Cuando se compra un producto que ya existe en el sistema y ese producto todavía no tiene el costo de transporte prorrateado, y además ese producto se mueve a un almacén lejano (necesitando un segundo prorrateo de transporte), el cliente hoy resuelve el desajuste **a mano**: busca productos "duplicados" con todas las características idénticas en el mismo almacén, y saca un precio nuevo por promedio entre ellos.

## Cómo funciona el sistema hoy (verificado en código, 2026-08-15)

### Identidad del producto (cuándo es "el mismo")
`CompraController::store()` matchea por `nombre_producto` + `categoria_id` + `marca_producto` + `modelo_producto` + `capacidad_producto`. Si coinciden, es el mismo `Producto`, no crea uno nuevo. **`color_producto` no es parte de esta identidad** — se sobreescribe en silencio si cambia entre compras del "mismo" producto (hallazgo aparte, ya reportado, no relacionado con esta propuesta).

### Dónde vive el costo
El costo (`precio_compra_producto`) es **un solo campo global en la tabla `productos`** — no existe por almacén, no existe por lote/compra. Cada compra que matchea el mismo producto **sobreescribe** ese campo sin condición con el precio de la compra más reciente (`CompraController::store()`).

### Los dos mecanismos de prorrateo, ambos en `TransaccionController.php`
1. **`distribuirCostosManual()`** — reparte un monto manual entre los productos de una compra. UI: `Transacciones/CambiarCostoManual.tsx`. Fórmula: `nuevoCosto = costoActual + incrementoUnitario` — **suma** sobre el costo actual, no lo reemplaza.
2. **`gastoTransportacion()`** — reparte un gasto de transporte (3 modos: proporcional, igualitario, manual) vía `distribuirTransportacion()`. Misma lógica: `nuevoCosto = precio_compra_producto + monto_usd` — también **acumula**.

**Ninguno de los dos es idempotente.** No hay ningún flag en `Compra` ni en el pivot `compra_producto` que marque "ya distribuido" — nada impide correr cualquiera de los dos métodos dos, tres o más veces sobre la misma compra. Mecánicamente, "prorratear dos veces" ya es posible hoy.

### Movimientos entre almacenes no tocan costo
`MovimientosController.php` no tiene ninguna referencia a `precio_compra_producto` ni a distribución de costos — mover un producto a un almacén lejano no dispara nada automático, es 100% manual, sin conexión entre ambos módulos. Existe una columna `movimiento_detalles.costo_unitario` (migración `2025_09_20_161910`) pero está **muerta, no se usa en ningún lugar del controller**.

### No existe concepto de "lote" ni de costo por almacén
No hay tabla ni columna que agrupe líneas de `compra_producto` como "mismo lote físico" a través de compras/movimientos distintos.

## El problema de fondo

Como el costo es un solo número global por producto, cuando el mismo producto termina en dos almacenes por caminos distintos — uno cerca sin prorrateo extra, otro lejos con prorrateo de transporte encima — **no hay forma de que ambos convivan con su costo real**. El segundo prorrateo (dirigido al almacén lejano) le pega el mismo golpe de costo a las unidades que ya estaban en el almacén cercano, que nunca viajaron esa distancia. Ahí es donde el cliente termina haciendo manualmente lo que en realidad es **costo promedio ponderado** (weighted average cost — método estándar de costeo de inventario): busca "duplicados" y promedia, porque el sistema no tiene ningún mecanismo automático para eso.

## Recomendación

Mover el costo de "un campo global en `Producto`" a **un costo por combinación producto + almacén** — viviría naturalmente en `AlmacenProducto`, que ya es la tabla que trackea stock por almacén. Cada vez que entra costo nuevo a un almacén específico (por una compra nueva, o por un prorrateo de transporte dirigido a ese almacén), se recalcula con la fórmula estándar de costo promedio ponderado:

```
nuevo_costo = (stock_actual × costo_actual + cantidad_nueva × costo_nuevo) / (stock_actual + cantidad_nueva)
```

Esto resuelve los dos problemas de una sola vez:
- Un segundo prorrateo de un envío lejano solo afecta el almacén al que realmente fue, sin contaminar el costo de otros almacenes con el mismo producto.
- El cliente deja de tener que buscar y promediar "duplicados" a mano — el sistema ya lo calcula automáticamente cada vez que entra stock nuevo.

## El tradeoff — esto es un cambio de esquema real

- Nuevo campo de costo en `AlmacenProducto`, con migración de datos existentes (¿qué costo le asignamos a lo que ya está en stock hoy? probablemente el `precio_compra_producto` global actual, como punto de partida por almacén).
- Rediseñar cómo escriben `distribuirCostosManual()` y `gastoTransportacion()` — hoy le pegan al producto entero; tendrían que apuntar a un almacén específico (¿cuál, si la compra reparte a varios almacenes a la vez?).
- Decidir qué hace el resto del sistema que hoy lee `precio_compra_producto` como un solo número (reportes de ganancia, precios de venta, `HistorialPrecioCosto`, `ProductoVendedor`) — ¿muestran un promedio ponderado entre todos los almacenes del producto, o pasan a pedir "¿de cuál almacén?" en cada pantalla que hoy asume un solo costo?
- `MovimientosController` necesitaría un punto de enganche nuevo: cuando un movimiento se recibe en el almacén destino, ¿el costo viaja con el producto (mismo costo del almacén origen) o se abre la puerta a prorratear transporte ahí mismo?

## Próximo paso

No implementar todavía. Proponer esto al cliente, confirmar que el enfoque (costo por almacén + promedio ponderado automático) resuelve lo que él hace manualmente hoy, y decidir junto con él las preguntas abiertas de la sección anterior antes de tocar el esquema.
