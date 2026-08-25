# Prorrateo de Costos en Movimientos — IMPLEMENTADO 2026-08-25

Continuación del hilo de costo-promedio-ponderado (ver `costo-promedio-ponderado-duplicacion-por-almacen-propuesta-2026-08-20.md`). **Nota de nomenclatura:** ese doc llama "Fase 4" a una idea distinta (aplicar la regla de duplicación-por-precio dentro de `recibir()`, nunca implementada). Este documento es un hilo separado — también apodado "Fase 4" en la conversación con el cliente, pero es la pieza de **prorratear costo de transporte en movimientos de inventario**, con su propia especificación dada el 2026-08-22 y desarrollada/implementada el 2026-08-25. No confundir ambos.

## Regla de negocio (dada por el cliente, corregida dos veces en el camino)

Cuando un movimiento de inventario va hacia un almacén que no le pertenece al usuario que lo creó, admin/moderador puede decidir prorratear el costo de transporte de ese envío sobre el costo del producto — **sin obligación**: es una acción libre, nunca bloquea `recibir()` ("antes o después de recibir, o nunca").

**Disparador, versión final (corregida 2026-08-25 dos veces sobre la marcha):**
- **Vendedor:** condicional — `requiere_prorrateo = true` solo si el almacén destino no está entre los almacenes que tiene asignados (`user_almacens`).
- **Admin/moderador: siempre `true`, sin condición.** Primera versión de esta sesión lo restringía a solo vendedores (razón: admin normalmente no tiene almacenes asignados, aplicar el mismo chequeo generaría falso positivo en casi todo). El cliente corrigió eso explícitamente: *"obviamente el movimiento se debe prorratear... si a este [admin] le da la gana de enviar un contenedor completo a otro punto de venta... obviamente se debe prorratear... en la vida real un movimiento es igual que otro, solo cambia el usuario que lo realiza."* La versión final no depende de si el admin tiene o no algún almacén asignado (evita apoyarse en una coincidencia frágil de los datos actuales).

## Mecanismo: sin gate, cola informativa, decisión en lote

Confirmado explícitamente por el cliente vía `AskUserQuestion` (opción elegida: "Acción libre, sin bloqueo"): `MovimientosController::recibir()` **no cambió**, no hay ningún chequeo nuevo ahí — comentario en el código explica por qué, para que nadie lo "corrija" sin contexto. El prorrateo es 100% opcional y se decide desde el módulo "Distribución de Costos" existente (Fase 3), reusando su mismo motor de cálculo.

**Por qué reusar Distribución de Costos en vez de un mecanismo nuevo:** la fórmula de peso-proporcional de Fase 3 usa `Producto.precio_compra_producto` (costo actual) × cantidad — no depende de si la cantidad viene de `compra_producto.cantidad` o de `movimiento_detalles.cantidad_despachada`. Mismo motor, distinta fuente de datos.

## Cambios de esquema

- `movimientos` ganó 4 columnas: `requiere_prorrateo` (bool), `prorrateo_decision` (string nullable: `aplicado`|`omitido`), `prorrateo_decidido_por` (FK users nullable), `prorrateo_decidido_en` (timestamp nullable).
- Tabla nueva `cost_distribution_movimientos` (pivote, espejo de `cost_distribution_compras`).
- **`cost_distributions.purchase_id`/`account_id` se volvieron nullable** (antes NOT NULL) — un lote de movimientos no tiene compra/cuenta "legado" que asignarles. Sin `doctrine/dbal` instalado, se hizo con el patrón de recrear tabla (`create _new` → copiar datos → drop → rename) ya usado en `2026_08_12_190000_make_user_id_nullable_on_historial_comparacion_mensuals_table.php`, con `Schema::disableForeignKeyConstraints()` porque a diferencia de esa migración, esta tabla sí tiene hijos (`cost_distribution_items`, `cost_distribution_cuentas`, `cost_distribution_compras`, `cost_distribution_movimientos`, `costo_historials`). Verificado en real: 1 fila existente, todos sus valores y las relaciones de las tablas hijas sobrevivieron intactas.

## Backend

- `MovimientosController::store()` calcula `requiere_prorrateo` (regla de arriba); `enviar()` dispara `ProrrateoRequeridoNotification` (in-app + Telegram vía `App\Channels\TelegramChannel`, condicional a `telegram_chat_id`) cuando aplica — **corrección a una nota de memoria previa que decía "mismo patrón ya usado hoy" para Telegram en movimientos: no era cierto, `MovimientoStockNotification` solo tenía canal `database`, Telegram no estaba conectado ahí. El patrón sí existía en otras notificaciones (`MovimientoFinancieroNotification`), se copió de ahí.**
- `DistribucionCostosController`: `index()` gana pestaña de movimientos pendientes (solo prop para admin/moderador); `mostrarFormularioDistribucion()`/`distribuirCostosManual()` extendidos para aceptar un lote de movimientos (`movimiento_ids`) además de compras (`purchase_ids`), mutuamente excluyentes (validado en `DistribuirCostosManualRequest::withValidator()` — sin regla nativa `prohibited_with` disponible en esta versión de Laravel, se implementó a mano). El núcleo de cálculo se extrajo a `ejecutarProrrateoAutomatico()`, compartido entre `distribuirLoteCompras()`/`distribuirLoteMovimientos()`. `omitirProrrateo()` nuevo — housekeeping en lote, sin cálculo, admin/moderador-only.
- **La cola de pendientes NO filtra por `estado = en_transito`** — filtra `whereNotIn('estado', ['rechazado', 'cancelado'])`. Corrección durante esta misma sesión: filtrar solo `en_transito` contradecía la regla de "antes o después de recibir, o nunca" (un movimiento ya `recibido_completo` seguía siendo prorrateable). `rechazado`/`cancelado` se excluyen porque el envío nunca ocurrió — no hay transporte real que prorratear.
- Comando `php artisan movimientos:backfill-requiere-prorrateo --dry-run` — backfill de `requiere_prorrateo` para los movimientos que ya existían antes de esta columna. Aplicado en real dos veces (primero con la regla vendedor-only, después con la regla final admin/moderador-siempre-true): **52/52 movimientos reales quedaron `true`** (37 de vendedores + 15 de admin/moderador). Verificado a mano un caso real (#2, Quivican→Bejucal) antes de aplicar.

## Frontend

- `DistribucionCostos/Index.tsx`: pestañas controladas (`Tabs value={tabActiva}`, no `defaultValue`) — **necesario porque la paginación navega con `router.get()` (visita completa de Inertia), que remonta el componente; el estado inicial se deriva de la URL** (si trae `movimientos_page`/`mov_*`, arranca en la pestaña "Movimientos"), si no, se pierde la pestaña activa al pasar de página (bug real encontrado y corregido en esta sesión). Selección en lote (checkboxes) + "Distribuir N seleccionados" / "Omitir N seleccionados" (con `AlertDialog` de confirmación). Paginación 15 por página (antes 10, en ambas pestañas).
- 4 widgets por pestaña, contenido completo distinto (no solo 1 widget compartido — pedido explícito del cliente): Compras → Total de Compras / Operaciones realizadas / Cuentas Disponibles USD/CUP / Tasa CUP/USD. Movimientos → Total de Movimientos / Movimientos por Recibir / Operaciones de Prorrateo realizadas / Cuentas Disponibles USD/CUP. Los widgets "Operaciones realizadas" y "Operaciones de Prorrateo realizadas" son clicables — llevan a `distribucion-costos.historial` con un filtro nuevo `?tipo=compras|movimientos` (categoría, distinto del filtro por compra/movimiento puntual que ya existía).
- Feedback de "Omitir" usa `sileo` (no `sonner`) — mismo patrón que `Movimientos/Index.tsx`/`Comprar/Index.tsx`, pedido explícito del cliente porque el toast plano "se veía algo plano".
- `CambiarCostoManual.tsx`/`Historial.tsx`/`Show.tsx` adaptados para mostrar indistintamente un lote de compras o de movimientos (`tipo`/`movimientoIds` nuevos; `Historial`/`Show` muestran badges "Compra #X"/"Movimiento #X" en la misma columna "Lote").

## Bugs reales encontrados y corregidos en esta sesión (no en el diseño original)

1. **Validación `prohibited_with` no existe** en esta versión de Laravel — crasheaba cualquier request a `distribuirCostosManual()` (compras incluidas). Reemplazado por `withValidator()` manual.
2. **`MovimientoFinanciero` requiere `tipo_movimiento_id=1` existente** en `tipos_movimiento_financiero` — sin seeder de esa tabla en tests, cualquier test que llegue a `ejecutarProrrateoAutomatico()` (compras o movimientos) crashea. No es un bug introducido, es un gap preexistente sin cubrir hasta que se escribieron los primeros tests de este controller.
3. **`limpiarFiltrosMovimientos` borraba las claves equivocadas** (`buscar`/`almacen_id`/`fecha`, las de Compras, en vez de `mov_buscar`/`mov_almacen_id`/`mov_fecha`) — el botón "Limpiar filtro" de la pestaña Movimientos no hacía nada.
4. **`cuentasCUP` quedó referenciada sin declarar** un instante entre dos ediciones consecutivas (HMR lo capturó en vivo) — ya resuelto, cero referencias restantes; recuerda que `eslint` en este proyecto no tiene la regla que detecta variables/imports JSX indefinidos (ver `reference_patron_card_header_degradado`).

## Tests

17 tests nuevos (`MovimientosProrrateoTest.php`, `DistribucionCostosMovimientosTest.php`): cálculo del disparador (vendedor condicional, admin/moderador siempre true), notificación en `enviar()`, `recibir()` sin gate (3 casos: sin decisión/aplicado/omitido), lote de 1 y de varios movimientos con verificación de fórmula (mismo % de aumento por producto, igual que Fase 3), movimiento ya recibido sigue prorrateable, movimiento rechazado no aparece ni es prorrateable, omitir en lote, 403 para vendedor en distribuir/omitir/formulario, mezclar compras+movimientos rechazado por validación. **195/195 tests de la suite completa, verdes.**

## Pendiente, no implementado

- Badge/aviso opcional en `Movimientos/Show.tsx` cuando un movimiento específico requiere prorrateo sin decisión, con link directo a la pestaña — ofrecido, el cliente no lo pidió todavía ("¿lo agrego, o cerramos esta fase?" sin responder aún al cierre de esta sesión).
- Sin verificación en navegador real por pedido explícito del cliente a mitad de sesión ("no verifiques el navegador hasta que te lo pida") — todo lo de esta sesión está verificado por tests automatizados (195/195) + eslint + una revisión manual de imports/variables, no por captura de pantalla.
