# Resumen de cambios — 2026-09-21

Continuación directa de `resumen-cambios-2026-09-20.md` — cierra el punto 1 de esa lista (`Productos/Index.tsx` costo global) y suma una pasada de UX pedida por el cliente sobre la misma pantalla. Todo verificado contra la BD real (dump de producción, sin cambios desde el 09-20) y en el navegador real.

## 1. `Productos/Index.tsx` — costo/cantidad real por almacén + "Total General" corregido

Antes: la columna "Precio"/"Importe" y el "Total General" leían `producto.precio_compra_producto` (costo estático de la ficha), no el costo real por lote que `Show.tsx`/`Edit.tsx` ya usan desde el 09-18/09-20.

**Fix:**
- `ProductoController::costosPonderadosPorProducto()` — costo real ponderado por producto, calculado en bulk (una sola query agregada por página, no por fila) sobre `lotes_stock`. Sin filtro de almacén pondera todos los almacenes del producto; con filtro, solo el elegido.
- `ProductoController::valorRealInventarioTotal()` — mismo criterio para el "Total General", con fallback al costo de la ficha para combinaciones sin ningún lote (catálogo viejo).
- Cantidad por fila: total en todos los almacenes sin filtro, o la cantidad real del almacén filtrado (dato ya cargado en memoria vía el eager-load de `almacenes`, sin query extra).
- Headers cambian a "Costo en {almacén}"/"Cant. en {almacén}" cuando hay un filtro activo, para que no parezca el mismo dato de siempre.

**Verificado contra la BD real:** "Total General" pasó de **$1,247,769.56 a $1,250,077.62** (+$2,308.06). La diferencia coincide casi exacto (a $0.37 de redondeo) con el monto del prorrateo del movimiento #209 del 09-20 ($1,650,000 CUP ÷ 715 = $2,307.69) — confirma que la causa era exactamente esa: el prorrateo sube el costo real del lote pero nunca tocó el campo estático de la ficha que `Index.tsx` seguía usando. Las 131 filas con diferencia real estaban 100% concentradas en "MANZANILLO ALMACEN", el único almacén donde se aplicó un prorrateo reciente.

4 tests nuevos. Suite: 434/434 verdes en este punto.

## 2. Dos bugs de ordenamiento encontrados en el camino (B19)

- Ordenar por "Cant" tiraba **500** — `cantidad_total` es un accessor de PHP, no una columna real, y el backend intentaba `orderBy('cantidad_total', ...)` directo contra la BD.
- Ordenar por "Precio" usaba el costo estático de la ficha aunque la fila ya mostraba el promedio ponderado real — el orden visual podía no coincidir con el número mostrado.

**Fix:** ambos casos reemplazados por subqueries (`orderBy($subquery, ...)`, sintaxis documentada de Laravel) coherentes con lo que se muestra en pantalla — respetan el filtro de almacén activo igual que el resto de la página. 3 tests nuevos. Suite: 436/436.

## 3. Venta #236 — análisis a pedido del cliente (sin tocar código)

Análisis puntual de una venta especial real (BEJUCAL ALMACEN, vendedora Aylin Blanco/moderador). Hallazgos:
- Pérdida real confirmada: -$491.57 (1 "ESTACION" vendida a $1,370 con costo $1,861.57), aprobada por un admin/moderador vía el flujo de solicitud especial (11 segundos entre solicitud y aprobación).
- El receptor "JUANITO PEREZ" / dirección "FDSSA" parece dato de prueba, no un cliente real — sin confirmar con el cliente.
- El sistema no registra quién específicamente aprobó la solicitud (`aprobarSolicitudEspecial()` no guarda `aprobado_por`).
- `ventas.decision_notificada` quedó en `0` en el registro final aunque la notificación de decisión sí se mandó — desincronización de flag, no afecta dinero.

No implementado nada — queda documentado en `ESTADO_DESARROLLO.md` (Media prioridad) para decidir con el cliente.

## 4. Pasada de UX en buscador/filtros y tabla de `Productos/Index.tsx`

A pedido explícito del cliente ("el badge de marca cuesta identificar", "¿esa tabla se ve bien?"):

- **Buscador + filtros en una sola fila** (antes 2 filas apiladas).
- **Categoría/Almacén-filtro/Exportar-a** ganaron etiqueta visible (antes dependían solo del placeholder).
- **Almacén-filtro y Exportar-a → `Combobox`** (21 almacenes, ya no cómodo en un `<select>` simple sin buscador). Categoría se probó como Combobox también, pero el cliente pidió dejarla como `<select>` nativo — no hacía falta para una lista de 17 categorías.
- **Bug real encontrado**: el `Combobox` con un valor no vacío no seleccionaba el texto al enfocar — escribir insertaba el texto en medio del valor existente en vez de reemplazarlo ("TODAS LCOCINAA"). Corregido con `onFocus` → `select()`. No afecta a los demás usos de `Combobox` en el proyecto, que siempre arrancan vacíos.
- **Badge de "Marca"**: de `variant="secondary"` (marrón del tema, se fundía con el fondo oscuro de la tabla) a slate con contraste explícito en claro y oscuro.
- **Tabla**:
  - Truncado silencioso → elipsis real solo cuando de verdad se corta (casos reales confirmados: "INFINITY SOLAR"→"INFINITY S…", "MASTER SONIC"→"MASTER SON…", sin ningún aviso antes).
  - Columna "Código" vacía en el 100% del catálogo real (leía `productos.codigo_producto`, campo nunca poblado) → ahora trae el código de barras real de `producto_codigos` (marcado `es_default`, o el primero si ninguno lo está). 2 tests nuevos (B20).
  - Números (Costo/Cantidad/Importe) alineados a la derecha en header, cuerpo y pie — antes el cuerpo quedaba a la izquierda mientras el pie usaba `text-center`/`text-right`, sin alinear entre sí.
  - Formato de moneda unificado con separador de miles (`toLocaleString('es-VE', ...)`) en toda la tabla — antes mezclaba ese formato (en los widgets de arriba) con `toFixed(2)` a secas (en las celdas), mismo dato con dos formatos distintos en la misma pantalla.
  - Se quitó el `animate-pulse` continuo de las filas en stock bajo — se queda el resaltado rojo estático, ya no compite por atención todo el tiempo.

Todo verificado en el navegador (modo claro y oscuro) contra datos reales, sin errores de consola.

## Suite y estado del repo

- Tests: **436/436 verdes**, Pint limpio.
- Nada commiteado todavía — el cliente maneja git manualmente (ver memoria `feedback_no_git_en_terminal`).

## Pendiente para retomar (de la sesión del 09-20, sin tocar todavía)

1. Precio de venta al recibir stock en un almacén nuevo vía Movimiento (`MovimientosController::recibir()`) — decidir con el cliente. Recomendación ya dada: aviso explícito, no auto-asignar.
2. Desglose por lote + atajo a "fusionar duplicados" en `/disponibles` al asignar precio.
3. Confirmar con el cliente si la Venta #236 (y el receptor "JUANITO PEREZ") es real o de prueba.

Detalle completo de cada hilo en memoria: `project_compras_ficha_nueva_siempre_2026_09_18` (actualizada), `project_productos_index_tabla_filtros_pass_2026_09_21` (nueva), `project_venta_236_analisis_2026_09_21` (nueva).
