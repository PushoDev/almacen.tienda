2. Que la ganancia en /disponibles use el costo del almacén
ProductoVendedorController.php:118, :212 y :297 y PreciosVendedorImport.php:81 calculan venta_ganancia con el costo fijo. La línea 418 del mismo controlador ya usa costoEnAlmacen(). En Manzanillo, después del prorrateo, quien pone el precio ve un margen mayor al real. Encaja con tu idea de mostrar el desglose por lote en /disponibles: se pueden hacer juntas.

3. Quitar la ruta vieja que todavía cambia costos
POST transacciones/gasto-transportacion sigue registrada (TransaccionController::gastoTransportacion). Cambia solo el costo de la ficha y no toca los lotes, así que desincroniza el costo. El frontend ya no la llama, pero la ruta sigue abierta. Hoy Distribución de Costos cumple esa función, así que se puede eliminar.

4. Dejar claro qué significa precio_compra_producto
Ahora es solo "último costo de compra / respaldo". No hace falta migración: basta con cambiar la etiqueta en pantalla, por ejemplo "Costo de referencia (última compra)", donde se sigue mostrando. Así nadie lo confunde con el costo real.

5. Producción
Al desplegar hay que correr php artisan lotes:backfill-ajustes-legado antes que nada, primero con --dry-run. Sin eso, los puntos 1 y 2 en producción mostrarían el costo fijo para casi todo el catálogo.