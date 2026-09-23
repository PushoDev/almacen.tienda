2. Que la ganancia en /disponibles use el costo del almacén
ProductoVendedorController.php:118, :212 y :297 y PreciosVendedorImport.php:81 calculan venta_ganancia con el costo fijo. La línea 418 del mismo controlador ya usa costoEnAlmacen(). En Manzanillo, después del prorrateo, quien pone el precio ve un margen mayor al real. Encaja con tu idea de mostrar el desglose por lote en /disponibles: se pueden hacer juntas.

3. Quitar la ruta vieja que todavía cambia costos
POST transacciones/gasto-transportacion sigue registrada (TransaccionController::gastoTransportacion). Cambia solo el costo de la ficha y no toca los lotes, así que desincroniza el costo. El frontend ya no la llama, pero la ruta sigue abierta. Hoy Distribución de Costos cumple esa función, así que se puede eliminar.

4. Dejar claro qué significa precio_compra_producto
Ahora es solo "último costo de compra / respaldo". No hace falta migración: basta con cambiar la etiqueta en pantalla, por ejemplo "Costo de referencia (última compra)", donde se sigue mostrando. Así nadie lo confunde con el costo real.

5. Producción
Al desplegar hay que correr php artisan lotes:backfill-ajustes-legado antes que nada, primero con --dry-run. Sin eso, los puntos 1 y 2 en producción mostrarían el costo fijo para casi todo el catálogo.
---

## Despliegue y auditoría de producción — 2026-09-23

### Despliegue (commit `68913e84`)
- `git pull origin main`, `php artisan migrate --force` (las 3 migraciones del 2026-09-22), `optimize:clear` + `optimize`.
- **Punto 5 completado** (con backup de la BD hecho antes):
  - `lotes:backfill-ajustes-legado --dry-run` → 1,485 lotes por crear, ninguno a costo $0.
  - `lotes:backfill-ajustes-legado` → **1,485 lotes AJUSTE-LEGADO creados** (log en el servidor: `~/backfill_real_2026-09-23.log`).
  - Nuevo `--dry-run` → `0 lote(s) de ajuste se crearían`. Cobertura completa (1,660 combinaciones producto+almacén con stock).

### Auditoría de uso en producción (solo lectura, sin cambiar datos)
Producción tiene datos reales desde ~2026-09-09/11 (640 productos cargados el 09-11). Al 2026-09-23: 417 ventas, 237 movimientos, 62 cierres de caja, 9 compras.

**Lo que el cliente sí usa:** ventas diarias, movimientos, cierres, turnos de vendedor (406/417 ventas con turno), venta con lote (145 de 153 líneas desde el 09-20), devoluciones/anulaciones, remesas (4).

**Lo que el cliente todavía NO ha usado:**

| Función | Estado en producción |
|---|---|
| Prorrateo de movimientos | **237 movimientos pendientes de decisión**, ninguno aplicado ni omitido |
| Movimiento #209 (Bejucal → Manzanillo) | Sin prorratear (solo se aplicó en la BD de desarrollo) |
| Distribución de costos de compras | Usada 1 sola vez (2026-09-11) |
| Edición de compras | 0 |
| Precio propio por lote | 0 |
| Fusión de lotes | 0 (y 0 productos con 2+ lotes a costo distinto, porque el #209 no se prorrateó) |
| Fusión de fichas repetidas | 0 — **9 grupos (19 fichas)** pendientes |
| Precio de grupo en /disponibles | 0 (recién desplegado) |

**Otros hallazgos:**
- Los 4 productos trabajados en desarrollo (MICROWABE #203, OLLA ARROCERA #227, REFRIGERADOR #248, CAJA FUERTE #397) **no tienen precio de venta en MANZANILLO ALMACEN** en producción. Lo hecho en la BD de desarrollo no existe en producción: hay que repetirlo allí.
- 262 combinaciones producto+almacén con stock y sin precio de venta: MANZANILLO ALMACEN 108, ROTURA 39, BEJUCAL 26, MANZANILLO TIENDA 1 26, LINYI 25 (en almacenes puede ser intencional; en tiendas no se pueden vender).
- ~11,000 notificaciones sin leer (739 de "prorrateo requerido"): probablemente el cliente no se enteró de la cola de prorrateo.

### Orden sugerido para el cliente
1. Decidir el prorrateo del movimiento #209 (y aplicar u omitir el resto de la cola en Distribución de Costos).
2. Poner precios de venta en Manzanillo (empezando por los 4 productos de arriba y MANZANILLO TIENDA 1).
3. Fusionar los 9 grupos de fichas repetidas (Productos → "Limpiar duplicados").
