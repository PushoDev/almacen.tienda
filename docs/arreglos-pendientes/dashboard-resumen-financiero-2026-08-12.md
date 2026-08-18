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

## Fase 4b — Ganancia real de la agencia — SIGUE EN ANÁLISIS, sin tocar, fuera del alcance de Fase 4a

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
