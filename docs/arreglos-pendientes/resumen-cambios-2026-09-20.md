# Resumen de cambios — 2026-09-20

**Empezar por acá para continuar esta sesión mañana.** El flujo fue largo (continuación de una sesión anterior cortada por límite de uso) y tocó varios frentes relacionados. Todo lo de abajo ya está **commiteado** (commit `d1605554` "Ajustes de Prorrateo", 2026-09-20 17:55) salvo la actualización de esta documentación.

## Contexto importante que hay que tener presente

- **La base de datos de desarrollo ya no es de prueba — es un espejo real de producción.** A mitad de la sesión anterior (antes de este resumen) se reemplazó por el dump real (`docs/backup/u706356131_gestion.sql`, 661 productos / 297 ventas / 110 lotes). Todo lo verificado hoy (movimiento #209, los 4 productos de Manzanillo, etc.) es sobre datos reales del negocio, no QA.
- El commit `d1605554` incluye, además del trabajo de hoy, un reformateo de estilo (Pint, sin `--dirty`) sobre muchos archivos que no se tocaron esta sesión — arrastrado de la sesión anterior, ya commiteado por el cliente. No afecta lógica.

## 1. Backfill de lotes de ajuste para stock viejo sin `lotes_stock` propio

Auditando el movimiento #209 (Bejucal→Manzanillo) se encontró que varios productos con stock previo en destino no tenían ningún lote que respaldara ese stock — inventario de antes del 2026-09-07 (cuando `lotes_stock` empezó a existir), que caía al costo global de la ficha como fallback. Confirmado que era catálogo-completo, no solo esos productos.

**Fix:** `LoteStock::generarCodigoAjusteLegado()` (prefijo `AJUSTE-LEGADO-`) + comando `php artisan lotes:backfill-ajustes-legado` (`--dry-run` disponible) — crea, por cada combinación producto+almacén donde `almacen_producto.cantidad` > suma de `lotes_stock.cantidad_disponible`, un lote de ajuste por la diferencia, al costo global de la ficha, fechado con `Producto.created_at` (no `now()`) para que el consumo FIFO lo trate como el stock más viejo.

**Ejecutado contra el catálogo completo: 1,512 lotes de ajuste creados.** Verificado: cobertura completa (0 de 1,610 combinaciones producto+almacén con stock real sin respaldo).

## 2. "Opción A" — precio de venta con override opcional por lote

Un mismo producto puede tener 2+ lotes a costo distinto (ej. $21.38 vs $21.85) bajo un único precio de venta por almacén — margen casi nulo en el lote caro. Se implementó un override **opcional** por lote (no obligatorio, para no invisibilizar productos sin precio propio):

- Columna `lotes_stock.precio_venta` (nullable).
- `Producto::precioVentaEnAlmacen()` / `precioVentaEfectivo(LoteStock $lote)` — nuevos helpers.
- Endpoint dedicado `PUT /listado-productos/{producto}/lotes/{lote}/precio-venta` (`ProductoController::actualizarPrecioVentaLote()`), sin contraseña (decisión comercial, no cambio de costo) — admin/moderador o vendedor del almacén.
- POS (`VentaController::getProductosPorAlmacen()` → `Vendor/Index.tsx`): el picker "Vender de este lote" muestra el precio cuando difiere del general, y autocompleta el precio del lote elegido al agregar al carrito.
- `Productos/Show.tsx`/`Edit.tsx`: el desglose por lote (ya existente para costo) ahora también muestra precio de venta por lote, con lápiz de edición en `Edit.tsx`.

7 tests nuevos. Suite completa: **427/427 verdes**.

## 3. Movimiento #209 (Bejucal→Manzanillo) — prorrateo confirmado y aplicado

Quedó pendiente de confirmar desde la sesión anterior (se armó el plan completo pero nunca se envió — la sesión se cortó justo ahí). Ejecutado hoy vía la UI real (Distribución de Costos → Movimientos → #209):

- Cuenta **MANZANILLO TIENDA 1 CUP**: $1,650,000 CUP → saldo bajó de $2,585,969 a **$935,969** (exacto).
- Las 50 líneas del movimiento subieron **+2.1984%** cada una (ej. BATERIA $1,974.09 → $2,017.49).

**Verificado en el navegador en los 4 productos con stock viejo en Manzanillo** (MICROWABE #203, OLLA ARROCERA #227, REFRIGERADOR #248, CAJA FUERTE #397): cada uno muestra ahora "Este almacén tiene 2 lotes a costo distinto" con el lote viejo (AJUSTE-LEGADO, sin tocar) y el del movimiento (subido) — confirma que el backfill del punto 1 + el desglose por lote de Show/Edit funcionan juntos como se esperaba.

## 4. Análisis (sin implementar): `Productos/Index.tsx` sigue mostrando el costo global, no el real por almacén/lote

Las columnas "Precio"/"Importe"/"Total General" (`Index.tsx:938,961,1066`) leen `producto.precio_compra_producto` — el costo global de la ficha, no `Producto::costoEnAlmacen()` ni el desglose por lote que `Show.tsx`/`Edit.tsx` ya usan. Mismo hueco de fondo, en la última pantalla que falta.

**Confirmado que el mismo hueco se puede activar también desde Compras, no solo desde Movimientos:** `CompraController::procesarLineasProducto()` (línea ~544) hace `$producto->fill(['precio_compra_producto' => $item['precio'], ...])->save()` en **todas** las líneas de compra, incluso al reusar una ficha existente por identidad (reactivado el 2026-09-20 — Compras vuelve a fusionar por nombre+marca+modelo+capacidad+categoría, ver memoria `project_compras_ficha_nueva_siempre_2026_09_18`). El propio comentario del código dice que ese campo es solo "referencia de último costo conocido" — un fallback. Si el mismo producto se compra otra vez a otro precio, el costo global se pisa con el de la compra más reciente mientras el stock viejo sigue con su costo real en su propio lote.

**Verificado en la BD real que hoy no hay ningún caso activo** (0 combinaciones producto+almacén con 2+ lotes de compras a costo distinto) — el mecanismo existe pero todavía no se disparó con datos reales.

**Decisión pendiente para mañana:** ¿mostrar el promedio ponderado real por fila (`costoEnAlmacen()` sumado por almacén), o un badge "≠ por almacén"? — con la particularidad de que una fila de `Index.tsx` puede cubrir varios almacenes a la vez (a diferencia de las cards de `Show.tsx`, que separan por almacén).

## 5. Discusión abierta (sin implementar): precio de venta al recibir en un almacén nuevo vía Movimiento

El cliente propuso, a raíz del punto 4, que el precio de venta debería poder asignarse de forma independiente a los lotes — esto **ya existe** estructuralmente (`producto_vendedors`, por producto+almacén, independiente de cuántos lotes de costo haya debajo; la Opción A del punto 2 es solo un override opcional encima de eso).

Lo que sí sigue sin resolver es un hueco más viejo, re-surgido en esta conversación: cuando un **Movimiento** manda stock a un almacén que nunca tuvo `producto_vendedor` ahí, `MovimientosController::recibir()` no crea ningún precio — el producto queda "sin precio" en ese almacén hasta que alguien entra a mano a `/disponibles`. Ya se le habían ofrecido 3 opciones al cliente antes (ver memoria `project_costo_promedio_ponderado`), sin elegir:

1. Prorrateo de costo en Movimientos (ya implementado desde entonces, no resuelve el precio).
2. Aviso explícito "sin precio" ligado a la entrega (notificación a admin/moderador).
3. Cerrar el bypass de venta especial que hoy permite vender sin `ProductoVendedor`.

**Recomendación dada hoy (no implementada, pendiente de confirmar):** no auto-asignar un precio — es una decisión comercial, no algo que el sistema deba inferir solo. Mejor la opción 2 (aviso explícito), consistente con el resto de los estados "pendiente de decisión" que ya existen en el proyecto (ej. prorrateo de Movimientos).

## 6. Idea del cliente (sin implementar): mostrar el desglose por lote en `/disponibles` al asignar precio

Al asignar/editar el precio de venta por almacén (`ProductoVendedorController`, pantalla `/disponibles`) hoy no se ve nada de los lotes debajo — quien pone el precio no tiene forma de saber si ese almacén ya tiene 2+ lotes a costo distinto (justo la señal que justificaría usar un override por lote, punto 2, en vez de un precio único parejo). Propuesta del cliente: reusar ahí el mismo bloque de desglose por lote que ya existe en `Show.tsx`/`Edit.tsx` (`LoteStockProps`, con costo y precio de venta efectivo por lote).

También propuso agregar, en ese mismo lugar, un acceso a "fusionar" — la herramienta de detección/fusión de productos duplicados que **ya existe** en `Productos/Index.tsx` (`cargarDuplicados()`/`fusionarDuplicados()`, ícono `GitMerge`). No sería una función nueva, sino un atajo hacia esa herramienta existente, accesible desde `/disponibles` para tener mejor control por almacén sin tener que ir al listado general.

**Nada implementado — solo la idea, para decidir mañana junto con los puntos 4 y 5.**

---

## Pendiente concreto para retomar mañana (en orden sugerido)

1. **Decidir e implementar el punto 4** (`Productos/Index.tsx` costo global) — promedio ponderado vs badge.
2. **Decidir el punto 5** (precio de venta al recibir en almacén nuevo) — con el cliente, antes de tocar código.
3. **Decidir el punto 6** (desglose por lote + atajo de fusión en `/disponibles`).
4. Evaluar si el mismo backfill de lotes de ajuste (punto 1) necesita correrse también en el servidor de producción real (Hostinger) cuando se despliegue — **el checklist de deploy a producción sigue sin tocar**, todo lo de hoy solo aplicó al entorno local/dev.

## Suite y estado del repo

- Tests: **427/427 verdes**, Pint limpio.
- Todo commiteado en `d1605554` salvo esta documentación.

Detalle completo de cada hilo en memoria: `project_compras_ficha_nueva_siempre_2026_09_18` (actualizada varias veces hoy), `feedback_no_git_en_terminal`, `feedback_workflow_style`.
