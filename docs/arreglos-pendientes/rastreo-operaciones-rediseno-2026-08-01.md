# Rediseño de "Rastreo de Operaciones" — reporte prioritario para el cliente

## Contexto

Es el primer reporte que se trabaja de la lista de 15 (ver `reportes-arreglos-2026-08-01.md`), fuera de orden porque es el que le interesa al cliente. Es un cambio grande — se trabaja **por fases, una a la vez, confirmando antes de tocar código**. No avanzar de fase sin luz verde explícita.

**Decisión actualizada (2026-08-01): Compras queda en estado "emergente" — prioridad media, dentro de este mismo reporte, no descartada.** Primero se construyen las Fases 0-6 sobre Venta/Gasto/Ingreso/Transferencia; Compras se retoma después, como Fase 7, una vez que se vea cómo integrarla bien (el problema de fondo sigue siendo el mismo: `compras` y `compra_pago` no tienen `user_id`, ver Fase 7 abajo). No confundir con "descartada" — el pedido original fue "olvídate de las compras" (por ahora, para no bloquear el resto) y luego se ajustó a "en forma emergente hasta ver cómo las agregamos". Los tipos de operación activos en las Fases 0-6 son: Venta, Gasto, Ingreso, Transferencia (más Cierre de Caja, todavía en discusión — ver ⚠️1).

**Decisión confirmada (2026-08-01): cada reporte del módulo pasa a tener su propio controller.** Hoy los 21 métodos viven juntos en `ReporteController.php` (~900 líneas) — el usuario pidió separarlos para evitar "ligas y conflictos" entre reportes que no tienen nada que ver entre sí. Nuevo namespace: `App\Http\Controllers\Reportes\` (mismo patrón ya usado en el proyecto para `Api/`, `Auth/`, `Settings/`). Esto se hace **de forma incremental, reporte por reporte, a medida que se trabaja cada uno** — no es un refactor masivo de una sola vez de los 21 métodos. Rastreo de Operaciones es el primero en migrar (Fase 0 abajo). Ver también `reportes-arreglos-2026-08-01.md` para la nota general del módulo.

Archivos involucrados:
- Actual: `app/Http/Controllers/ReporteController.php::rastreoOperaciones()` (línea 732)
- Nuevo: `app/Http/Controllers/Reportes/RastreoOperacionesController.php`
- `resources/js/pages/Reportes/Report/RastreoOperaciones.tsx`
- `routes/acciones/reportes.php` (actualizar el binding de la ruta al nuevo controller)
- Nuevos: posible migración si se decide trackear stock (Fase 4).

---

## ⚠️ Decisiones de negocio a confirmar antes de implementar (no bloquean escribir el plan, sí bloquean codear esa parte)

1. **¿"Cierre de Caja" sigue siendo un tipo de operación en este reporte?** El pedido lista Venta/Gasto/Ingreso/Transferencia y no menciona Cierres, que hoy sí aparece como 4to tipo ("Finanzas" se separaría en Gasto/Ingreso/Transferencia). Decidir: se elimina, se mantiene como tipo aparte, o se maneja en otro reporte.
2. **"Stock final" — no existe hoy en ningún lado de la base de datos** (ver Fase 4). Elegir entre: (A) trackear desde ahora hacia adelante — preciso pero sin histórico pasado, (B) reconstrucción retroactiva — complejo y frágil, (C) mostrar stock actual en vez de histórico. Recomendación: (A).
3. **"Observaciones/Detalles"** — Venta no tiene un campo de notas libres hoy (solo `motivo_anulacion`, que solo aplica si se anuló). Decidir si se agrega un campo nuevo, o si esa columna se llena con algo ya derivable (nombre destinatario, resumen de productos).
4. **Rol de acceso** — hoy cualquier usuario autenticado ve todo (auditoría financiera completa del sistema). Al ser un reporte más rico y sensible después del rediseño, confirmar si sigue abierto a todos o se restringe (ej. solo admin/moderador, como ya hace `historialCostoPrecio()`).

---

## Fase 0 — Extraer a su propio controller

- [x] Crear `app/Http/Controllers/Reportes/RastreoOperacionesController.php` (namespace `App\Http\Controllers\Reportes`), mover ahí el método `rastreoOperaciones()` (renombrado a `__invoke()`).
- [x] Actualizar `routes/acciones/reportes.php` para apuntar al nuevo controller.
- [x] Confirmar que `ReporteController.php` no rompe nada al quitarle este método (no hay otros métodos que lo llamen internamente — verificado, es independiente).
- [x] No tocar los otros 20 métodos de `ReporteController.php` todavía — se migran cuando les toque su turno en la lista de 15.

También ya se implementó (antes de Fase 1, junto con Fase 0): Venta como fila colapsable con detalle completo (receptor, comisión PV, mensajero, gestor, pagos, resumen financiero, productos) — ver `transformarVenta()` en el controller.

## Fase 1 — Quitar Compras + separar Gasto/Ingreso/Transferencia (en vez de "Finanzas")

**Nota de implementación (2026-08-03):** como el controller ya no arma un `UNION ALL` de texto crudo (se reescribió a Eloquent en Fase 0), esta fase se implementó re-introduciendo un UNION pero con `DB::query()->fromSub()` en vez de `mergeBindings()` + `DB::raw()` — `fromSub()` ancla los bindings del subquery al bucket `from`, que compila antes que cualquier `where`/`orderBy` de la query externa, evitando desde el diseño el bug de orden de bindings (B9). Se paginan Venta+Gasto ya combinados y ordenados por fecha real a nivel SQL (25 filas mixtas por página, no 25 de cada tipo por separado), y luego se hidrata cada fila con su modelo completo (`Venta::with(...)` / `MovimientoFinanciero::with(['user','tipoMovimiento'])`).

- [x] Backend: **Gasto** agregado al UNION con Venta, usando el nombre real del tipo (`tipos_movimiento_financiero.nombre`) — fila simple sin expandir. El transformer se generalizó a `transformarMovimiento()` (ya no `transformarGasto()`) para servir a cualquier `MovimientoFinanciero`, no solo Gasto.
- [x] Backend: **Ingreso** (`tipo_movimiento_id = 2`) agregado al mismo UNION — reutiliza `transformarMovimiento()` sin cambios, solo se sumó `$ingresosSub` al `unionAll()`.
  - Test de regresión: `tests/Feature/RastreoOperacionesTest.php` (orden mixto Venta/Gasto/Ingreso por fecha, filtro por usuario, filtro por rango de fechas). Suite completa (113 tests, 319 assertions) sigue en verde.
- [x] Backend: **Transferencia** (`tipo_movimiento_id = 3`) agregada al mismo UNION (2026-08-03) — reutiliza `transformarMovimiento()` sin cambios, solo se sumó `$transferenciasSub`. A diferencia de Gasto/Ingreso, Transferencia sí puede cambiar de moneda (origen ≠ destino, ej. CUP → USD), así que `detalle_movimiento.info_general` ahora incluye `tasa_cambio_aplicada`, condicional: `null` cuando `moneda_origen === moneda_destino` (Gasto/Ingreso siempre caen acá, tasa fija 1.0 no aporta nada) y con valor real solo cuando hubo conversión de verdad.
  - Test de regresión: orden mixto con los 4 tipos, filtro por usuario, filtro por rango de fechas, detalle colapsable con origen+destino a la vez (con y sin conversión de moneda, verificando que la tasa solo aparece cuando corresponde). Suite completa: 117 tests, 342 assertions, todos en verde.
  - Verificado en vivo contra transferencias reales de producción (`https://almacen-tienda.test/reportes/rastreo-operaciones`): CUP→USD muestra "Tasa de Cambio: 700" y las 3 cards (Origen/Destino/Monto y Detalle) en su grid de 2+1; USD→USD no muestra tasa.
  - Gotcha de test: `MovimientoFinanciero::factory()->transferencia()` crea 2 `Cuenta::factory()` por defecto (origen+destino) si no se pasan `cuenta_origen_id`/`cuenta_destino_id` explícitos, y `Cuenta::factory()` dispara `Moneda::factory()`, cuya `definition()` usa `fake()->unique()->randomElement([...5 códigos...])` — el tracker de unicidad de Faker persiste para todo el proceso de test (no se resetea por test), así que ese pool de 5 se agota rápido en tests que crean varias Transferencias sin cuenta explícita. Fix: pasar siempre `cuenta_origen_id`/`cuenta_destino_id` con `crearCuentaEnMoneda(crearMonedaUsd())` (usa `firstOrCreate`, no consume el pool de Faker) en vez de dejar que la factory cree cuentas por default.
- [x] Backend: eliminar la subconsulta de `compras` — no aplica, ya no existe desde la reescritura de Fase 0 (Compras nunca se reintrodujo).
- [x] Frontend: Venta/Gasto/Ingreso ya se pintan juntos en `RastreoOperaciones.tsx` (2026-08-03) — `Operacion.tipo` pasó de literal `'Venta'` a `string`, se agregó `moneda` a la fila mostrada siempre explícita (`formatMonto()`: `"USD 74.00"`, `"CUP 87750.00"`, nunca un número pelado), y color por tipo (`colorTipo()`: verde Venta, rojo Gasto, celeste Ingreso, ámbar Transferencia cuando exista). Verificado en vivo contra datos reales de producción (navegador, `https://almacen-tienda.test/reportes/rastreo-operaciones`).
  - **2 bugs reales encontrados y corregidos, señalados por el usuario viendo los datos reales**: (1) `tipos_movimiento_financiero.nombre` es texto libre editable — en la BD de este cliente el id 2 quedó guardado como "Ingreso por Venta" aunque `IngresoController` no tiene nada que ver con ventas (es un ingreso manual genérico a cuenta/cliente/proveedor); ese texto libre no es confiable para mostrar. Fix: el backend ya NO usa `tmf.nombre` — hardcodea la etiqueta por `tipo_movimiento_id` directamente en el SQL (`'Gasto'`/`'Ingreso'` literal, misma convención 1/2/3 que ya usan `GastoController`/`IngresoController`/`TransferenciaController`), y ya no hace falta el join a `tipos_movimiento_financiero` ni cargar la relación `tipoMovimiento`. (2) Los montos en USD solo mostraban el número con `$`, sin sigla — ahora todos los montos muestran la moneda explícita (`formatMonto()` ya no distingue USD como caso especial).
- [x] Frontend: Gasto/Ingreso ahora también son fila colapsable (2026-08-03), igual que Venta — `detalle_movimiento` (backend) trae `info_general` (fecha, estado — sin tasa de cambio, no aplica a estos dos tipos porque son de un solo lado y una sola moneda) y `origen`/`destino` (nullable, solo se llena el lado que aplica: cuenta/cliente/proveedor, nombre, saldo anterior → posterior, moneda). Frontend: `DetalleMovimientoExpandido` + `EntidadMovimientoCard`, mismo lenguaje visual que `DetalleVentaExpandido`. Diseño de `origen`/`destino` ambos nullable a propósito para servir sin cambios cuando se agregue Transferencia (llena los dos a la vez).
  - Columna Tipo pasó a `<Badge variant="outline">` con los colores ya usados en `Cuentas/Show.tsx` (`getFuenteColorClase`): verde Venta, rojo Gasto, celeste Ingreso, ámbar Transferencia (cuando exista).
  - Solo una fila puede estar expandida a la vez (`expandedRow: string | null` en vez de un `Set`) — pedido explícito del usuario para que la pantalla no se llene si se abren varias operaciones seguidas.
  - Para Gasto/Ingreso, la card de entidad (Origen o Destino, nunca ambas) y la de "Monto y Detalle" comparten la misma grilla (`grid-cols-1 md:grid-cols-2`) y caben en una sola fila — antes "Monto y Detalle" iba abajo por separado, desperdiciando espacio. Cuando se agregue Transferencia (llena origen Y destino a la vez), esta misma grilla pasa a 2 filas de 2 sin tocar el layout.
  - Tests nuevos en `tests/Feature/RastreoOperacionesTest.php` (detalle de Gasto con cuenta origen + saldos, detalle de Ingreso con cuenta destino + saldos). Suite completa: 115 tests, todos en verde.
- [x] Backend: filtros rediseñados (2026-08-03, a pedido del usuario tras ver la vista en vivo):
  - **Fecha**: pasó de rango `start_date`/`end_date` a un solo campo `fecha` (un día exacto) — el usuario prefirió explícitamente un único selector en vez de periodo.
  - **`tipo`**: nuevo filtro (`Venta`/`Gasto`/`Ingreso`/`Transferencia`), aplicado con `->where('tipo', ...)` sobre la query externa ya resuelta por `fromSub()` (no reintroduce el patrón de B9 — ver nota actualizada en Fase 2).
  - **`buscar`**: nuevo campo de texto libre, mismo criterio que `Cierres/Show.tsx` (`busquedaTransacciones`, línea ~610): descripción + usuario + nombre de cuenta/cliente/proveedor origen/destino. Para Gasto/Ingreso/Transferencia esto requirió agregar `leftJoin` a `users`/`cuentas` (x2 alias)/`clientes` (x2 alias)/`proveedors` en cada subquery de `movimientos_financieros` — factorizado en `construirSubqueryMovimiento()` para no repetir los 6 joins 3 veces. Para Venta: `leftJoin` a `users` y `destinatarios_venta`.
  - `filtros` (prop del frontend) ya no incluye `start_date`/`end_date`.
  - Tests: filtro de fecha (un día), filtro de tipo, buscador (por cuenta origen de un Gasto, por destinatario de una Venta). Suite completa: 120 tests, 350 assertions, todos en verde.
  - Gotcha real detectado al implementar: la tabla de `Proveedor` es `proveedors` (no `proveedores`) — convención de pluralización de Laravel sobre "Proveedor" sin override en el modelo.
- [x] Backend: **`monto_destino`** agregado a `detalle_movimiento.info_general` para Transferencia — antes solo se podía inferir restando `saldo_anterior_destino`/`saldo_posterior_destino` a mano dentro de la card. Ahora viene explícito (ya calculado, es ese mismo delta) y solo cuando hay conversión real de moneda (mismo criterio que `tasa_cambio_aplicada`), igual que el patrón "monto_origen / monto_destino" que ya usa `Cierres/Show.tsx` (`TransferenciaItem`, línea 46-64) — ahí se recalcula on-the-fly con `CierreCajaController::calcularMontoDestino()`, acá no hace falta duplicar esa fórmula porque ya tenemos el saldo antes/después guardado por movimiento.
- [x] Frontend (2026-08-03): `RastreoOperaciones.tsx` — input de fecha único (reemplaza Desde/Hasta), `<Select>` de Tipo de Operación, campo de texto Buscar (con Enter para disparar filtro), y "Monto Destino: ≈ $X moneda @ tasa" en la card "Monto y Detalle" del detalle de Transferencia, solo cuando hay conversión real. Verificado en vivo contra datos reales de producción: filtro por tipo (Venta), buscador por nombre de cuenta ("BEJUCAL") y por usuario, y el monto destino de la Transferencia #390 (≈ USD 111.43 @ 700, cuadra con el delta de saldo del destino). Type-check limpio, 120 tests siguen en verde (cambios de este paso fueron solo frontend).

## Fase 2 — Arreglar el bug de bindings (mismo patrón que B9 en Cuentas)

Ya confirmado en vivo (ver conversación): `mergeBindings($query)` + `->where('tipo', ...)` posterior corrompe el orden de los bindings cuando hay filtro de fecha/usuario activo a la vez que filtro de tipo. Mismo fix que se aplicó en `CuentaController::obtenerHistorialVentas()`: `addBinding($query->getBindings(), 'where')` en vez de `mergeBindings()`.

- [x] **Resuelto por diseño, no hizo falta el fix manual** — la Fase 1 no reintrodujo `mergeBindings()`+`DB::raw()`, se implementó con `DB::query()->fromSub($queryA->unionAll($queryB)..., 'alias')` (ver nota en Fase 1), que ancla los bindings del subquery al bucket `from` y nunca los deja en el orden ambiguo que causaba B9.
- [x] **Actualización (2026-08-03):** ahora SÍ hay un `->where('tipo', ...)` posterior al UNION (filtro nuevo de Tipo de Operación) — pero se aplica con el builder fluido normal de Laravel sobre la query externa que ya devolvió `fromSub()` (`DB::query()->fromSub(...)->when(...)->where('tipo', ...)`), no con `mergeBindings()` manual. Laravel ordena los buckets de bindings automáticamente en ese flujo; el bug B9 era específicamente por mezclar bindings a mano. Confirmado con test de filtro de tipo + los tests de fecha/usuario ya existentes, todos combinando fecha+usuario+tipo sin corromper resultados.

## Fase 3 — Filas colapsables para Venta, con detalle de productos — CERRADA

- [x] Backend: cada fila de tipo Venta trae su detalle completo vía `transformarVenta()` — `venta->detalles.producto` viene eager-cargado sobre el batch ya paginado (no N+1 por fila visible).
- [x] Frontend: fila padre (Venta) con ícono de expandir/colapsar (`DetalleVentaExpandido`); al expandir, sub-tabla "Productos Vendidos" con Producto, Cantidad, Precio Unitario, Costo Unitario, Ganancia Unitaria, Comisión Unit., Subtotal (7 columnas admin/moderador, 5 para vendedor — costo/ganancia gateados por `puedeVerCosto`, ver fixes de seguridad abajo). Gasto/Ingreso/Transferencia quedan como fila simple sin tabla de productos, pero sí tienen su propio detalle colapsable (`DetalleMovimientoExpandido`, Fase 1).
- [x] Enriquecido (2026-08-04, pedido explícito tras ver la vista en vivo): cada producto muestra además Marca/Modelo/Capacidad/Color (línea chica bajo el nombre) y Código (mono), mismo criterio visual que `Productos/Index.tsx`. Sin gate de rol — es identificación del producto, no costo/margen.

## Auditoría de código y fixes de seguridad (2026-08-04)

No es una fase nueva del plan original — surgió de pedir explícitamente una revisión de código del controller/frontend ya escrito. Encontrado y arreglado en la misma sesión:

- [x] **Bug de control de acceso — gate incompleto en `resumen_financiero`.** `transformarVenta()` gateaba costo/ganancia por producto (`productos_footer`) pero el bloque `resumen_financiero` (ganancia_operacional, ganancia_agencia, ganancia_perdida_cambiaria, ganancia_real_total) se mandaba sin gate — un `vendedor` no veía el margen por producto pero sí veía el margen agregado de la venta en la card de arriba. Fix: mismo `$puedeVerCosto ? ... : null` en los 4 campos. Tests: gate oculto para vendedor / visible para admin.
- [x] **Scope por rol — vendedor solo ve sus propias operaciones.** `$userIdFiltro = $puedeVerCosto ? $request->input('user_id') : $request->user()->id` fuerza el propio id e ignora cualquier `user_id` pasado por query string (test cubre el intento de bypass explícito). Aplica a los 4 tipos vía `construirSubqueryMovimiento()`. El prop `usuarios` (lista completa de nombres para el filtro) ahora solo se manda si `$puedeVerCosto`.
- [x] `Reportes/Index.tsx`: "Auditoría y Rastreo" pasó a ser la primera sección para todos los roles; para `vendedor` se ocultan las demás secciones y el widget de gráficos (`ChartsReportePage`, datos de ejemplo hardcodeados) — vendedor solo ve la card de Rastreo de Operaciones. **Caveat:** esto es solo UI, no reemplaza el gate de ruta que sigue pendiente (⚠️4 / Fase 6).
- [x] Bug de `ScrollProgress` encontrado en el camino (`resources/js/components/ui/scroll.tsx`) — `{containerRef && (...)}` siempre era verdadero porque `containerRef` es un objeto ref, no el valor de `children`; fix: `{children && (...)}`. Corregía un hueco visual en las ~28 páginas que usan `<ScrollProgress />` sin children, verificado que no rompe el único uso con children (`Vendor/Show.tsx`).
- [x] **Bug de moneda incorrecta en "Monto Original" (2026-08-04):** la tabla "Detalles de Pago" (dentro del detalle colapsable de Venta) mostraba `fmt(p.monto_original)`, que antepone `$` fijo sin mirar la moneda real del pago — si un cliente pagó en CUP, la fila mostraba "$500.00" en vez de "CUP 500.00", contradiciendo la columna "Moneda" de al lado. Mismo tipo de ambigüedad que ya se había resuelto en la tabla principal con `formatMonto()`, pero esa tabla de pagos usaba el helper viejo y no quedó cubierta por ese fix. Corregido: usa `formatMonto(p.monto_original, p.moneda)` cuando la moneda viene informada.
- [x] **Limpieza de eager-loads muertos (2026-08-04):** `mensajeroMoneda` y la parte `.moneda` de `mensajeroCuenta.moneda` se cargaban en el controller pero no se usan en ningún lado de `transformarVenta()` (el bloque `mensajero` solo lee `mensajeroCuenta?->nombre_cuenta`). Quitados; `gestorCuenta.moneda` se dejó igual porque sí se usa (`gestorCuenta?->moneda?->codigo_moneda`).

**Widgets KPI (2026-08-04, pedido emergente, no estaba en el plan original de fases):** 4 stat tiles (Ventas/Gastos/Ingresos/Transferencias, conteo por tipo) arriba de la sección de Filtros. Backend clona las 4 subqueries antes de que `unionAll()` las consuma y cuenta con `->distinct()->count()` (evita inflar por los `leftJoin`). Respeta fecha/usuario/buscar pero no el filtro de tipo, a propósito, para que sigan sirviendo de resumen aunque la tabla esté filtrada a un solo tipo.

Suite al cierre de esta sesión: 126 tests, 375 assertions, todos en verde. Type-check limpio.

## Fase 4 — "Stock final" (según decisión ⚠️2)

Si se elige la opción (A) recomendada:
- [ ] Migración: agregar `stock_posterior` (o nombre similar) a `venta_detalles`.
- [ ] `VentaController` (al crear venta) graba el stock del producto en ese almacén **después** de aplicar el movimiento — mismo momento en que ya se hace `decrement` de `AlmacenProducto.cantidad`.
- [ ] El reporte muestra ese valor para ventas nuevas; para las anteriores a este cambio, la columna queda vacía/"No disponible" — comunicarlo así, no inventar un valor.

## Fase 5 — Resto de columnas (Receptor, Observaciones/Detalles) — Receptor cerrado, Observaciones a medias

- [x] Receptor: `venta.destinatario` (nombre completo, carnet, teléfono, dirección) — card "Receptor Registrado" en el detalle colapsable, visible para todos los roles (no es dato de costo/margen).
- [ ] Observaciones/Detalles: sigue sin un campo de nota libre nuevo — hoy la columna "Detalles" muestra `venta.estado` (para Venta) o `mf.descripcion` (para Gasto/Ingreso/Transferencia), no una observación dedicada. Podría considerarse resuelto por la opción "derivable" (⚠️3), o seguir abierto — no se decidió explícitamente con el cliente todavía.

## Fase 6 — Resto de hallazgos ya identificados (limpieza) — 3 de 5 cerrados

- [x] `CONCAT()` — ya no existe en el controller actual (confirmado con grep 2026-08-04); el texto de destinatario se arma con `trim()` en PHP después de paginar, mismo patrón usado en Cuentas.
- [ ] Drill-down real: cada fila enlaza al registro de origen (`ventas.show`, `transacciones.show`) — confirmado que sigue sin implementar (sin `Link`/`href` a `ventas.show`, las filas solo colapsan).
- [x] Monto: moneda explícita — resuelto en Fase 1 (`formatMonto()` antepone el código de moneda siempre, `"USD 74.00"` / `"CUP 87750.00"`, nunca un número pelado).
- [ ] Exportar PDF: sigue exportando solo `operaciones.data` (la página actual, 25 filas) sin avisar — decidir si se deja así con una aclaración en el botón, o se cambia para exportar todos los resultados filtrados.
- [x] **Rol de acceso — cerrado (2026-08-04).** Con los gates de campo/scope ya resueltos, quedaba el hueco de que los otros 14 reportes del módulo (no Rastreo de Operaciones, que ya tiene su propio scope interno) eran alcanzables por cualquier usuario autenticado con solo escribir la URL. Fix en `routes/acciones/reportes.php`: se agrupan esos 14 (+`compras_por_proveedor`, que no está en el menú pero comparte el mismo problema) bajo `Route::middleware('admin')` — alias ya existente en `bootstrap/app.php` → `EnsureUserIsAdmin`, que pese al nombre permite `admin` **y** `moderador` (`in_array(role, ['admin','moderador'])`), el mismo criterio que `puedeVerCosto` usa en todo el módulo. Un vendedor que entre por URL directa ahora recibe 403 (peticiones Inertia/JSON) o redirect a `route('vendedor')` (peticiones normales) — mismo comportamiento que ya tenían otras zonas admin-only del sistema. `index` y `rastreo_operaciones` quedan fuera del gate a propósito (todos los roles deben poder entrar a la página principal de Reportes y a Rastreo de Operaciones, que ya filtra internamente). No se tocó `ReporteController.php` — el `abort(403)` que ya tenía `historialCostoPrecio()` queda como una segunda capa redundante, sin necesidad de quitarlo.

## Fase 7 (prioridad media, emergente) — Reintegrar Compras

No bloquea las Fases 0-6. Se retoma cuando esas estén cerradas y se vea con más claridad cómo encaja Compras en el mismo formato (fila colapsable con detalle de productos, igual que Venta).

- [ ] **Gap de fondo, ya confirmado**: ni `compras` ni `compra_pago` tienen `user_id` (verificado con `Schema::getColumnListing()` sobre ambas tablas) — no hay forma de saber quién hizo una compra pasada. La única pista indirecta es `cuenta_id` (qué cuenta pagó), y desde ahí `user_cuentas` dice quién *puede* usar esa cuenta, no quién *hizo* la compra puntual — no es confiable para "organizar por quién la hizo".
- [ ] Decidir: (A) agregar `user_id` a `compras` y capturarlo desde ahora en `CompraController::store()` (histórico previo sin este dato), o (B) mostrar "Admin/Sistema" como hoy y no resolverlo.
- [ ] Si se agrega, aplicar el mismo patrón que Venta: fila colapsable con detalle de `compra_producto` (producto, cantidad, precio, subtotal).
- [ ] Revisar si "Stock final" (Fase 4) también debe extenderse a Compras (tiene sentido simétrico: cómo quedó el stock después de recibir la mercancía).

---

**Why:** el cliente pidió específicamente este reporte antes que los demás de la lista de 15; Compras se acotó primero para no bloquear el resto, y luego se dejó como Fase 7 de prioridad media ("en forma emergente hasta ver cómo las agregamos") — es un cambio grande que además toca captura de datos (no solo el reporte) en Fase 4 (stock) y potencialmente Fase 7 (`user_id` en compras), así que se documenta como plan de fases en vez de intentarlo de una sola vez.
**How to apply:** confirmar fase por fase antes de codear. Las decisiones ⚠️ se resuelven cuando toque esa fase, no antes. No adelantar la Fase 7 (Compras) hasta cerrar las Fases 0-6.
