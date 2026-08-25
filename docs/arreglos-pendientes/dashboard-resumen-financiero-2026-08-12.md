# Dashboard — Tabla 1 "Mis Montos por Moneda" pasa a resumen financiero enriquecido

## Contexto

`resources/js/pages/dashboard.tsx` (ruta `/dashboard`) y `resources/js/pages/Logistica/Index.tsx` (ruta `/logistica`, menú "Resumen Financiero") son dos pantallas separadas que hoy calculan "capital" de forma distinta:

- **Tabla 1** (`dashboard.tsx`) hoy solo suma el saldo de las cuentas (`AdminController::index()`, cálculo propio, no reutiliza ningún service) — convertido a USD. Ejemplo real visto en navegador: Total Capital 55.482,47 USD.
- **Logistica** (`DashboardStatsService::getLogisticaStats()`) calcula 4 métricas más ricas — Capital Financiero, Capital USD, Capital CUP, Capital EUR — que suman saldo de cuentas **+ balance neto de clientes + balance neto de proveedores + valor de costo del inventario**. Mismo ejemplo real: Capital Financiero 1.133.972,36 USD, Capital USD 1.123.426,73 USD (los números no coinciden con Tabla 1 porque miden cosas distintas, no por un dato corrupto — ver análisis en sesión 2026-08-12).

**Pedido del cliente (2026-08-12):** que Tabla 1 muestre esta misma información enriquecida (como Logistica), para que el usuario tenga mejor panorama del negocio desde la pantalla principal — y de paso, rediseñar visualmente esa card para que se vea más atractiva.

**Decisiones ya confirmadas (2026-08-12, vía AskUserQuestion):**
- El nuevo resumen se **oculta para vendedor** — mismo criterio que ya usa Logistica (`canViewFinance`), porque expone deudas de clientes/proveedores y costo de inventario, no solo el saldo propio del usuario.
- **No se toca** en este trabajo el hallazgo de las dos monedas con código `CUP` duplicado (Peso Cubano MN tasa 675 / TARJETA DE MONEDA NACIONAL tasa 685, mezcladas hoy en una sola fila "CUP" en Cuentas/Dashboard/Logistica) — queda documentado como conocido, se retoma en otra sesión si se decide separar.
- **No** se toca Tabla 2 (Comparación Mensual) ni el bug ya reportado de la estimación fabricada (`saldoActual * 0.8`) en `AdminController::getComparacionesMensuales()` — queda para cuando el cliente pida trabajar esa tabla específicamente.

Archivos involucrados:
- `app/Http/Controllers/AdminController.php::index()` — arma los props de `dashboard.tsx`.
- `app/Services/DashboardStatsService.php` — ya tiene toda la lógica de cálculo (`getResumenCuentas()`, `getResumenClientes()`, `getResumenProveedores()`, `getResumenProductos()`), usada hoy solo por `LogisticaController`.
- `resources/js/pages/dashboard.tsx` — reemplaza el bloque actual de Tabla 1 (líneas ~473-538).
- Tipos TS compartidos si se decide extraer una interfaz común entre `dashboard.tsx` y `Logistica/Index.tsx` (hoy cada uno define sus props por separado).

---

## Fase 1 — Backend: reutilizar `DashboardStatsService` en `AdminController::index()` — CERRADA (2026-08-12)

- [x] Nuevo método público `DashboardStatsService::getResumenFinancieroCompacto()` — reutiliza los 4 métodos privados ya existentes (`getResumenCuentas()`, `getResumenClientes()`, `getResumenProveedores()`, `getResumenProductos()`) sin duplicar lógica, con la misma fórmula que ya usa `Logistica/Index.tsx` para sus 4 tarjetas (Capital Financiero/USD/CUP/EUR). No se subió la visibilidad de los métodos privados — el nuevo método vive en la misma clase.
- [x] `AdminController::index()` inyecta `DashboardStatsService` (mismo patrón que `LogisticaController`) y llama al nuevo método, gateado igual que `historialCostoPrecio`/`statsCostoPrecio` (`in_array($user->role, ['admin', 'moderador'])`). Prop nuevo: `resumenFinanciero` (null para vendedor).
- [x] Verificado con `tinker`: los 4 números calculados coinciden exactamente con lo que muestra `/logistica` en el navegador (Capital Financiero 1.133.972,36 / USD 1.123.426,73 / CUP 7.135.219,67 / EUR 15,00).
- [x] Suite completa: 148 tests, todos en verde — sin regresiones.
- [x] `montosPorMoneda`/`totalCapital` se **dejaron intactos por ahora** (decisión de esta fase: no romper la Tabla 1 actual todavía) — se quitan en la Fase 2, cuando el frontend deje de consumirlos. Vendedor sigue recibiendo exactamente lo mismo que antes (su propia lista de cuentas), sin cambios.
- [x] **Corrección (2026-08-12, detectada por el cliente en revisión):** la primera versión de `getResumenFinancieroCompacto()` tenía codificados a mano los 3 códigos `USD`/`CUP`/`EUR` — si el admin activa o crea una moneda nueva en "Gestión de Monedas" y le asigna una cuenta, no iba a aparecer. Rehecho: el resultado ahora trae `capital_por_moneda` (array dinámico, una entrada por cada moneda que realmente tiene cuentas permanentes, sale de `por_moneda_perm` que ya se arma así) en vez de claves fijas `capital_usd`/`capital_cup`/`capital_eur`. Cada entrada indica `incluye_clientes_proveedores_inventario` (true solo para la moneda principal, porque esos montos no tienen desglose por moneda en el sistema). Mismos números verificados de nuevo con `tinker`, suite sigue 148/148.

## Fase 2 — Frontend: rediseño visual de la card — CERRADA (2026-08-12)

- [x] Reemplazado el bloque de Tabla 1 en `dashboard.tsx`: si `resumenFinanciero` viene presente (admin/moderador), se muestra el nuevo resumen; si no (vendedor), se mantiene exactamente la tabla original de "Mis Montos por Moneda" sin cambios — gate ya lo hace el backend (prop `null` para vendedor), no hizo falta un `{userRole === ...}` explícito en el JSX.
- [x] **Iteración de diseño (misma sesión):** la primera versión usaba tarjetas apiladas (una grande de "Capital Financiero" + una grilla de mini-cards por moneda, estilo `Logistica/Index.tsx`) — el cliente la vio en el navegador y no le gustó, porque desentonaba en calidad/consistencia visual con Tabla 2 (que es una `Table` clásica). Rehecho como `Table` (mismas clases `TableHeader`/`TableRow`/`Badge` que ya usa Tabla 2), con fila por moneda (`Badge` código + `Badge` símbolo + monto) y un pie "Capital Financiero Total" con el mismo patrón `border-t` que ya tenía la Tabla 1 original. **No se tocó `Logistica/Index.tsx`** en ningún momento de esta fase (confirmado con `git status` antes de empezar) — solo `dashboard.tsx`.
- [x] Verificado en navegador contra datos reales dos veces (antes y después de la corrección de diseño): números coinciden con `/logistica` (CUP 7.135.219,67 / USD 1.123.426,73 con nota "incl. clientes/proveedores/inventario" / EUR 15,00 / Total 1.133.972,36).
- [x] ESLint limpio (`tsc --noEmit` sigue roto en este repo, ver `reference_typescript_check_broken` — no se usó).
- [x] Suite completa: 148/148, sin regresiones.

**Segunda corrección (2026-08-12, mismo día):** el cliente aclaró que el problema no era la tabla en sí, sino que (a) quería de vuelta el marco verde (`border-emerald-500/30 border-l-4`) que sí le había gustado de la primera versión, y (b) quería colores en los badges de Moneda/Símbolo en vez del gris plano de `variant="secondary"`. Restaurado el marco verde en el `Card`, y agregado `colorMoneda()` (mismo criterio que `colorPago()` en RastreoOperaciones.tsx: colores fijos para monedas conocidas — USD esmeralda, CUP índigo, EUR azul, MLC ámbar — con una paleta de respaldo que cicla por posición para cualquier moneda nueva no listada). Verificado en navegador, suite 148/148.

**Tercera corrección (2026-08-12, mismo día):** columna "Símbolo" quitada — para las monedas reales del sistema, código y símbolo son el mismo texto (CUP/CUP, USD/USD, EUR/EUR), la columna era redundante. Tabla queda en 2 columnas (Moneda, Capital); `colSpan` del estado vacío ajustado de 3 a 2. El símbolo sigue usándose junto al monto en la columna Capital. Verificado en navegador, suite 148/148.

Queda sin commitear, para revisión del cliente.

## Fase 3 — Tabla 2 "Comparación Mensual" — CERRADA (2026-08-12)

**Diagnóstico (analizado antes de tocar código, con datos reales, nada modificado en ese momento):** `AdminController::getComparacionesMensuales()` tenía 3 bugs reales, todos verificados contra la base de datos real antes de decidir el arreglo:

1. **Bug principal — agrupación de WHERE rota.** `whereIn('cuenta_origen_id', ...)->orWhereIn('cuenta_destino_id', ...)->where('moneda', ...)->where('fecha_operacion', ...)` sin agrupar en paréntesis se ejecuta como `origen IN (...) OR (destino IN (...) AND moneda=... AND fecha>=...)` — el filtro de moneda/fecha solo aplicaba al lado "destino". Verificado con la query real: para USD contaba 182 movimientos (todos los históricos desde el lado origen) en vez de los 32 reales de agosto; para CUP, 157 en vez de 18. Esto inflaba la resta de "salidas" y disparaba el `saldoAnterior` calculado a números absurdos (de ahí el "-92.17% USD" que se veía en pantalla).
2. **Estimación inventada.** Cuando una moneda no tenía movimientos este mes pero sí el anterior, el código hacía `saldoAnterior = saldoActual * 0.8` — confirmado con EUR: 15,00 × 0.8 = 12,00 exacto, el "Mes Anterior" que se veía en pantalla no salía de ningún dato real.
3. **Escritura en cada carga del dashboard.** La función corría y persistía en `historial_comparacion_mensuals` en cada `GET /dashboard` (no era de solo lectura) — confirmado viendo una fila de USD creada a las 18:36:22 y ya reescrita a las 02:35:52 del día siguiente, con otro monto. "Mes Anterior" no era una foto fija, cambiaba según cuándo se abriera el dashboard.

**Rediseño acordado con el cliente** (ver flujo dictado: Moneda / Mes Anterior / Mes Actual / Saldo Acumulado = Mes Anterior + Mes Actual / Diferencia = Saldo Acumulado − Mes Anterior, con reinicio a fin de mes): se determinó que el `monto_actual` que ya existía en el código (siempre fue el saldo real y en vivo de las cuentas, nunca tuvo el bug) equivale a "Saldo Acumulado", y que "Mes Actual" y "Diferencia" son matemáticamente el mismo número — no hizo falta ningún campo nuevo, solo corregir cómo se calculan/congelan los 4 campos que ya existían en `historial_comparacion_mensuals`.

**Enfoque híbrido acordado** para el reinicio de mes (evita depender de un cron que no existía en este proyecto — verificado: no había ni un `Schedule::` registrado en todo el código):
1. Comando programado `comparacion:cerrar-mes` (`app/Console/Commands/CerrarComparacionMensual.php`), registrado en `bootstrap/app.php` vía `->withSchedule(...)` para las 00:00 del día 1 de cada mes. **Nota operativa:** para que corra en producción hace falta confirmar que el servidor tiene `* * * * * php artisan schedule:run` en el crontab real — no se puede verificar desde acá.
2. Red de seguridad en `AdminController::index()`: si el comando no corrió, el primer acceso al dashboard en el mes nuevo hace el mismo cierre ahí mismo. Ambos caminos llaman al mismo método (`DashboardStatsService::actualizarComparacionMensual()`), sin lógica duplicada.

**Implementación:**
- [x] `DashboardStatsService::actualizarComparacionMensual(?int $userId)` — nuevo método: si ya existe fila para el mes en curso, solo refresca `monto_actual` (saldo real vía `getResumenCuentas()['por_moneda_perm']`, mismo origen confiable que usa Tabla 1) sin tocar `monto_anterior`; si no existe, la crea tomando `monto_anterior` = `monto_actual` de la última fila anterior (o 0 si no hay ninguna). Ya no toca `movimientos_financieros` en absoluto — el bug de agrupación queda eliminado de raíz, no parchado.
- [x] Migración `2026_08_12_190000_make_user_id_nullable_on_historial_comparacion_mensuals_table.php` — `user_id` pasa a nullable. Hallazgo en el camino: como esa columna era obligatoria, el código viejo guardaba la fila "global" (admin/moderador, todas las cuentas) con el id del admin que tuviera la sesión abierta (`$userId ?? auth()->id()`) — confirmado en la BD real: **11 filas duplicadas** para el mismo mes/moneda, una por cada admin distinto que había abierto el dashboard. Ahora la fila global se guarda una sola vez con `user_id = null` (se muestra como "Sistema" en "Ver Historial", que ya tenía ese fallback previsto sin poder usarlo nunca). Migración recreando la tabla (create/copy/drop/rename), mismo patrón ya usado en `2026_08_10_191405_change_compra_producto_primary_key.php` por compatibilidad con SQLite (los tests corren ahí).
- [x] `AdminController::index()`: se quitaron `getComparacionesMensuales()`/`guardarHistorialComparacion()` (el código con el bug) y su llamada quedó movida dentro del bloque admin/moderador (antes se calculaba también para vendedor con datos que el frontend nunca mostraba — Tabla 2 ya estaba oculta para vendedor). Imports `Cuenta`/`DB` ya no usados, quitados.
- [x] Frontend: columnas de Tabla 2 pasaron de 6 a 4 — **Moneda | Mes Anterior | Saldo Acumulado | Diferencia** (se quitaron Símbolo y % Cambio, a pedido explícito). Badge de Moneda reemplaza el texto plano. Pie de "Totales" ajustado de `grid-cols-6` a `grid-cols-4`. Interfaz `ComparacionMensual` (TS) actualizada agregando `tasa_cambio` (ya se leía en runtime para el pie de totales pero no estaba declarado en el tipo — gap preexistente, corregido de paso).
- [x] Verificado con `tinker`: corrida normal (idempotente, `monto_anterior` no se mueve en llamadas repetidas), y simulación del cambio de mes con `Carbon::setTestNow()` — confirmé que "Mes Anterior" del mes siguiente toma el "Saldo Acumulado" final del mes anterior, exacto. Fila de prueba de septiembre borrada después de verificar.
- [x] **Limpieza de datos, confirmada con el cliente antes de borrar:** las 65 filas viejas (una por admin, con los números del bug) quedaban huérfanas — el código nuevo nunca las lee (siempre busca `user_id IS NULL`), pero seguían apareciendo mezcladas con la fila correcta "Sistema" en "Ver Historial". Borradas (local, no toca producción). Quedan solo las 3 filas nuevas (CUP/USD/EUR, agosto 2026, `Mes Anterior = 0,00` por ser el arranque del sistema nuevo).
- [x] Verificado en navegador: Tabla 2 muestra Mes Anterior 0,00 / Saldo Acumulado = mismos números que Tabla 1 (CUP 7.135.219,67, USD 44.936,84, EUR 15,00) / Diferencia en verde. Página "Ver Historial" no se rompió con el cambio de esquema.
- [x] Suite completa: 148/148 en verde durante todo el proceso.

Queda sin commitear, para revisión del cliente. **Pendiente operativo, no de código:** confirmar en el servidor de producción que el cron de Laravel (`schedule:run`) está configurado — si no lo está, el sistema sigue funcionando igual gracias a la red de seguridad, pero el cierre de mes solo ocurre en el primer acceso del mes nuevo, no exactamente a medianoche.

## Fase 4a — Tabla 2 v2: movimiento neto mensual + fila de Inventario — DISEÑO CERRADO 2026-08-18, implementando

**Diseño final confirmado (2026-08-18, vía AskUserQuestion, tras retomar el tema porque el cliente no confiaba en los números que mostraba la tabla):**

- Se mantiene el modelo de 3 columnas ya acordado el 12 de agosto (ver más abajo) — **no se renombra ninguna columna**. Se descartó una variante de 4 columnas (con "Mes Actual" separado de "Saldo Acumulado") que se había redactado mal en una primera pasada de esta sesión — mezclaba saldo total con movimiento del mes en la misma tabla, exactamente el problema que se busca resolver. Ver [[project_dashboard_resumen_financiero]] para el detalle de la confusión y cómo se corrigió antes de tocar código.
- **Nueva fila "Inventario"**, tratada con el mismo mecanismo que una moneda más (código sintético `INVENTARIO`, sin fila real en la tabla `monedas`). Fuente: `DashboardStatsService::getResumenProductos()['total_importe_global']` — el mismo cálculo que ya usa `LogisticaController`/`Logistica/Index.tsx`, no se duplica lógica. Valor real el día de esta sesión: $923,026.06 (asumido en USD, igual que el resto del sistema — las compras siempre se pagan en USD, sin conversión, confirmado en el punto 2 de abajo).
- **Transición de agosto (confirmada, decisión consciente):** no existe ningún registro de cuál era el saldo real el 1° de agosto a las 00:00 — reconstruirlo implicaría volver a consultar `movimientos_financieros`, el mismo camino que causó el bug original de Fase 3. Las 3 filas de agosto que ya existían (creadas bajo el modelo viejo, con `monto_actual` = saldo total en vivo) se reinician con el ancla capturada el 18 de agosto de 2026 — agosto va a mostrar movimiento parcial (solo 18-31), no roto, simplemente incompleto por única vez. Septiembre en adelante arranca limpio, con un mes completo.

**Implementación:**
- [x] Migración `2026_08_18_XXXXXX_add_saldo_inicio_mes_to_historial_comparacion_mensuals_table.php` — `ADD COLUMN saldo_inicio_mes` (decimal, nullable/default 0), simple porque no toca ningún `NOT NULL` existente (a diferencia de la migración de Fase 3).
- [x] `DashboardStatsService::actualizarComparacionMensual()` reescrito: agrega `INVENTARIO` al array que ya venía de `por_moneda_perm` (mismo loop, sin duplicar código); en el primer acceso del mes por moneda/categoría, captura `saldo_inicio_mes` = valor en vivo de ese instante (el ancla, congelada); `monto_actual` (columna "Saldo Acumulado" en pantalla) = valor en vivo ahora − ancla; `monto_anterior` (columna "Mes Anterior") sigue sembrándose del `monto_actual` de la última fila del mes pasado, sin cambios en esa parte de la lógica.
- [x] Las 3 filas de agosto existentes se borraron y se regeneraron con el ancla de hoy (18/08), confirmado con el cliente antes de borrar (datos de desarrollo local, no producción).
- [x] Frontend: fila "Inventario" en la tabla de Comparación Mensual, con color fijo slate/gris en `Dashboard/utils.ts` para distinguirla de las monedas reales.
- [x] **Corrección (2026-08-18, mismo día):** el cliente pidió que "Totales" no sume Inventario (no es dinero líquido) y que quede visualmente aparte, después del total, no mezclado entre las monedas. Se separó `comparaciones` en `filasMonedas`/`filaInventario` en el propio JSX; "Totales" ahora es una fila normal dentro de `TableBody` (ya no `TableFooter`/`tfoot` — ese elemento siempre se renderiza al final de la tabla sin importar el orden en el código, así que no permitía poner Inventario después). Orden final: monedas → Totales (solo monedas) → Inventario (separador punteado + etiqueta "aparte, no incluido en Totales").
- [x] Verificado con datos reales vía `tinker`: simulación de un movimiento real (+100 en una cuenta USD, revertido después) detectada y revertida correctamente, ancla sin moverse. Suite completa 170/170, sin regresiones.
- [ ] Verificación en navegador (pendiente, cliente lo hará él mismo).

**Aviso de despliegue a producción:** ver `dashboard-comparacion-mensual-aviso-despliegue-2026-08-18.md`. La migración se encarga sola de reiniciar la fila del mes en curso (no hace falta ningún comando manual aparte — corregido en la misma sesión, la primera versión pedía un `tinker` a mano y se descartó por poco confiable en producción). Ese doc también trae el texto sugerido para explicarle al cliente por qué la tabla arranca en 0.00 tras la actualización, y ahora hay una nota visible en la propia tabla (`dashboard.tsx`) que explica esto permanentemente — no solo para este despliegue.

## Fase 4a-ter — "Saldo Acumulado" vuelve a ser el saldo TOTAL — IMPLEMENTADO 2026-08-19

Un día después de que Fase 4a-bis reconstruyera el movimiento de agosto (ver más arriba), el cliente probó la tabla en la práctica y la definición "movimiento neto" (heredada de Fase 4, decidida el 12 de agosto) le generó confusión real, no hipotética: vio USD en negativo en Comparación Mensual (−$522,781.16, el movimiento neto reconstruido) mientras que `/logistica` mostraba USD positivo ($40,891.84, el saldo total) — dos números correctos pero de conceptos distintos, mostrados uno al lado del otro sin aclaración suficiente. Cuando se explicó la diferencia (saldo vs. movimiento) el cliente la entendió, pero fue tajante: "no, no, no acomulado deberia ser el total... eso crea confusion en el usuario... es imposible" — pidió revertir la definición, no solo aclararla con un tooltip (que se había ofrecido primero).

**Redefinición (revierte la de Fase 4/12 de agosto, vuelve a la semántica original de Fase 3):**
- **Saldo Acumulado** = saldo total en vivo de las cuentas ahora mismo — mismo número que Tabla 1 "Resumen Financiero" y `/logistica`. Nunca 0.00 ni negativo salvo que la cuenta esté realmente en descubierto.
- **Mes Anterior** = ese mismo total, congelado tal como cerró el mes pasado.
- **Diferencia** (columna "Mes Actual" en el frontend) = Saldo Acumulado − Mes Anterior. Sigue siendo el único lugar donde puede aparecer un número negativo — y ahí tiene sentido, porque está etiquetado como cambio/diferencia, no como si fuera el saldo de la cuenta.

**Implementado:**
- `DashboardStatsService::actualizarComparacionMensual()`: `$montoActual = $valorEnVivo;` en vez de `$valorEnVivo - $saldoInicioMes`. La columna `saldo_inicio_mes` se sigue capturando (queda como referencia histórica de "cuál era el saldo real al empezar a trackear"), pero ya no participa en el cálculo de lo que se muestra.
- `dashboard.tsx`: reemplazado el aviso azul que decía "arranca en 0.00 cada día 1" (ya no es cierto bajo la nueva definición) por uno que explica saldo total vs. diferencia.
- Tabla `historial_comparacion_mensuals` recalculada con `actualizarComparacionMensual()` — CUP/USD/EUR/Inventario ahora muestran el total real (ej. USD 40,891.84, positivo).
- Suite completa 170/170 sin regresiones, eslint limpio.

**Consecuencia sobre Fase 4a-bis (el backfill de esta misma mañana):** los valores de `saldo_inicio_mes` que se calcularon y aplicaron ahí (CUP 5,803,337.17 / USD 563,673.00 / EUR 15.00, reconstruyendo el movimiento real del 1-19 de agosto) **siguen guardados en la base de datos, correctos, sin revertir** — pero ya no alimentan ningún número visible en el dashboard, porque "Saldo Acumulado" ya no se calcula restando esa ancla. El comando `dashboard:reconstruir-movimiento-agosto-2026` y el método `reconstruirMovimientoCuentas()` quedan en el código (no se borraron), pero su propósito original (corregir lo que mostraba "Saldo Acumulado") ya no aplica bajo esta redefinición — quedan como fue construidos, documentados, pero efectivamente sin consumidor visible por ahora.

**Doc de despliegue superado:** `dashboard-comparacion-mensual-aviso-despliegue-2026-08-18.md` describe la definición vieja (movimiento neto, arranca en 0.00) — marcado como superado, no reutilizar sin revisar primero.

## Fase 4b — Ganancia real de la agencia — IMPLEMENTADO 2026-08-19

Las 3 preguntas abiertas se resolvieron vía `AskUserQuestion`: sí incluir Transferencias (con la salvedad de que el cliente preguntó si la tasa se puede editar por operación — confirmado en código que sí, `tasa_cambio_aplicada` es opcional y personalizable por transferencia), y guardar `ganancia_neta` en columna nueva (no calcular al vuelo).

**Construido:**
- Migración `2026_08_19_210000_add_ganancia_neta_to_ventas_table` — columna `ventas.ganancia_neta` (nullable, null hasta que la venta se aprueba).
- `VentaController::aprobarVenta()`: calcula y guarda `ganancia_neta = total_ganancia − total_comision + ganancia_perdida_cambiaria` en el mismo `update()` donde ya se calculaba `ganancia_perdida_cambiaria`/`ganancia_real_total`. Nota dejada en el código: para ventas con gestor, `total_comision` es la comisión teórica por línea, no el `gestor_monto` real pagado desde la cuenta del gestor (moneda distinta, CUP vs USD) — mismo criterio que ya usaba `ganancia_agencia` en `show()`, no es una limitación nueva introducida hoy.
- Migración `2026_08_19_210100_add_ganancia_cambiaria_to_movimientos_financieros_table` — columnas `tasa_oficial_en_momento` y `ganancia_perdida_cambiaria` en `movimientos_financieros`, nullable, **solo se llenan para Transferencias nuevas desde hoy** — no hay forma de reconstruir la tasa oficial vigente en transferencias ya hechas si en su momento se usó una tasa personalizada (ese dato nunca se guardó).
- `TransferenciaController::store()`: calcula `montoDestinoOficial` (mismo `calcularMontoConvertido()` pero forzando tasa oficial) y compara contra `montoDestino` real. **Bug de signo encontrado y corregido durante la verificación manual:** la primera versión restaba al revés (`montoDestino - montoDestinoOficial`), lo que hacía ver como "ganancia" el caso donde la agencia entrega de más (en realidad pérdida). Verificado con un ejemplo numérico a mano antes de aplicar, y con un test nuevo (`tests/Feature/TransaccionFinancieraTest.php`, extiende el test ya existente de "tasa personalizada") que fija el signo correcto: tasa personalizada más favorable para el destino → pérdida (negativo) para la agencia.
- `DashboardStatsService::getGananciaAgenciaMes()` — suma `ventas.ganancia_neta` (ventas completadas, `updated_at >= inicio de mes`) + `movimientos_financieros.ganancia_perdida_cambiaria` (Transferencia Interna, `fecha_operacion >= inicio de mes`). Compras/Gasto/Ingreso quedan fuera a propósito (sin margen posible, ya analizado).
- `AdminController::index()`: pasa `gananciaAgenciaMes` al frontend, solo para admin/moderador.
- **Tarjeta nueva en `dashboard.tsx`**, separada de Comparación Mensual a propósito (mezclar "saldo" con "ganancia" en la misma tabla fue justo la causa de la confusión de Fase 4a-ter) — "Ganancia Real de la Agencia", 3 valores: Ganancia de Ventas | Ganancia/Pérdida de Transferencias | Ganancia Neta del Mes (suma), con aviso aclarando que Compras/Gasto/Ingreso no aparecen porque no tienen margen posible, y que Transferencias solo cuenta desde hoy.

**Verificado:** suite completa 171/171 (170 + 1 test nuevo de `ganancia_neta`, más 3 assertions nuevas en el test de tasa personalizada), eslint limpio en `dashboard.tsx`/`types.ts`, imports vs. tags JSX revisados a mano. `getGananciaAgenciaMes()` corrido en tinker sin errores (da 0/0/0 hoy — esperado, no hay ventas/transferencias todavía con los campos nuevos poblados).

**Fuera de alcance, no hecho:** no se agregó `ganancia_neta` a la respuesta JSON de `VentaController::show()`/`aprobarVenta()` (el detalle de una venta individual) — solo se usa agregado en el dashboard. Backfill de transferencias viejas explícitamente descartado (dato irrecuperable).

## Fase 4b — contexto original del análisis (2026-08-12), previo a la implementación de arriba

Surgió el mismo día (2026-08-12), en la sesión siguiente a que el cliente hiciera commit de las Fases 1-3, al preguntar "¿de dónde sacás los datos de Tabla 2?". La respuesta abrió una conversación larga que redefine cómo debe funcionar Tabla 2 — **nada de esto está implementado todavía**, es la fase de análisis/diseño antes de tocar código.

### 1. Redefinición de "Saldo Acumulado" (confirmada vía AskUserQuestion)

La Fase 3 implementó "Saldo Acumulado" como el saldo **real y total** de las cuentas en cualquier momento (igual a Tabla 1). El cliente aclaró que en realidad lo quiere como **el movimiento neto SOLO de este mes** — arranca en 0 el día 1, va sumando/restando con cada operación (compra, gasto, ingreso, transferencia, venta) que afecte una cuenta, sin importar el tipo.

Modelo confirmado:
- **Mes Anterior** = el "Saldo Acumulado" final con el que cerró el mes pasado (congelado, se lee tal cual).
- **Saldo Acumulado** = cuánto se ha movido (entradas − salidas) desde que empezó este mes. Arranca en 0 cada día 1.
- **Diferencia** = Saldo Acumulado − Mes Anterior (compara el movimiento de este mes contra el del mes pasado — ya no es un número redundante con otra columna, ahora sí aporta algo distinto).

Al llegar el día 1 del mes siguiente: el "Saldo Acumulado" final del mes que cierra pasa a ser el "Mes Anterior" del mes nuevo, y el "Saldo Acumulado" nuevo vuelve a 0. Mismo mecanismo híbrido de disparo ya construido en Fase 3 (comando programado + red de seguridad en el dashboard) — no cambia, solo cambia qué significan los números.

**Flujo de ejemplo, verificado con el cliente (no implementado, solo narrado):** partiendo de Mes Anterior USD 120 / CUP 13.000 / EUR 12, con Saldo Acumulado en 0 el día 1, se recorrió una Compra (pago_cash USD, -50), un Gasto (CUP, -500), un Ingreso (USD, +30), una Transferencia (USD→EUR con conversión, -20/+18) y una Venta (cobro en CUP, +2.000) — resultado: Saldo Acumulado USD -40, CUP 1.500, EUR 18; Diferencia USD -160, CUP -11.500, EUR +6. Sirve como caso de prueba de aceptación una vez que se implemente.

**Cambio técnico que esto implica (analizado, no hecho):** calcular "movimiento neto de este mes" sin volver a tocar `movimientos_financieros` (ahí vivía el bug de agrupación de WHERE que se arregló en Fase 3 — no reabrir ese camino). Se resuelve guardando un ancla: el saldo real de las cuentas capturado una sola vez, justo en el instante del rollover de cada mes. `Saldo Acumulado` en cualquier momento = saldo real ahora − esa ancla. Requiere una columna nueva en `historial_comparacion_mensuals` (ej. `saldo_inicio_mes`) — a diferencia de la migración de Fase 3, esta sí puede ser un `ADD COLUMN` simple (con default), no hace falta recrear la tabla porque no toca ningún NOT NULL existente.

### 2. Ganancia real de la agencia — análisis por tipo de operación (código ya revisado, nada implementado)

El cliente quiere reflejar ganancias del negocio, no solo de Ventas — pero al analizar cada controller se confirmó que **la mayoría de las operaciones no tienen margen posible**, y el cliente terminó de acuerdo con esa lectura:

- **Compras** (`CompraController::store()`): siempre se pagan desde cuentas USD, sin conversión de moneda posible (`if ($cuenta->moneda->codigo_moneda !== 'USD') throw ...`). No hay margen que calcular — es costo puro.
- **Gasto/Ingreso** (`GastoController`, `IngresoController`): exigen que la moneda de la cuenta coincida exacto con la moneda del movimiento. Sin conversión, sin margen posible.
- **Transferencias** (`TransferenciaController`): **sí puede generar ganancia o pérdida real**, hoy no calculada ni guardada en ningún lado. Ya tiene toda la lógica de conversión (`calcularMontoConvertido()`, con tasa oficial o una tasa personalizada que el usuario puede meter a mano) — falta comparar "lo que realmente se movió" contra "lo que hubiera sido a la tasa oficial", mismo patrón que `Venta::monto_diferencia_cambiaria` ya usa.
- **Ventas**: ya existe un concepto de ganancia, pero repartido en 3 campos que nunca se juntan:
  1. `total_ganancia` — margen bruto por producto (precio venta − costo), sin descontar comisión.
  2. `ganancia_agencia` — se calcula al vuelo solo en `VentaController::show()` (nunca se guarda): `total_ganancia − comisión del vendedor`.
  3. `ganancia_real_total` — se guarda al aprobar la venta (`aprobarVenta()`): `total_ganancia + ganancia_perdida_cambiaria`, pero **sin restar la comisión**.
  
  Ninguno junta las tres cosas a la vez (margen − comisión + cambiaria). El cliente confirmó que quiere un número nuevo que sí las junte.

**Conclusión acordada con el cliente:** Compras/Gasto/Ingreso/Transferencias no necesitan su propio cálculo de "ganancia" — el "Saldo Acumulado" redefinido en el punto 1 ya captura su efecto sobre las cuentas automáticamente. Solo hace falta un número nuevo de "ganancia neta" para Ventas, porque ese margen no es visible con solo mirar el saldo de las cuentas.

### 3. Abierto, sin confirmar todavía — no arrancar a codear sin esto

- [ ] **¿Qué forma toman las columnas nuevas en Tabla 2?** Pregunta hecha, sin responder aún: ¿una columna "Ganancia de Ventas" al lado de Mes Anterior/Saldo Acumulado/Diferencia (mismo `Card`, más columnas), o algo separado (otra card / Tabla 3)?
- [ ] **¿Se implementa el cálculo de ganancia/pérdida cambiaria de Transferencias ahora, junto con lo de Ventas, o se deja para después?** El cliente dijo "depende de la operación, hay ocasiones que generan pérdidas" — confirma que el fenómeno es real, pero no si entra en el alcance de esta fase.
- [ ] Fórmula exacta del nuevo "Ganancia Neta de Venta" a implementar: `total_ganancia − total_comision + ganancia_perdida_cambiaria` — confirmada conceptualmente, falta decidir si se guarda como columna nueva en `ventas` o se calcula on-the-fly para el agregado del dashboard.
- [ ] "Otras cosas" mencionadas al abrir este plan (antes de esta Fase 4) — sin especificar todavía, puede que ya estén cubiertas por lo de arriba.
- [ ] Duplicado de moneda CUP (dos monedas, mismo código, distinta tasa) — sigue parqueado, sin relación con esta fase.

## Fase 5 — Tabla 2 gana fila "Clientes", Clientes+Inventario ahora suman a Totales — IMPLEMENTADO 2026-08-25

Retomado tras una sesión de análisis solicitada por el usuario sobre `dashboard.tsx` completo (5 hallazgos ya conocidos de `project_dashboard_componentizacion` reconfirmados + 2 bugs nuevos encontrados y corregidos ese mismo día, ver más abajo). Al analizar Tabla 2 puntualmente, el usuario sospechó que "el cliente también quiere incluir a los clientes" — se verificó contra el código y era un hueco real.

**Diagnóstico verificado en `DashboardStatsService`:** `getResumenFinancieroCompacto()` (Tabla 1) ya suma `clientes.balance_neto + proveedores.balance_neto + inventario.total_importe_global` dentro de la fila de la moneda principal (`$extrasMonedaPrincipal`). `actualizarComparacionMensual()` (Tabla 2) solo trackeaba cuentas por moneda + una fila sintética "INVENTARIO" (agregada en Fase 4a) — **clientes y proveedores no tenían ningún rastro mes a mes**, así que el número de la moneda principal en Tabla 1 nunca podía coincidir con su "Saldo Acumulado" en Tabla 2 para esa misma moneda, sin ninguna explicación visible — mismo patrón de confusión que ya había pasado antes entre `/dashboard` y `/logistica` (ver Fase 4a-ter arriba).

**Decisiones del cliente, confirmadas en la misma sesión:**
- Agregar **Clientes** a Tabla 2, mismo mecanismo que Inventario (fila sintética `CLIENTES`, valor = `getResumenClientes()['balance_neto']`, el mismo número que ya usa Tabla 1).
- **Proveedores explícitamente NO** — mismo hueco exacto que Clientes, pero el cliente pidió dejarlo fuera por ahora (confirmado vía `AskUserQuestion`, opción "No, solo Clientes por ahora").
- **Clientes e Inventario pasan a sumar dentro de "Totales"** — antes Inventario quedaba deliberadamente fuera ("no es dinero líquido... nunca se mezcla dentro de Totales"), el cliente pidió invertir esa decisión: ambos cuentan ahora. Siguen mostrándose en su propia fila con borde punteado (no se mezclan en la lista de monedas reales) — solo cambió que su monto sí se suma al total.

**Implementado:**
- `DashboardStatsService::actualizarComparacionMensual()`: `$porMoneda['CLIENTES'] = ['original' => $this->getResumenClientes()['balance_neto'], 'simbolo' => '$']`, mismo patrón que la línea de `INVENTARIO` ya existente. Fallback de nombre (`$nombreMoneda`) extendido para mostrar "Clientes" en vez del código crudo.
- `dashboard.tsx` (Tabla 2): `filasMonedas` ahora excluye tanto `INVENTARIO` como `CLIENTES` (se mantienen fuera de la lista de monedas reales); los 3 totales (`totalMesAnterior`/`totalDiferencia`/`totalSaldoAcumulado`) pasan de reducir sobre `filasMonedas` a reducir sobre `comparaciones` completo. Se extrajo un helper `filaEspecial(fila, etiqueta)` compartido entre Inventario y Clientes (antes Inventario tenía su JSX hardcodeado a mano) — misma fila con borde punteado, etiqueta cambia de "aparte, no incluido en Totales" a "cuenta en Totales" (ya no era cierto lo primero). **Orden de filas cambiado**: monedas reales → Inventario → Clientes → Totales (antes Totales iba primero, quedaba raro con filas "aparte" apareciendo después de un total que no las incluía).
- Verificado con datos reales vía `tinker`: `CLIENTES` devuelve 193.852,13 (balance neto real). Suite 195/195 verde durante todo el proceso.

**Dos ajustes visuales adicionales, pedidos por el cliente en la misma sesión:**
1. El aviso azul de Tabla 2 ("Saldo Acumulado es el saldo total real...") se movió de **arriba** de la tabla a **debajo**, dentro del mismo `CardContent` — para que el layout de la card se alinee con Tabla 1 (que no tiene nada arriba de su tabla).
2. Tabla 1 ganó su propio aviso azul (mismo estilo), debajo de "Capital Financiero Total": el backend ya mandaba `incluye_clientes_proveedores_inventario` por fila desde Fase 1+2 (2026-08-12) pero el frontend nunca lo usaba — quedaba un hueco visual sin explicación de por qué la fila de la moneda principal no cuadra con solo sumar cuentas. Primero se agregó un badge chico inline junto al código de moneda, después el cliente pidió explícitamente el aviso completo debajo de la tabla — ambos quedaron (badge + aviso).

**2 bugs reales encontrados y corregidos en `dashboard.tsx`, independientes de este hilo de Clientes/Inventario** (parte del mismo análisis completo del archivo, ver `project_dashboard_componentizacion` para los 5 hallazgos ya conocidos que siguen sin tocar):
1. Las tarjetas "Pérdidas Totales" (Historial de Cambios de Tasa) y "Pérdida acumulada" (Cambios de Precio de Costo) usaban el ícono `TrendingUp` (flecha subiendo) en vez de `TrendingDown` — mismo error copy-paste en dos secciones distintas.
2. Chequeo de rol redundante en el botón "Ver Historial" de Comparación Mensual — ya estaba anidado dentro de `{userRole !== 'vendedor' && ...}`, el segundo chequeo `(userRole === 'admin' || userRole === 'moderador')` era siempre `true` ahí adentro (solo existen 3 roles).

**Verificado que NO era un bug, descartado durante el mismo análisis:** `dashboard.financial.states` (Estados Financieros, la tabla de abajo de todo) — parecía no tener chequeo de rol en el frontend, pero `ReporteController::getFinancialStates()` fuerza `$usuarioId = $currentUser->id` server-side cuando el rol es vendedor, sin importar qué `user_id` se mande por query string. Correctamente protegido, a diferencia de `dashboard.usuarios` (sí sigue teniendo el hueco, hallazgo ya conocido).

**Why:** este es el segundo caso en el historial de este track donde una inconsistencia entre Tabla 1 y Tabla 2 pasó desapercibida hasta que alguien miró el código con atención (el primero fue el bug de agrupación SQL de Fase 3) — documentar el mecanismo exacto (fila sintética + suma condicional a Totales) evita que una sesión futura reintroduzca el mismo hueco al agregar Proveedores u otro concepto nuevo.
**How to apply:** si se retoma Proveedores, mismo mecanismo exacto (`$porMoneda['PROVEEDORES'] = [...]`, agregar a `filaEspecial` en el frontend, sin filtro de exclusión de Totales) — el cliente ya lo pidió explícitamente fuera por ahora, no agregarlo sin que lo pida. Los 5 hallazgos de `project_dashboard_componentizacion` (dashboard.usuarios sin rol, Toaster vestigial, widgets sin Card gradiente, badge de rol sin dark:, dashboard.update sin rol) siguen sin tocar — no confundir con los 2 bugs nuevos de esta sesión, que sí quedaron corregidos.

## Fase 6 — "Totales" daba un valor MAYOR que Capital Financiero de /logistica (bug real de tasa CUP) — IMPLEMENTADO 2026-08-25, mismo día que Fase 5

El cliente notó, probando en el navegador, que "Totales" de Comparación Mensual daba un número **mayor** que Capital Financiero de `/logistica`, aun sin tener Proveedores integrado todavía (lo cual solo podía bajar el total, nunca subirlo) — "esa locura, de dónde salió".

**Causa real:** este sistema tiene 2 monedas reales distintas codificadas ambas "CUP" (efectivo tasa 675, tarjeta tasa 685 — ver `reference_moneda_cup_duplicada` en memoria). `getResumenPorMonedaPerm()` ya suma correctamente el saldo y el equivalente USD de cada cuenta por separado antes de combinarlos bajo el código "CUP", pero `actualizarComparacionMensual()` volvía a convertir ese monto ya-combinado a USD usando la `tasa_cambio` de una sola fila `monedas` arbitraria — inflando el equivalente.

**Fix:** en vez de usar `$monedaInfo->tasa_cambio` directo, se deriva una "tasa efectiva" = `original ÷ equivalente` (ambos ya sumados correctamente por-cuenta antes de combinarse) — matemáticamente idéntica a la tasa real para cualquier código no duplicado, y correcta también para códigos duplicados porque reversa exactamente lo que ya se sumó bien.

**Verificado:**
- `tinker`: CUP `tasa_efectiva=678.1141`, equivalente_usd=10.123,62 (coincide con el desglose real: efectivo 4.705.287,50/675≈6.970,80 + tarjeta 2.159.682,17/685≈3.152,82).
- Navegador: Totales bajó de 1.285.322,92 (con el bug) a 1.285.276,21 (correcto).

**Hilo "collapsible" evaluado y cerrado sin cambios de UI:** el cliente pidió después "algo como collapsible" para exponer efectivo/tarjeta de CUP por separado en la fila combinada. Se construyó soporte de backend (`getResumenPorMonedaPerm()` ahora también devuelve `detalle`, desglose por `moneda_id` real dentro de cada código; `actualizarComparacionMensual()` lo propaga; tipo `ComparacionMensualDetalle` agregado en `Dashboard/types.ts`) — pero antes de construir la UI, el cliente verificó la aritmética a mano (`10.123,62 + 34.366,84 + 35 + 193.852,13 + 1.046.898,62 = 1.285.276,21`, exactamente el Totales ya corregido) y decidió que el número combinado ya es correcto tal cual — **no hace falta ningún collapsible**. El campo `detalle` queda disponible en el backend sin consumidor en ninguna UI (no genera regresión, ya probado con 195/195 tests).

**Mismo bug de fondo, notado por el cliente, deliberadamente NO tocado:** `Logistica/Index.tsx` (~líneas 262-286), card "Desglose por Moneda (cuentas permanentes)", usa `resumenCuentas.por_moneda_perm` agrupado por código — mismo blending de CUP efectivo+tarjeta en un solo número por card. El backend ya expone `detalle` para esto también, pero el tipo TS (`index.d.ts:434`) no lo declara y la card no lo consume. Se dejó así a propósito: el cliente cerró el hilo entero sin tocar UI en ningún lado una vez confirmó que los números ya cuadran.

## Fase 7 — Fila "Proveedores" agregada a Tabla 2, Totales ahora coincide exacto con Capital Financiero — IMPLEMENTADO 2026-08-25, mismo día

Inmediatamente después de Fase 6: el cliente volvió a preguntar por qué Totales seguía siendo mayor que Capital Financiero — a pesar de que ya era matemáticamente correcto (la diferencia era exactamente el Balance Neto de Proveedores, -149.670,24, deliberadamente excluido desde Fase 5). Tras mostrarle la aritmética exacta, confirmó vía `AskUserQuestion`: agregar Proveedores ahora, mismo mecanismo que Clientes/Inventario.

**Implementado:**
- `DashboardStatsService::actualizarComparacionMensual()`: `$porMoneda['PROVEEDORES'] = ['original' => $this->getResumenProveedores()['balance_neto'], 'simbolo' => '$']`, mismo patrón que `CLIENTES`. `$nombreMoneda` fallback extendido para `'PROVEEDORES'` → `'Proveedores'`.
- `dashboard.tsx`: `filasMonedas` ahora también excluye `'PROVEEDORES'`; nueva `filaProveedores` renderizada con `filaEspecial(filaProveedores, 'saldo neto de proveedores')`. Los totales (`totalMesAnterior`/`totalDiferencia`/`totalSaldoAcumulado`) ya reducían sobre el array `comparaciones` completo (no `filasMonedas`), así que sumaron Proveedores automáticamente sin tocar esa parte del código.

**Bug real encontrado al probar en el navegador (no en tests):** `historial_comparacion_mensuals.moneda_codigo` era `VARCHAR(10)` — "PROVEEDORES" (11 caracteres) rompía el insert en MySQL: `SQLSTATE[22001]: String data, right truncated`. Los 195 tests seguían en verde porque corren sobre SQLite, que no aplica límite de longitud a columnas de texto — este tipo de bug es invisible al test suite por diseño del motor, solo lo agarró la verificación manual en el navegador (real, contra MySQL). Nueva migración `2026_08_25_191527_ampliar_moneda_codigo_en_historial_comparacion_mensuals_table.php` amplía la columna a `VARCHAR(20)`, con guard `DB::getDriverName() !== 'sqlite'` (mismo patrón que `2026_07_28_165942_unificar_tipo_cuenta_temporales_a_permanentes.php`, ya que SQLite no soporta `MODIFY COLUMN` y tampoco lo necesita).

**Verificado en navegador tras el fix:** Totales = 1.135.605,97 USD, coincide exacto con Capital Financiero de `/logistica`. Fila Proveedores muestra su saldo negativo en rojo. Confirmado también que el mecanismo de cierre de mes (comando programado `comparacion:cerrar-mes` + red de seguridad en `AdminController::index()`) sigue funcionando igual para Proveedores sin ningún cambio adicional — ambos disparadores llaman a `actualizarComparacionMensual()`, que itera genéricamente sobre `$porMoneda` sin lista hardcodeada de monedas. 195/195 tests, eslint limpio.

**Why:** confirma un patrón a vigilar en este proyecto — cualquier columna `string($n)` con `$n` chico en una tabla que recibe "códigos" que en realidad pueden ser palabras sintéticas (INVENTARIO=10, CLIENTES=8, PROVEEDORES=11) es un límite arbitrario esperando romperse con el próximo nombre más largo. Y que testear solo contra SQLite puede dar falsa confianza en columnas con longitud fija.
**How to apply:** Tabla 2 y Tabla 1 (Capital Financiero) ahora deberían coincidir siempre en el mismo número total — si alguna vez difieren de nuevo, sumar manualmente los componentes de cada una (como se hizo en Fase 6/7) para encontrar qué falta. Si se agrega otra fila sintética a Tabla 2 en el futuro, verificar que el código quepa en `VARCHAR(20)` o ampliar de nuevo.
