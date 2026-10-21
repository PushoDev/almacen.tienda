# Resumen de la sesión — 2026-10-21

Se reemplazó la **BD de desarrollo** por el dump de producción más reciente, se cerraron cuatro de los cinco hallazgos que quedaban del **Rastreo de Operaciones** (4, 5, 6 y 8; el 7, el PDF, el cliente lo dejó para después) y se **concilió el Excel viejo del cliente contra el sistema** (el capital cuadra al 0,24 %), lo que llevó a **cambios en el Dashboard** (tarjeta nueva «Crecimiento del Capital del Mes», cierre guardado como «Mes anterior», remesas en la ganancia; secciones 9 a 12). Incluye una **migración de datos** (el historial que seguía apuntando a proveedores pasa a clientes) y una **regla de permisos nueva** para el vendedor sobre los saldos de sus cuentas. **Suite completa corrida al final: 1.029 tests, 7.080 aserciones, todos verdes** (1.015 el 10-20, +7 de los hallazgos del Rastreo y +7 del Dashboard; ver secciones 7 y 12).

## 1. BD de desarrollo reemplazada

| Dato | Detalle |
|---|---|
| Origen | `docs/backup/backup_2026-10-21_03-49.sql`: dump de **producción** (69 tablas, `DROP TABLE IF EXISTS` por tabla) |
| Cómo | Copia de seguridad de la BD anterior fuera del repo, `DROP DATABASE` + `CREATE DATABASE almacen_tienda` (utf8mb4) e importación; después `php artisan migrate` aplicó las **8 migraciones** que el dump no trae (push, `telegram_vinculos`, Casillero y Contenedores) |
| Resultado | 75 tablas, **1.554 ventas** (antes 1.494), última venta 2026-10-21 00:01 UTC |
| Se perdió | Los datos de prueba locales: compra #31 en el casillero, el contenedor de prueba y los $120 de DANIEL USD. El casillero quedó vacío |

## 2. Lo que el cliente dio por resuelto

La prueba de entrega real del push en Chrome y las decisiones abiertas del login (mascota del Card, CUP/EUR/USD repetidos en la cinta, ver el login en el navegador). Ya no son pendientes.

## 3. Rastreo, hallazgo 4: anuladas marcadas en la fila

Un Gasto, Ingreso o Transferencia con `estado = cancelado` muestra **«Anulada»** en la columna Detalles de la tabla (y en el PDF). El detalle expandido conserva la descripción original y la tarjeta «Operación anulada» con su motivo.

- Dónde: `textoDetalles(op)` en `Reportes/Report/RastreoOperaciones.tsx`, que usa `detalle_movimiento.info_general.estado`. El backend no cambia (ventas y remesas ya marcaban su anulación).
- Una primera versión puso «Anulada» desde el backend y pisaba la descripción original en el detalle expandido; se detectó al verificar en el navegador y se corrigió.
- En la BD hay 16 movimientos cancelados de 1.863. Verificados en el navegador: Transferencia #1787, Ingreso #1776 y Gasto #1737.

## 4. Rastreo, hallazgo 6: el historial de proveedores pasa a clientes

`mover_proveedores_con_uso_a_clientes` (10-14) pasó a clientes los proveedores con compras o saldo y **dejó a propósito el historial** (movimientos y remesas) apuntando al proveedor. Quedaban **61 movimientos y 5 remesas**.

| Pieza | Detalle |
|---|---|
| Migración | `2026_10_21_154612_pasar_historial_de_proveedores_a_clientes`: cada proveedor con historial se une al cliente del mismo nombre (misma regla que la anterior, sin el sufijo «PROVEEDOR»); `movimientos_financieros.proveedor_destino_id` → `cliente_destino_id`; en `remesas`, `entrada/salida_proveedor_id` → `entrada/salida_cliente_id` y `entrada/salida_tipo` pasa de `proveedor` a `cliente`. Si no hay cliente equivalente no se crea ninguno y el historial no se toca. No toca los saldos (los de cada movimiento ni los de clientes o proveedores). En transacción, verifica que no cambie la cantidad de filas. `down()` no hace nada |
| Mapa real | MEDARDO → cliente #31 (50 movimientos y 4 remesas), ANDY → #29 (8), ELDY → #30 (1 movimiento y 1 remesa), ALBERTO PROVEEDOR → #1 ALBERTO (2). LINYI, FLORIC, KAREL, MAIKEL PINA y DEVOLUCIONES no tienen historial |
| Verificación en la BD de desarrollo | Con proveedor: 61 → 0 movimientos y 5 → 0 remesas. Totales intactos (1.863 movimientos, 119 remesas); deuda de clientes (−51.757,79) y saldos de proveedores (−23.909,70) sin cambio |
| Rastreo | Se quitó el filtro «Proveedor» (parámetros `proveedor_ids` y `proveedor_direccion`, validación, lista `proveedores` de la pantalla, combobox) y las uniones y la búsqueda por proveedor de las subconsultas de movimientos y remesas |
| En el navegador | La ficha del cliente MEDARDO (#31) muestra 50 transacciones y 4 operaciones múltiples; la del proveedor MEDARDO (#7) queda con 0; Movimientos Financieros carga igual |

**Consecuencias:** (a) si se anula uno de esos 66 movimientos viejos, ahora se revierte el saldo del **cliente** (el saldo ya se había pasado allí), no el del proveedor; (b) siguen leyendo `proveedors` (sin encontrar nada) Cierre de Caja, el bot de Telegram, las notificaciones, Cuentas, Movimientos Financieros y las fichas: hay que revisarlas antes de borrar la tabla; (c) **producción**: es una migración de datos más, con respaldo antes, igual que la anterior.

## 5. Rastreo, hallazgo 5: saldos del vendedor según el acceso a la cuenta

**Regla (confirmada por el cliente):** en una cuenta de acceso `cobro` el vendedor ve **lo que su operación generó** (la diferencia), pero **no el saldo anterior ni el posterior**; en las de acceso `completo` ve todo. Una cuenta que no tiene asignada se trata como `cobro`.

- `DetalleOperacionService::paraUsuario(?User)` devuelve una copia que, para un vendedor, deja en `null` el saldo anterior y el posterior de cada pata de tipo cuenta que no esté en `cuentasCompletas()` y manda `monto` = posterior − anterior. Admin, moderador o sin usuario ven todo. Cubre pagos, comisión, gestor y mensajero de las ventas, y origen y destino de Gasto, Ingreso y Transferencia (Compras, Remesas y Ajustes solo los ven admin y moderador).
- El Rastreo lo usa (`$this->detalleOperacionService->paraUsuario($request->user())`). Los demás llamadores (Cuentas, Clientes, Proveedores) no cambian: sin llamar a `paraUsuario` ven los saldos de siempre. El frontend no cambió (la tarjeta ya pinta «Monto» y «—» para saldos nulos).
- Verificado con la venta #1538 (MANZANILLO 2, cobró 700 en una cuenta `cobro`): el vendedor recibe `monto = 700` y saldos nulos; el admin, −330,86 → 369,14. En el navegador, con la sesión de admin, la tarjeta sigue mostrando los saldos. **No se probó con una sesión de vendedor**.
- **Pregunta abierta:** la misma fuga puede existir en las pantallas de Cuentas y Clientes, donde el vendedor también ve detalles. Se revisará por separado.

## 6. Rastreo, hallazgo 8: texto del banner

«Cierres de caja se agregan en fases siguientes» prometía algo que no está agendado (en el plan era una pregunta abierta). El banner lista ahora los tipos reales: admin y moderador, «Ventas, Gastos, Ingresos, Transferencias, Compras, Operaciones Múltiples y Ajustes de saldo»; vendedor, «Ventas, Gastos, Ingresos y Transferencias». También se actualizó el comentario del controlador.

## 7. Verificación

| Qué | Resultado |
|---|---|
| `RastreoOperacionesTest` | 58 verdes (251 aserciones): +1 de anuladas, +3 de saldos por acceso (vendedor con pago `cobro` y comisión en cuenta ajena, transferencia con destino ajeno, admin sin cambios); el test de la lista de proveedores y el de `proveedor_direccion` se reescribieron para el comportamiento nuevo, no se borró ninguno |
| `PasarHistorialProveedoresAClientesMigracionTest` (nuevo) | 3 verdes: reasignación sin tocar saldos, regla del sufijo, proveedor sin cliente |
| Relacionados | Proveedor, Remesa, Clientes, Cuentas y la migración anterior: 78 verdes |
| Calidad | Pint, `npm run types` (0 errores) y ESLint del archivo, limpios |
| Suite completa | Tras los hallazgos del Rastreo: 1.022 tests, 7.030 aserciones, verdes (130 s). **Al final del día: 1.029 tests, 7.080 aserciones, verdes** (sección 12) |

## 8. Pendiente (al cierre de los hallazgos del Rastreo; el pendiente final está en la sección 12)

- **Rastreo:** solo queda el hallazgo 7 (el PDF exporta únicamente la página actual); el cliente lo dejó para después.
- Revisar la misma regla de saldos en Cuentas y Clientes (sección 5).
- Antes de borrar `proveedors`: Cierre de Caja, Telegram, notificaciones, Cuentas, Movimientos Financieros y fichas (sección 4).
- Desplegar la migración del historial en producción, con respaldo antes.
- Lo de siempre: Casillero (incidencias, Fase 3, Fase 4), `DashboardStatsService` y los `DATE()` con la zona de negocio, Empleados paso 5 y 7, 7 reportes sin rediseñar, qué ganancia es la oficial.

## 9. Conciliación del Excel viejo con el sistema

El cliente comparaba producción con un Excel que llevaba antes y veía «una gran diferencia». Se concilió el `docs/backup/excel/20-10-26 EXCEL.xlsm` (corte 10-20, 21:56 hora de Cuba) contra la copia de producción del 10-21 (03:49 UTC). Documento para el cliente: `docs/conciliacion-excel-vs-sistema-2026-10-21.md`.

| Cifra | Excel | Sistema (CUP a 840) | Diferencia |
|---|---:|---:|---:|
| Capital | 1.295.079,37 | 1.292.018,52 | +3.060,85 (0,24 %) |
| Mes anterior (cierre de septiembre) | 1.253.004,00 | 1.252.955,13 | +48,87 |
| Ventas de octubre, ingresos / margen | 376.183 / 69.075 | 376.466 / 69.069 | −283 / +6 |
| Remesas de octubre (margen) | +1.604 | +1.601,52 | ≈ 3 |

- **De dónde sale la diferencia de capital:** inventario +3.060 (3.000 son la **compra #31 pendiente de aprobar**: 3 antenas grandes a 1.000 para CALVARIO TIENDA = «DANIEL ALMACEN» del Excel; el sistema solo suma stock al aprobar); clientes y proveedores +1.438 (LINYI, +1.437,80 como proveedor en el Excel y sin saldo en el sistema); cuentas USD −1.405 y CUP −26.710 CUP **sin ubicar** (los nombres de cuenta no se pueden cruzar; hace falta una lista de equivalencias).
- **Por qué parecía una gran diferencia:** el «Acumulado actual» del Excel (42.075,37) es el **crecimiento del capital** (ya incluye gastos e ingresos) y la tarjeta «Ganancia Neta» del Dashboard (63.043) era la ganancia de operaciones **antes de gastos**. Dos medidas distintas con nombres parecidos.
- **Cómo está el Excel:** `INICIO` (CAPITAL = CUP/840 + fondo USD; MES ANTERIOR tecleado a mano), `CUENTAS`, `PRODUCTOS` (504 filas), `ALMACEN`, `REGISTRO` (41.704 operaciones con columna GANANCIA). Tasas: 840 sistema, 815 comisión (el sistema guarda la de comisión en `ventas.comision_tasa`; las ventas del 20 y 21 de octubre tienen 815).
- **Trampa del Excel:** en `REGISTRO` las fechas con día ≤ 12 están guardadas con **mes y día invertidos**; se corrigieron y validaron con los códigos `MDIN` (6.158 de 6.158). Se leyó con `openpyxl` en un entorno virtual fuera del proyecto (`/home/pushodev/.venvs/openpyxl`, `read_only=True`).
- **Inventario:** 437 de 504 productos coinciden exactamente en cantidad y costo; el resto son nombres repartidos distinto (variantes «[POR AJUSTAR]»).
- **Comisión:** el Excel registra 3.883 y el sistema 5.131 en octubre; no se verificó por qué (el Excel la anota aparte, quizá al pagarla).
- **Errores del 16-10 (#1692 y #1693):** ingreso de 250.000 USD («ERROR AL MONTAR») y gasto de 205.000.000 CUP, una corrección de moneda que solo es neutra a la tasa de ese día (820). Inflan los totales de gastos e ingresos (291.553 y 271.485 en vez de 41.553 y 21.485). **No conviene anularlos**: al anular los dos en la BD de desarrollo el capital bajó 5.952,38 (250.000 − 205.000.000/840) porque las cuentas volvieron al estado previo a la corrección. Idea sin diseñar: una marca de «corrección» para excluirlos de los totales.

## 10. Dashboard: tarjetas nuevas y correcciones

Se dejó **intacto lo que había** y se agregó lo ajustado aparte, para que el cliente vea las dos y decida cuál se queda.

| Cambio | Detalle |
|---|---|
| Tarjeta nueva «Crecimiento del Capital del Mes» | `Dashboard/layout/CrecimientoCapitalMes.tsx` + `DashboardStatsService::getCrecimientoCapitalMes()` + prop `crecimientoCapitalMes` en `AdminController` (solo admin y moderador). Capital de hoy − **cierre del mes anterior guardado por el sistema** (`historial_comparacion_mensuals`, cada moneda a la tasa con que quedó guardada; la fila congelada `PROVEEDORES` queda fuera). Tabla en escalera: margen de productos, comisiones, diferencia cambiaria y ajustes, **ganancia de ventas**, transferencias, remesas, **ganancia de operaciones**, gastos, ingresos, otros efectos, **crecimiento del capital** |
| Ganancia de remesas | `getGananciaAgenciaMes()` suma `ganancia_remesas` = entra − sale − mensajero de las remesas completadas, en USD con la tasa del historial (`historial_tasa_cambios`) en el momento de cada una; el historial se carga una vez. **No se guarda** en la remesa (pendiente de decidir con el cliente: columna + relleno). Octubre: +1.601,52 |
| Tarjeta «Ganancia Real de la Agencia» | Renombrada **«Ganancia de Ventas, Transferencias y Remesas»**, con 4 cajas (ventas, transferencias, remesas y «Ganancia de Operaciones») y nota que remite a la tarjeta del crecimiento. La clave `ganancia_ventas_transferencias` pasó a `ganancia_operaciones` |
| Corrección | La ganancia de transferencias **contaba 3 transferencias anuladas** (+12,64): ahora filtra por `estado = completado` |
| Comparación Mensual | Cada fila trae `tasa_cambio_anterior` (tasa del cierre del mes anterior); la fila «Totales» convierte el «Mes anterior» con ella y «Mes Actual» = saldo acumulado − mes anterior. Así el «Mes anterior» da un solo número en todo el Dashboard (1.252.955,13 y no 1.252.013,66) |

Cifras de octubre en el estado de producción (CUP a 840): ganancia de operaciones 64.631,78 (ventas 63.482,64, transferencias −452,38, remesas +1.601,52); capital 1.292.018,52; cierre de septiembre 1.252.955,13; **crecimiento +39.063,39** (Excel: 42.075,37; la diferencia es la del capital). «Otros efectos» (−5.500,68): partidas verificadas, el recorte de costo de paneles del 2-oct en el inventario (−2.580,71, compensado por un ingreso de +2.550 que cuenta en «ingresos») y la revaluación del CUP (≈ −1.030 según el historial de tasas); el resto no está atribuido.

## 11. Recargas de la BD de desarrollo

Se recargó dos veces `docs/backup/backup_2026-10-21_03-49.sql` + `migrate`. La segunda, porque el cliente anuló a mano #1692 y #1693 en desarrollo y el capital dejó de coincidir con producción; antes de recargar se guardó la base anterior en el scratchpad de la sesión (se pierde al cerrarla). Además hubo pruebas del cliente con la tasa del CUP (840 → 915 → 815 → 925 → 820); en producción la tasa es 840.

## 12. Verificación final y pendiente

| Qué | Resultado |
|---|---|
| Tests nuevos del Dashboard | `CrecimientoCapitalMesTest` (7): crecimiento contra el cierre guardado, sin cierre, props del Dashboard por rol, transferencias anuladas fuera, `tasa_cambio_anterior` por fila, escalera que cierra, remesas con historial de tasas |
| Suite completa | **1.029 tests, 7.080 aserciones, verdes** (2 corridas seguidas). En una corrida anterior falló 1 test que no se identificó y que no volvió a fallar |
| Calidad | Pint, `npm run types` y ESLint limpios; verificado en el navegador (tarjeta y escalera) |

**Pendiente:**
- El cliente decide qué tarjeta del Dashboard se queda y con qué nombre; si la cifra de ganancia debe ser el crecimiento del capital.
- Guardar el margen de cada remesa (columna + relleno) cuando confirme el criterio.
- Ingresos y gastos incluyen ajustes y correcciones (6.571,57 de los ingresos de octubre son «ajustes/errores»): decidir si se separan (marca o tipo).
- Compra #31 (3 antenas): aprobar o descartar y cómo se pagó; saldo de LINYI; lista de equivalencias de cuentas Excel↔sistema; criterio de la comisión del Excel.
- Rastreo, hallazgo 7 (PDF); revisar la regla de saldos del vendedor en Cuentas y Clientes; pantallas que aún leen `proveedors`; desplegar en producción la migración del historial de proveedores (con respaldo).
- Atribuir el resto de «Otros efectos».
