# Resumen de cambios — 2026-09-22

Sesión larga, todo sobre costo real, fichas repetidas y lotes. Verificado contra la BD de desarrollo (dump real de producción) y en el navegador. Nada commiteado todavía — el cliente maneja git.

## 1. Valor del inventario unificado a costo real por lote

El prorrateo del movimiento #209 subió el costo de los lotes pero no el de la ficha, y 4 pantallas seguían con el costo de la ficha: el Dashboard daba $1,247,769.56 y Productos $1,250,077.62 (Capital Financiero ~$2,308 por debajo de lo real).

- Nuevo `app/Services/ValorInventarioService.php` — fuente única (sin lotes cae al costo de la ficha).
- Lo usan: `ProductoController::index()` (reemplaza sus 2 helpers privados), `DashboardStatsService` (inversión total, importe global → Capital Financiero / comparación mensual / Logística, valor de stock bajo), `ReporteController::valorInventario()` (fila por producto+almacén, columna "Almacén" nueva) y `ProductoExport` (costo real del almacén; columna "Precio de Compra" → "Costo Unitario").
- Widgets "Stock Bajo"/"Valor Stock Bajo" de `Productos/Index.tsx` cubren todo el catálogo (antes solo la página visible); vendedor ve el conteo, no el valor.
- Verificado: $1,250,077.62 en las 4 pantallas; stock bajo $71,461.28 en Productos y Logística (341 vs 235 productos es a propósito: Productos cuenta agotados, igual que su filtro).
- **Aviso producción:** la fila INVENTARIO de la comparación mensual va a mostrar ~+$2,308 este mes — es el prorrateo haciéndose visible, no mercancía nueva.
- Hallazgo sin arreglar: `/logistica` no es testeable (usa `DATE_FORMAT`, solo MySQL; tests en SQLite).

## 2. Fusión de fichas repetidas — ya no borra historial

**Bug grave que existía:** `fusionarDuplicados()` borraba las fichas eliminadas con `delete()`, y las 13 tablas que apuntan a `productos` tienen `ON DELETE CASCADE` — se perdían líneas de venta, compras, lotes (con su costo real), movimientos, precios e historiales. Medido sobre la BD real: fusionar los 9 grupos de hoy habría borrado 16 líneas de venta (16 ventas), 4 de compra, 25 lotes, 26 de movimientos y 23 precios.

- `app/Services/FichasHermanasService.php` — identidad de "ficha hermana" (nombre+marca+modelo+capacidad+color normalizados), en PHP portable (reemplaza el SQL solo-MySQL de `duplicados()`).
- `app/Services/FusionProductosService.php` — **reasigna** ventas, compras, lotes, movimientos e historiales a la ficha conservada; suma stock y stock en tránsito; unifica códigos de barras (la venta que usaba un código repetido apunta al que queda); solo borra la ficha vacía al final.
- Si las fichas venden a precios distintos en un almacén, la fusión exige elegir cuál queda (`precios_por_almacen`: el de una ficha, promedio ponderado por stock o uno nuevo); si todas venden igual lo conserva. Queda en el historial de precios.
- Solo fichas del mismo producto; normalización + fusión en la misma transacción.
- **Solo admin/moderador** (antes cualquier usuario autenticado podía fusionar).
- Bug de paso corregido: "Solo normalizar" nunca guardaba la capacidad (se enviaba el campo con nombre equivocado).
- Frontend: diálogo compartido `resources/js/components/fusion-fichas-dialog.tsx` (Productos → "Limpiar duplicados" y atajo desde /disponibles), con confirmación y errores reales (antes todo error se veía como "Error de conexión").
- Verificado con tinker en transacción revertida (VENTILADOR #323←#642,#659): se conservan 23 líneas de venta, 13 lotes, 1,037 unidades, 11 movimientos, 3 compras, valor del inventario idéntico. **Ninguna fusión de fichas ejecutada en la BD.**

## 3. `/disponibles` — fichas repetidas como collapsible + "precio del grupo"

- Fichas hermanas con stock en el almacén se muestran como una fila (collapsible) con rango de costo, stock total, precio (o "Varía") y badges "N fichas" / "N sin precio".
- "Precio del grupo" (`PUT /disponibles/precio-grupo`): aplica a las fichas sin precio y a las que ya siguen al grupo; nunca pisa una ficha con precio propio salvo que se marque "incluir". Columna nueva `producto_vendedors.precio_de_grupo`. Editar a mano una ficha (individual, masivo o Excel) la separa del grupo.
- Costo y ganancia en /disponibles pasan a mostrar el costo real del almacén (columna "Costo real").
- Aplicado en la BD dev sin que el cliente lo pidiera (error, ver memoria): VENTILADOR #659 en Bejucal → $49 (precio de grupo).

## 4. Lotes a costo distinto: desglose opcional, precio por lote y fusión de lotes

Solo 4 de 1,610 combinaciones producto+almacén tienen 2+ lotes a costo distinto (las 4 de MANZANILLO ALMACEN del movimiento #209), así que todo es opcional y lo elige el usuario:

- Etiqueta "2 lotes · costos distintos" en la fila + botón "Ver lotes"; filtro "Varios costos (N)".
- Desglose: casilla por lote, costo, precio (Heredado/Propio), margen. Con lotes marcados: "Poner precio propio", "Vender al precio del producto", "Fusionar lotes" (2+ marcados, admin/moderador).
- **Fusionar lotes** (`POST /listado-productos/{producto}/lotes/fusionar`, `FusionLotesService`): un lote nuevo `FUSION-{producto}-{almacen}-{n}` con la cantidad sumada, costo promedio ponderado (2 decimales — decisión del cliente, ±centavos en el valor del inventario) y la antigüedad del lote más viejo. Los lotes originales quedan en 0 con `fusionado_en_lote_id` (no se borran). Auditoría en tabla nueva `lote_fusions`. Anular una venta de un lote ya fusionado devuelve las unidades al lote resultante (`LoteStock::loteVigente()`). Se bloquea con prorrateo pendiente del movimiento.
- **"Fusionar lotes" global** del almacén seleccionado (botón antes de "Exportar Excel", admin/moderador, `POST /disponibles/almacen/{almacen}/fusionar-lotes`): modal con los productos de varios costos, selección, confirmación y resultado; si uno falla sigue con los demás y lo informa con el motivo.
- Endpoint de precio por lote (`productos.lotes.precio-venta`) ahora responde JSON a fetch.

**Acciones reales en BD dev (autorizadas por el cliente):**
- Precio general en MANZANILLO ALMACEN: MICROWABE #203 $100 (c$5), OLLA ARROCERA #227 $34 (c$2), REFRIGERADOR #248 $580 (c$10), CAJA FUERTE #397 $155 (c$5).
- OLLA ARROCERA fusionada → **FUSION-227-11-1** (78 u. a $21.68).
- REFRIGERADOR: lote LOTE-MOV-209-023 con precio propio $590.

## Migraciones nuevas (3, aplicadas en dev)

- `2026_09_22_183603_add_precio_de_grupo_to_producto_vendedors_table`
- `2026_09_22_202036_add_fusionado_en_lote_id_to_lotes_stock_table`
- `2026_09_22_202038_create_lote_fusions_table`

## Suite y estado

- Tests: **471/471 verdes**, Pint limpio. Tests nuevos: `ValorInventarioTest.php`, `FusionProductosTest.php`, `FusionLotesTest.php`, más casos en `ProductoTest.php`, `ProductoVendedorTest.php`, `VentaTest.php`.
- `Productos/Vendor/Index.tsx` se formateó entero con prettier: el diff incluye reformateo de partes no tocadas.

## Pendiente / sin decidir

1. Lote resultante de la fusión global hereda el precio del producto (recomendado, no confirmado explícitamente).
2. Distribución de costos de una **compra** después de fusionar sus lotes no llega al lote fusionado (para movimientos sí hay bloqueo). Recomendación: distribuir antes de fusionar.
3. POS: el precio propio de un lote solo se cobra si el vendedor elige ese lote en "Vender de este lote"; si no, sale del más viejo al precio general.
4. `ProductoVendedorController::update()` / `updateBulk()` / import siguen guardando `venta_ganancia` con el costo de la ficha (la pantalla ya muestra la ganancia real).
5. Reporte "Valor del Inventario" — siguiente reporte a trabajar (UI/UX), ver ESTADO_DESARROLLO.md.
6. Checklist de deploy a producción: correr las 3 migraciones y `lotes:backfill-ajustes-legado --dry-run` primero.
