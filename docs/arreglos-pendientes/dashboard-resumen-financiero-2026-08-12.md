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

## Fase 4 (futuro, no arrancar sin pedirlo explícitamente)

- [ ] "Otras cosas" mencionadas al abrir este plan — sin especificar todavía.
- [ ] Duplicado de moneda CUP — parqueado, ver nota en Contexto.
