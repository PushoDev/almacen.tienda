# Resumen de cambios — 2026-09-25

Sesión sobre **Compras** (doble clic) y sobre la **importación de productos desde Excel**: un lote por fila, historial, deshacer, filas sin stock, plantilla con instrucciones y un flujo en dos pasos con una hoja de revisión tipo Excel. Verificado con tests y en el navegador (rol admin). Tests relacionados: **307/307** (Compras, Productos, Ventas, Movimientos, códigos, fusiones, acceso denegado, valor de inventario e importación); la suite completa no se corrió. Pint y ESLint limpios en lo tocado. Nada commiteado — el cliente maneja git.

## 1. Compras: aprobar / anular / editar con bloqueo de fila

**Problema:** `aprobar()`, `anular()` y `actualizar()` revisaban `estado !== 'pendiente'` con el modelo cargado al inicio de la petición y sin bloquear. Con dos peticiones a la vez (doble clic, dos pestañas, aprobar contra anular o editar) ambas pasaban la revisión:
- `anular()` con reversión **devolvía el dinero dos veces** (el más grave);
- `actualizar()` podía pisar una compra recién aprobada;
- `aprobar()` estaba a medias protegido por el código único del lote (`LOTE-{compra}-{línea}`): la segunda petición reventaba con 500 y se revertía sola, sin duplicar stock.

**Arreglo** (mismo patrón que `anularVenta`): `CompraController::bloquearCompraPendiente()` bloquea la fila con `lockForUpdate`, vuelve a leer el estado dentro de la transacción y lanza `DomainException` (error normal, mismo mensaje de siempre) si otra petición ya la cambió. Las relaciones y `total_compra` se leen **después** del bloqueo.

**Tests:** 3 en `CompraTest.php` ("…con el estado desactualizado…") que reproducen la carrera con una copia obsoleta del modelo; fallan sin el arreglo. Límite: SQLite ignora `lockForUpdate`, así que el bloqueo en sí solo actúa en MySQL (producción); los tests cubren la relectura del estado.

## 2. Import de Excel: un lote por fila

Decisión del cliente: cada fila con unidades crea un **lote nuevo** en el almacén elegido, aunque el producto ya exista con el mismo costo y características. Unir lotes es cosa de la fusión de lotes, nunca del import; los almacenes de una empresa grande comparten productos y variantes.

- `LoteStock` con código `IMP-{producto}-{almacén}-{n}` (`generarCodigoImportacion()`, salta los códigos ya usados: contar lotes repetiría un código si se borran intermedios). Costo = `precio_compra` de la fila; `cantidad_disponible` = cantidad; orígenes en null.
- **El import ya no pisa `precio_compra_producto` de fichas existentes** (antes cambiaba el costo del stock "sin lote" de otros almacenes). Una ficha nueva sí nace con el costo de la fila.
- **Cada fila corre en su propia transacción** (savepoint dentro de la del controlador): una fila que falla se descarta entera y las demás siguen. Antes podía quedar un código sumado sin el stock.
- **Filas sin stock** (`cantidad` 0 o vacía): se registra la ficha y su fila de almacén en 0, sin lote, y `precio_compra` pasa a ser opcional. Sirve de historial de "lo que hemos tenido para volver a comprar". El import **nunca resta stock**: una fila en 0 sobre un producto con stock no lo cambia.
- **Hueco cerrado:** una cantidad negativa restaba stock y un precio negativo creaba un lote inválido. Ahora esas filas se omiten con su motivo.
- Tests: `ProductoImportTest.php` (34), con archivos `.xlsx` reales subidos por la ruta.

## 3. Historial de importaciones y aviso de archivo repetido

- Tablas `importaciones_productos` (una por archivo: quién, cuándo, almacén, archivo, hash, estado, contadores) e `importaciones_producto_filas` (detalle: resultado `importada` / `solo_catalogo` / `omitida`, motivo, lote creado, código de barras usado). Estados: `completada`, `con_omitidas`, `fallida`, `revertida`.
- `ImportacionProductosService` ejecuta la importación y la deja en el historial; lo comparten `ProductoController::import` (ruta directa, sigue viva) y la confirmación de un borrador.
- **Aviso de archivo repetido:** mismo hash + mismo almacén con una importación anterior completada → no importa y devuelve el aviso (`importacion_repetida`); se sigue solo con `confirmar_repetido`. No salta en otro almacén ni si la anterior falló o se revirtió.
- **Importación fallida:** queda registrada como `fallida` con su mensaje, escrita **después** del rollback (dentro de la transacción se habría deshecho con ella).
- Las filas omitidas ya no se pierden en `laravel.log`: van al historial con su motivo.
- Pantallas `Productos/Importaciones/Index.tsx` (listado con filtros de almacén y estado, y borradores pendientes) y `Show.tsx` (contadores y detalle fila por fila paginado, con filtro por resultado). Acceso: admin y moderador.

## 4. Deshacer una importación

`ImportacionProductoController::revertir` — solo admin, con motivo y contraseña (`password_confirmacion`, como la corrección de costo). **Todo o nada:**
- Quita, por cada lote `IMP-…`: el stock del almacén, el código de barras que recibió y el lote. Conserva las fichas y categorías creadas.
- **Bloquea sin tocar nada** si algo lo impide: unidades ya vendidas o trasladadas, lote fusionado, lote eliminado a mano, o stock actual del almacén menor que lo importado. Devuelve la lista exacta.
- Doble clic: bloqueo de la importación y relectura del estado dentro de la transacción.
- **Vista previa** (`importaciones-productos.vista-previa-reversion`): cuenta lotes y unidades y lista los bloqueos, sin modificar nada; el diálogo la muestra antes de pedir motivo y contraseña.
- Se quitó cada protección a propósito para comprobar que los tests la detectan (bloqueos, relectura del estado, descuento del código).

## 5. Flujo en dos pasos y hoja de revisión tipo Excel

Pedido del cliente: poder **revisar y editar el import antes de confirmar**, en una vista propia con diseño de Excel.

**Flujo:** subir el Excel (`importaciones-borradores.preparar`) → se lee a un **borrador** (`importaciones_borradores`, filas en JSON; no toca el inventario; retomable desde el historial) → vista `Productos/Importaciones/Revisar.tsx` → **confirmar** (`.confirmar`, importa lo que se ve con el mismo importador y el mismo historial y borra el borrador) → diálogo de resultado en `Productos/Index.tsx`.

**Dependencia nueva (aprobada por el cliente): `react-data-grid` 7.0.0-beta.61, versión exacta fijada.** Se compararon: Fortune-sheet (8 MB, Excel completo, de más), AG Grid (21 MB; el pegado de rangos es de pago), Handsontable (licencia no comercial), Glide (no soporta React 19) y TanStack Table (ya instalada, pero solo maneja datos). MIT, 0.4 MB, sin dependencias, pide React `^19.2` (el proyecto tiene `^19.2.1`). Es beta y su API cambia entre versiones, por eso se fijó.

**La hoja (`.hoja-excel` en `app.css`, claro y oscuro):** barra de título verde Excel con archivo y almacén; cinta (agregar fila / 10 filas, eliminar seleccionadas, guardar borrador, descartar, confirmar); **barra de fórmulas** (celda activa "G4" + contenido editable); letras de columna y numeración de filas; estado por fila (verde a importar, azul sin stock, rojo con error) con su motivo en la columna Observación; pestaña "Hoja1" y barra de estado con el resumen en vivo (filas, a importar, sin stock, con error, unidades, valor); la mascota de fondo como marca de agua (variante B del patrón `docs/patron-mascota-bleed.md`, contenido envuelto en `relative`). Edición de celdas, **pegado de rangos desde Excel** (handler propio: la librería solo pega una celda), relleno arrastrando, Supr para vaciar y agregar/borrar filas. `evaluarFila` es un espejo en TypeScript de `ProductoImport::model()`: el servidor manda.

**Confirmación:** diálogo con archivo, almacén, qué va a pasar y cuántas filas con error se omitirán. El aviso de archivo repetido también sale aquí.

## 6. Plantilla con instrucciones

- `PlantillaProductoLibro` = hoja **"Productos" vacía** (la primera, porque el importador lee la primera hoja) + hoja **"Instrucciones"** (pasos, tabla de columnas con obligatoria/opcional, qué pasa al importar, límites y un ejemplo lleno). La plantilla anterior traía **5 filas de ejemplo dentro de "Productos"**: quien las olvidara las habría importado como stock real.
- Comentarios de cabecera actualizados (precio obligatorio solo con cantidad; 0/vacío = solo catálogo).
- 3 tests, incluido un viaje de ida y vuelta: se llena la plantilla descargada y se sube al borrador.

## 7. Diálogos: estilo y animación

- Estilo del ejemplo que pegó el cliente (círculo con ícono, título, descripción corta, recuadro "qué sigue", botones): confirmar importación, resultado (verde / ámbar con omitidas), archivo repetido y deshacer con vista previa. En `components/importaciones/`, sobre los `Dialog` de shadcn, en español y con tema claro/oscuro. Se descartó el "Achievement" del ejemplo (XP, emojis, morado).
- **Bounce moderado** en todos los diálogos y modales: `animate-dialog-bounce` (escala 0.85 → 1.03 → 0.99 → 1 en 0.35 s, sin giro, cierre sin rebote, desactivado con *reduced motion*). Usa `scale` y `opacity` individuales, no `transform`, porque el centrado va en `translate`. Aplicado en `dialog.tsx`, `alert-dialog.tsx` y los 4 modales hechos a mano (`StoreSelector`, `ProductQuickView`, y los de importar y duplicados de `Productos/Index.tsx`); el spinner de `Comprar/Index.tsx` y los `sheet` quedaron fuera.

## 8. Aprendizajes y trampas

- **Vite + dependencia nueva:** con el servidor ya encendido, la primera carga de la hoja falló con "Invalid hook call / Cannot read properties of null (reading 'use')" (segunda copia de React al optimizar la dependencia). Recargar o reiniciar `npm run dev`; en producción no aplica.
- **`contain: inline-size`** en la hoja: sin él, el ancho natural de las 11 columnas ensanchaba todo el layout (`main` medía 1824 px en una ventana útil de ~1620) y la página tenía scroll horizontal.
- **Pint reescribe `pest()->extend(...)`** de `tests/Pest.php` (trampa ya documentada en `.ai/rules/tests.md`) al correr `--dirty` con ese archivo modificado: se restauró dos veces. Ahora se corre `vendor/bin/pint app routes database tests/Feature` y se revisa esa línea.
- **Test intermitente propio:** dos `.xlsx` generados en segundos distintos tienen hashes distintos (el zip lleva fecha/hora) y el aviso de archivo repetido no saltaba. `crearExcelImportacion()` (ahora helper compartido en `tests/Pest.php`) devuelve siempre el mismo archivo para las mismas filas.
- `fromArray()` de PhpSpreadsheet trata un 0 como vacío salvo con `strictNullComparison`.

## 9. Despliegue a producción

1. `php artisan migrate` — **5 migraciones nuevas** (las 4 de importación más `add_prorrateo_decision_to_compras_table`, que incluye un backfill): `create_importaciones_productos_table`, `create_importaciones_producto_filas_table`, `add_reversion_to_importaciones_productos_tables`, `create_importaciones_borradores_table` (solo tablas nuevas, sin backfill).
2. `npm ci` y compilar (cambió `package.json` y `package-lock.json`).
3. Nada que correr para lotes: los `IMP-…` solo nacen de importaciones nuevas.

## 10. Lotes de movimientos: acumular, eliminar pendientes, fusionar sin bloqueo

Pedido del cliente tras revisar la LAVADORA EKO SEMIAUTOMATICA 7 KG en Quivicán: el POS mostraba un selector de lote, /disponibles no dejaba fusionar y Productos/Show hablaba de "lotes a costo distinto" con lotes de igual costo. Causa: cada movimiento **siempre** crea un lote nuevo en el destino (`MovimientosController::recibir`), aunque el costo sea igual y no haya prorrateo; el prorrateo pendiente bloqueaba la fusión; y /disponibles solo ofrecía fusionar con costos distintos.

- **Acumular al lote existente** (`FusionLotesService::acumularMovimientoEnLoteExistente`): al recibir un movimiento que no requiere prorrateo, o al **eliminarlo de la lista de pendientes**, sus unidades se suman al lote idéntico del destino (mismo costo, sin precio propio, no fusionado, que no venga de otro movimiento con prorrateo pendiente). El lote del movimiento se conserva en 0 apuntando al que lo absorbió (`fusionado_en_lote_id`) y queda auditado en `lote_fusions`; dos partes del mismo movimiento con igual costo también se juntan.
- **Eliminar de la lista de pendientes** (Distribución de Costos): la acción "Omitir" pasa a "Eliminar de la lista" (botón por fila y en bloque), con un diálogo que explica que no se prorratea y que las unidades se acumulan. Es la misma decisión `omitido` de siempre: el movimiento no se borra y sigue en el historial. Un movimiento de admin/moderador conserva su lote aparte mientras esté pendiente.
- **Fusión sin bloqueo por prorrateo pendiente** (el prorrateo es opcional): se quitó el bloqueo de `FusionLotesService::validar()`; la interfaz avisa que un prorrateo posterior ya no llegará a las unidades fusionadas. La decisión del movimiento no se toca.
- **/disponibles**: desglose por lote y "Fusionar lotes" para productos con 2+ lotes con stock aunque cuesten lo mismo (filtro "Varios lotes"; badge "N lotes" y "· costos distintos" solo si difieren).
- **POS**: el selector "Vender de este lote" solo aparece si los lotes se diferencian en costo o en precio efectivo (`VentaController::lotesParaElegirEnPos`).
- **Productos/Show**: "a costo distinto" solo cuando los costos difieren.
- Tests: 9 nuevos o reescritos (movimientos, fusión, /disponibles, POS); 304 tests relacionados en verde. Se quitó cada regla a propósito para comprobar que los tests la detectan.
- **Lo que NO se hizo:** los lotes ya existentes no se fusionaron (se unen a mano en /disponibles); el indicador de Logística (`ResumenAlmacenService`) sigue contando solo costos distintos.
- **Se revirtió, por segunda vez y a pedido del cliente**, el intento de arreglar los 3 huecos de lotes del POS (lote arrastrado entre almacenes, tope de cantidad al lote, respuestas atrasadas). Siguen como estaban.

## 11. Lo mismo para las compras

Pedido del cliente: hacer con las compras lo mismo que con los movimientos a prorratear. Hasta ahora la pestaña Compras de Distribución de Costos listaba TODAS las compras (no había "pendiente/decidido").

- Migración `add_prorrateo_decision_to_compras_table`: `prorrateo_decision` (null / `aplicado` / `omitido`), `prorrateo_decidido_por`, `prorrateo_decidido_en`; backfill `aplicado` para las compras que ya tienen una distribución. Distribuir costos de una compra la marca `aplicado`.
- **"Eliminar de la lista"** en la pestaña Compras (botón por fila y en bloque; solo admin/moderador): marca `omitido`, la oculta de la lista y acumula sus lotes al lote idéntico del almacén (`FusionLotesService::acumularCompraEnLoteExistente`). Solo aprobadas o anuladas sin decisión; las ya prorrateadas siguen visibles con "Detalles". Un vendedor no ve el botón y recibe 403 en la ruta.
- La lógica de acumulación se generalizó (`acumularEnLoteIdentico`, compartida con movimientos). Un lote no puede ser destino si su costo todavía puede cambiar: lotes de un movimiento pendiente o de una compra aprobada sin decidir.
- Tests: 5 nuevos en `CompraTest.php` + 1 aserción; 301 tests relacionados en verde. Mutaciones comprobadas (sin la acumulación y sin la protección de compras sin decidir).
- Despliegue: **1 migración más** (5 en total del día), con backfill de `aplicado`.
- Límite: no se sigue la cadena `lote_origen_id` al elegir destino.

## 12. Segunda tanda: bloqueo del borrador y tests que faltaban

Tras correr la suite completa (604 en verde) se propusieron 8 tests; se hicieron los 4 primeros y el arreglo que destapó el primero.

- **Hueco real cerrado — doble confirmación del borrador de importación.** `ImportacionBorradorController::confirmar()` no bloqueaba el borrador: con doble clic o dos pestañas las dos peticiones pasaban el aviso de «archivo repetido» (solo mira importaciones ya terminadas) e importaban dos veces. Ahora todo corre en una transacción que bloquea la fila (`bloquearBorrador()`) y revisa que siga existiendo; la segunda recibe «Este borrador ya se importó o se descartó.». `ejecutar()` queda como savepoint: si falla, la importación queda `fallida` y el borrador se conserva.
- **Tests nuevos:** (1) doble confirmación con copia obsoleta del borrador; (2) `VentaTest`: un lote de movimiento medio vendido solo acumula lo que queda y anular la venta devuelve las unidades al lote que lo absorbió; (3) `VentaTest`: una importación cuyo lote se vendió por el POS no se puede deshacer, y tras anular la venta sí; (4) el moderador puede eliminar de la lista de prorrateos (movimientos y compras) y ve el botón.
- **Hallazgo:** los tests del moderador fallaron al principio porque `RequireTurnoActivo` bloquea sus escrituras (POST/PUT/PATCH/DELETE) sin turno capturado; no era un bug, se usa `crearTurnoActivo()` de `tests/Pest.php`.
- Se quitó cada lógica a propósito (bloqueo, `loteVigente()`, acumular solo lo disponible, bloqueo de deshacer) y cada test falló.
- 228 tests de los archivos tocados en verde; Pint pasó; `tests/Pest.php` intacto. Suite completa sin correr en esta tanda.
- **Siguen sin test (5 a 8):** fusionar lotes del mismo costo, límites del import, movimiento parcial sin prorrateo con varios productos, doble clic en «Eliminar de la lista».
- Límite conocido: SQLite ignora `lockForUpdate`, el bloqueo real solo actúa en MySQL.

## Pendiente / sin decidir

1. **Límites:** el archivo se limita a 5 MB (`mimes:xlsx,xls|max:5120`, también validado en `Productos/Index.tsx`) y el borrador a 20 000 filas (`ImportacionBorradorController::MAX_FILAS`). El cliente pidió "sin límites": los límites de PHP del hosting compartido (subida, tiempo, memoria) se cambian en hPanel, y una cola real necesita el cron de hPanel (sin configurar). Hoy la confirmación corre síncrona.
2. **Rol:** `ProductoController::import()` y su ruta directa `productos.import` solo exigen sesión (cualquier vendedor puede sumar stock y costos a cualquier almacén). El flujo nuevo exige admin/moderador y deshacer solo admin, pero el botón Importar sigue visible para todos los roles (a un vendedor lo redirige al inicio). Decidir: restringir la ruta directa y ocultar el botón.
3. Los productos nuevos no tienen precio de venta (`producto_vendedor`): el diálogo de resultado lo avisa, pero no hay atajo.
4. No verificado: `tsc` (`npm run types` está roto) ni el deshacer real en el navegador (lo cubren los tests) ni la descarga de la plantilla en el navegador (la cubren los tests).
5. `Productos/Index.tsx` conserva 2 errores de ESLint de antes (un `any` y `productoCompleto` sin usar).
6. Siguen abiertos de antes: las 3 correcciones de lotes del POS (verificado hoy en `Vendor/Index.tsx:316`), el estilo de los 4 export de Excel, los docs `plantilla-importar-productos.md` / `prompt_excel_import.md` / `precios-vendedor-export-import.md` (anteriores a lotes), y todo lo listado en `ESTADO_DESARROLLO.md`.
