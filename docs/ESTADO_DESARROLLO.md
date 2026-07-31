# Estado del Desarrollo — almacen.tienda

> **Actualizar este archivo cada vez que se resuelva un bug, se complete una feature o aparezca algo nuevo.**
> Fecha de última actualización: 2026-07-31

---

## Rama activa

`feature/desarrollo-caliente`

---

## 🎯 Lista de tareas priorizada

> Backlog de trabajo consolidado (tests + frontend + bugs conocidos + limpieza). Actualizar el estado (`[ ]`→`[x]`) según se avance, y mover/quitar ítems cuando cambien de prioridad. No duplica el detalle — enlaza a la fuente cuando existe (memoria de progreso de tests, `pendiente-combobox-reemplazo.md`, etc.).

### Alta prioridad
- [ ] **`Cierres/Create.tsx` — no existe conteo físico real de caja**: `saldo_contado` se inicializa como `calculos.saldo_esperado_global` y **no hay ningún `<Input>` en el formulario que permita al usuario escribirlo** (se verificó: no hay `setData('saldo_contado', ...)` en todo el archivo). Consecuencia: `saldo_contado` siempre queda igual a `saldo_esperado`, y por lo tanto `diferencia` (calculada en `store()`) **siempre es 0**. El concepto central de un cierre de caja (comparar lo contado físicamente contra lo esperado) no está implementado en la UI, aunque el backend sí lo soporta completo (`saldo_contado`, `diferencia`, `CierreCaja::tieneDiferencia()`). Hay un array `DENOMINACIONES` (billetes USD/CUP) declarado en `Create.tsx` y nunca usado — parece ser el resto de una calculadora de conteo por denominación que quedó sin terminar. Por esto, la columna/filtro "Cuadre" de `Cierres/Index.tsx` se ocultó temporalmente (2026-07-31) — el filtro backend (`whereRaw('ABS(diferencia)...')`) se dejó implementado y listo, solo falta reconectarlo cuando exista el input real. Encontrado 2026-07-31.
- [ ] **Tests — módulo Cuentas**: `ajustarSaldo` (requiere contraseña admin), saldo negativo interpretado como deuda. Siguiente módulo en la cola de tests (ver memoria `tests_progreso` de la sesión).
- [ ] **Combobox — `Vendor/Index.tsx`** (selectores Cliente y Almacén del POS): todavía usa la API antigua declarativa (`items` + objeto completo como `value`), no el patrón validado de `Movimientos/Index.tsx`. Este selector vive fuera de cualquier Dialog, así que la conversión es directa (ver `pendiente-combobox-reemplazo.md`).
- [ ] **Bug a validar**: `anularVenta` desde estado `rechazada` podría revertir el stock dos veces (el stock ya se revirtió en `rechazarSolicitudEspecial`). Verificar si la UI expone ese botón para ventas rechazadas y si el controlador tiene guardia.

### Media prioridad
- [ ] **Tests — RBAC/permisos por rol** (vendedor limitado a sus almacenes/cuentas, `precio_compra_producto`/`costo_unitario` ocultos para vendedor).
- [ ] **Tests — Productos, precios por vendedor, monedas** (único `producto_id`+`almacen_id` en `producto_vendedors`, impacto de cambio de tasa en cuentas).
- [ ] **Combobox — resto de HIGH prioridad**: `Vendor/Show.tsx`, `Vendor/Listado.tsx`, `Comprar/Index.tsx`, `Almacenes/Show.tsx`, `Productos/Edit.tsx`, `Productos/Vendor/Index.tsx` (ver tabla completa en `pendiente-combobox-reemplazo.md`). Revisar si alguno vive dentro de un `Dialog`/`AlertDialog` — de ser así, aplicar el fix de `container` desde el inicio.
- [ ] **F1** — Selector XOR visual `[● Punto de Venta] / [○ Gestor]` en `Vendor/Show.tsx` (actualmente el modo se infiere implícitamente).
- [ ] **F3** — Mover configuración de cuenta mensajero de `Almacenes/Edit` a `Empleados/Edit`.
- [ ] **`Cierres/Create.tsx` — modal de confirmación inalcanzable**: existe el state `showConfirmModal` y su `AlertDialog` ("¿Finalizar Cierre?"), pero el botón "FINALIZAR CIERRE" llama `submit()` directamente en el `onClick` — nunca hace `setShowConfirmModal(true)`. El cierre se finaliza sin pedir confirmación, aunque el modal está construido y listo. Encontrado 2026-07-31.
- [ ] **`Cierres/Create.tsx` — código muerto**: bloque `{false && (...)}` de ~80 líneas ("Distribución del Dinero", cuentas vs clientes) que nunca se renderiza. Encontrado 2026-07-31.
- [ ] **`Cierres/Create.tsx` / `Cierres/Show.tsx` — duplicación masiva**: ambos archivos (~2310 líneas cada uno) comparten casi todo el JSX (widgets, tablas, diálogos, comparativa) copiado y pegado, y declaran por separado el mismo set grande de interfaces TypeScript (`Calculos`, `DetalleMoneda`, `ItemVenta`, `ItemMovimiento`, `TransferenciaItem`, etc. — sin archivo de tipos compartido). `Show.tsx` además reconstruye a mano un objeto `calculos` desde el `cierre` guardado (líneas ~400-470) solo para reutilizar el render de `Create.tsx`. Candidato a extraer componentes/tipos compartidos. Encontrado 2026-07-31.

### Baja prioridad / limpieza
- [ ] **Combobox — MEDIUM prioridad**: `Empleados/Create.tsx`, `Empleados/Edit.tsx`, `Transacciones/CambiarCostoManual.tsx`, `Reportes/Report/RastreoOperaciones.tsx`, `Logistica/layout/ComprasVentas.tsx`, `Logistica/layout/ProductosPorAlmacen.tsx`.
- [ ] **Código muerto**: eliminar `resources/js/pages/almacenes/`, `categorias/`, `proveedores/` (minúscula, sin referenciar desde ningún controlador).
- [ ] **Rutas rotas**: `POST /ventas/validar-stock` y `POST /ventas/actualizar-tasas` sin método en `VentaController` — implementar o eliminar la ruta.
- [ ] **Ruta huérfana**: `routes/vendor/vendedor.php` no está incluida desde `routes/web.php` — incluirla o eliminarla.
- [ ] **F2** — Display mensajero multi-moneda completo (hoy limitado a USD/CUP).
- [ ] **F4** — `ganancia_real_total` muestra 0 en algunos casos.

---

## ✅ Módulos completos y estables

| Módulo | Descripción |
|---|---|
| Productos | CRUD, códigos de barras automáticos, import/export Excel, historial de costos |
| Almacenes | CRUD, inventario por almacén, asignación de usuarios |
| Compras | Registro, pagos múltiples, distribución de costos, relación proveedor/cliente |
| Movimientos de stock | Traslados entre almacenes, estados, discrepancias, auditoría |
| Categorías / Proveedores / Clientes | CRUD completo |
| Cuentas financieras | CRUD, control de saldo con contraseña, tipos de instrumento |
| Monedas y tasas | CRUD, historial de cambio de tasa, impacto en cuentas |
| Transacciones financieras | Gastos, ingresos, transferencias bidireccionales |
| Reportes | Inventario, ventas, compras, ganancias, historial, rastreo |
| API pública | Catálogo sin autenticación (`/api/tienda/*`) |
| Notificaciones | Base de datos, bell en UI, lectura y marcado |
| Ecommerce (básico) | Vista de catálogo pública — en desarrollo |

---

## ✅ Módulo de Ventas — Implementado

| Feature | Estado |
|---|---|
| POS — crear venta con carrito | ✅ |
| Multi-moneda en pagos | ✅ |
| Comisión vendedor por item | ✅ |
| Venta especial (precio bajo mínimo) | ✅ |
| Aprobación/rechazo venta especial | ✅ |
| Venta con gestor (intermediario) | ✅ |
| Pago a cliente (deuda diferida) | ✅ |
| Edición de venta pendiente | ✅ |
| Anulación con motivo y reversión | ✅ |
| Mensajero multi-moneda en POS | ✅ (2026-06-25) |
| Monto final CUP editable en Show | ✅ (2026-06-28) |
| Validaciones al aprobar (mensajero) | ✅ (2026-06-28) |
| Widget TasasFlotante global | ✅ (2026-06-28) |
| Destinatario de venta | ✅ |
| Listado de ventas con filtros | ✅ |

---

## ✅ Módulo de Cierre de Caja — Implementado

| Feature | Estado |
|---|---|
| Cálculo de saldo esperado | ✅ |
| Separación mensajero del saldo | ✅ (2026-06-28) |
| Snapshot de cuentas y clientes | ✅ |
| Snapshot de mensajero | ✅ (2026-07-01) |
| Resumen financiero del turno (tarjeta verde) | ✅ (2026-07-01) |
| Desglose per-venta comisión PV y Gestor | ✅ (2026-07-01) |
| Mensajero en modal "Por dónde entraron" | ✅ (2026-07-01) |
| Comparativa con cierre anterior | ✅ |
| Vista Create.tsx actualizada | ✅ |
| Vista Show.tsx actualizada | ✅ |

---

## ✅ Bot de Telegram — Implementado (rama feature/bot-telegram)

| Feature | Estado |
|---|---|
| Infraestructura: paquete, webhook, secret | ✅ |
| Campo `telegram_chat_id` en usuarios | ✅ |
| Comando `/vincular CODIGO` | ✅ |
| Comando `/start` | ✅ |
| Comando `/reporte` | ✅ |
| Comando `/cierres` | ✅ |
| Comando `/ayuda` | ✅ |
| Notificación cierre de caja | ✅ |
| Notificación venta especial + botones Aprobar/Rechazar | ✅ |
| Notificación decisión venta especial al vendedor | ✅ (database only) |
| Notificación venta creada | ✅ |
| Notificación movimiento de stock | ✅ |
| Notificación cambio precio vendedor | ✅ |
| Notificación movimiento financiero | ✅ |

---

## ✅ Bugs resueltos recientemente

| ID | Método | Descripción | Fix |
|---|---|---|---|
| **B1** | `guardarDistribucion` | Devuelve `saldo_actual` en la respuesta pero el campo real es `saldo_cuenta` | Corregido: ahora retorna `saldo_disponible` desde `saldo_cuenta` (VentaController:L1819) |
| **B2** | `aprobarVenta` | Falta guardia XOR en comisión vendedor | Corregido: `if (!$venta->es_venta_gestor && ...)` en L1374 |
| **B3** | `procesarVenta` | `foreach ($pagos)` sin `?? []` | Corregido: `foreach ($validatedData['pagos'] ?? [] as $pago)` en L803 |
| **B6** | `MovimientosController::rechazar()` | Rechazar un movimiento `en_transito` incrementaba `cantidad` en el origen además de liberar `cantidad_en_transito` — pero `cantidad` nunca se decrementa en `enviar()` (solo en `recibir()`). Duplicaba stock fantasma en cada rechazo | Corregido 2026-07-31: se quitó el `increment('cantidad', ...)` indebido |
| **B7** | Migraciones `estado` enum (`movimientos`, `movimiento_seguimientos`) | Las migraciones que agregan `pendiente_confirmacion` al enum están gateadas a `if (driver === 'mysql')` — en SQLite (default del quickstart) cualquier creación de movimiento fallaba con `CHECK constraint` | Corregido 2026-07-31: nueva migración solo-SQLite (`2026_07_31_141334_fix_movimientos_estado_enum_sqlite.php`), no-op en MySQL |
| **B8** | `TransferenciaController::store()` | El check de permiso de vendedor sobre la cuenta destino usaba `DB::table('user_cuentas')->pluck('cuenta_id')` sin filtrar por el usuario actual — un vendedor podía transferir a la cuenta de OTRO vendedor | Corregido 2026-07-31: `auth()->user()->cuentas()->pluck('id')`, igual patrón que el check de origen |

## 🐛 Bugs activos pendientes

### Mensajero

| ID | Módulo | Descripción | Impacto |
|---|---|---|---|
| **B4** | `AlmacenController@edit` | Carga todas las cuentas (USD, CUP, MLC mezcladas) en el selector de cuenta mensajero | El usuario puede seleccionar una cuenta no-CUP y romper la lógica |
| **B5** | Config mensajero | La cuenta de mensajero se configura en `Almacenes → Edit`. Debería estar en `Empleados → Edit` | UX confusa, admin tiene que ir a dos lugares |

---

## 🔧 Features pendientes

### Show.tsx (Vendor/Show.tsx)

| ID | Descripción | Prioridad |
|---|---|---|
| **F1** | Selector XOR visual `[● Punto de Venta] / [○ Gestor]` en el panel de distribución. Actualmente el modo se infiere implícitamente de los campos en DB, lo que puede causar confusión | Alta |
| **F2** | Display mensajero multi-moneda completo — la interfaz TypeScript y el display deben soportar cualquier moneda del sistema, no solo USD/CUP | Media |

### Empleados

| ID | Descripción | Prioridad |
|---|---|---|
| **F3** | Mover configuración de cuenta mensajero de `Almacenes/Edit` a `Empleados/Edit` — el admin asigna el almacén y configura la cuenta mensajero en el mismo formulario | Media |

### Ganancia

| ID | Descripción | Prioridad |
|---|---|---|
| **F4** | `ganancia_real_total` muestra 0 en algunos casos — separar correctamente el cálculo | Media |

---

## ✅ Features completadas recientemente

| ID | Descripción | Fecha |
|---|---|---|
| **—** | **Módulo Transacciones (75%)** — Gastos, Ingresos, Transferencias con control de saldo, arreglo flujo contable. ⚠️ Sin cambios desde esta fecha: los 8 commits del 2026-07-30 titulados "Mejorando transacciones sections" en realidad modificaron `CierreCajaController`/`Cierres/*.tsx`, no los controladores de Transacciones — no leer el git log literalmente para este módulo. | 2026-07-28 |
| **—** | **Cuentas — tipo_titular** (externa/personal), eliminación campo `deuda`, unificación `temporales→permanentes` | 2026-07-28 |
| **—** | **Cuentas — soporte saldos negativos** detectados como deudas, ajustes en UI | 2026-07-28 |
| **—** | **Logística II** — Expansión con Create/Edit/Show, layouts de charts (ComprasVentas, ProductosPorAlmacen) | 2026-07-27 |
| **—** | **Logística I** — 4 widgets Capital Financiero (Capital, USD, CUP, EUR) con datos reales, resúmenes de Cuentas/Clientes/Proveedores/Productos | 2026-07-26 |
| **F6** | Herramienta detección y fusión de productos duplicados — 2 modales, agrupación con capacidad normalizada, suma cantidades + promedio precios | 2026-07-25 |

## 📋 Pendientes menores conocidos

- [ ] **Código muerto — páginas duplicadas en minúscula**: `resources/js/pages/almacenes/`, `categorias/`, `proveedores/` (con `index.tsx` minúscula) coexisten con `Almacenes/`, `Categorias/`, `Proveedores/` (mayúscula, las que realmente usan los controladores vía `Inertia::render`). Las versiones en minúscula no están referenciadas por ningún controlador — sin tocar de nuevo desde feb/abr/jun 2026. Candidatas a eliminar.
- [ ] **Rutas rotas**: `POST /ventas/validar-stock` y `POST /ventas/actualizar-tasas` están registradas en `routes/shop/puntoventa.php` pero `VentaController` no tiene esos métodos — fallarían si se invocan. Ver `docs/rutas-y-controladores.md`.
- [ ] **Ruta huérfana**: `routes/vendor/vendedor.php` (define `/vendedor`) no está incluida desde `routes/web.php` — inalcanzable.
- [ ] Validar que `anularVenta` desde estado `rechazada` no revierta el stock dos veces (el stock ya fue revertido por `rechazarSolicitudEspecial`). Verificar si la UI expone ese botón para ventas rechazadas.
- [ ] El commando `/reporte` del bot no filtra por almacén del usuario — devuelve todos los almacenes. Considerar filtro para admins con almacenes asignados.
- [ ] Ecommerce: vista pública del catálogo está en desarrollo, no vinculada al POS.
- [ ] **Reportes** — Revisar que todas las sub-rutas de `/reportes/*` funcionen y devuelvan datos correctos (productos-mas-comprados, compras-por-periodo, balance-gastos-mensuales, inventario-por-almacen, inventario-detallado-por-almacen, reporte-stock-bajo, valor-inventario, productos-mas-vendidos, ventas-por-periodo, ventas-por-vendedor, reporte-ganancias, rastreo-operaciones, historial-precios, historial-costo-precio, movimientos-financieros).

---

## 📁 Archivos clave por módulo

### Ventas
```
app/Http/Controllers/VentaController.php     ← controlador principal (más de 1800 líneas)
app/Models/Venta.php
app/Models/VentaDetalle.php
app/Models/PagoVenta.php
resources/js/pages/Vendor/Index.tsx          ← POS
resources/js/pages/Vendor/Show.tsx           ← gestión de venta pendiente
resources/js/pages/Vendor/Listado.tsx        ← listado con filtros
```

### Cierre de Caja
```
app/Http/Controllers/CierreCajaController.php    ← ~1,943 líneas
app/Models/CierreCaja.php
resources/js/pages/Cierres/Create.tsx
resources/js/pages/Cierres/Show.tsx
resources/js/pages/Cierres/Index.tsx
```

### Bot Telegram
```
app/Http/Controllers/TelegramWebhookController.php
app/Channels/TelegramChannel.php
app/Notifications/CierreCajaNotification.php
app/Notifications/VentaEspecialSolicitudNotification.php
app/Notifications/VentaEspecialDecisionNotification.php
app/Notifications/VentaCreadaNotification.php
app/Notifications/MovimientoStockNotification.php
app/Notifications/MovimientoFinancieroNotification.php
app/Notifications/CambioPrecioVendedorNotification.php
config/telegram.php
routes/api.php                               ← ruta /telegram/webhook
```

### Precios por vendedor
```
app/Http/Controllers/ProductoVendedorController.php
app/Exports/PreciosVendedorExport.php
app/Imports/PreciosVendedorImport.php
resources/js/pages/Productos/Vendor/Index.tsx
```

### Usuarios y empleados
```
app/Http/Controllers/UserController.php
app/Http/Controllers/UserAlmacenController.php
resources/js/pages/Empleados/Index.tsx
resources/js/pages/Empleados/Create.tsx
resources/js/pages/Empleados/Edit.tsx
```

### Logística
```
app/Http/Controllers/LogisticaController.php
app/Services/DashboardStatsService.php
resources/js/pages/Logistica/Index.tsx
resources/js/pages/Logistica/Create.tsx
resources/js/pages/Logistica/Edit.tsx
resources/js/pages/Logistica/Show.tsx
resources/js/pages/Logistica/layout/*         ← ComprasVentas, ProductosPorAlmacen, KPIsPeriodo
```

### Transacciones
```
app/Http/Controllers/TransaccionController.php
app/Http/Controllers/GastoController.php
app/Http/Controllers/IngresoController.php
app/Http/Controllers/TransferenciaController.php
resources/js/pages/Transacciones/Index.tsx
resources/js/pages/Transacciones/Create.tsx
resources/js/pages/Transacciones/Show.tsx
resources/js/pages/Transacciones/Historial.tsx
resources/js/pages/Transacciones/CambiarCostoManual.tsx
resources/js/pages/Transacciones/layout/*      ← Movimientos, forms varios
```

---

## 🔄 Historial de cambios recientes

| Fecha | Cambio |
|:---:|---|
| 2026-07-31 | **Tests Pest** — 100 tests nuevos: `VentaTest.php` (24), `CierreCajaTest.php` (13), `MovimientoTest.php` (15), `TransaccionFinancieraTest.php` (17). En el proceso se encontraron y corrigieron 3 bugs reales (B6, B7, B8, ver arriba) y se arreglaron factories desactualizadas (`CuentaFactory`, referenciaba columna `deuda` eliminada) y faltantes (`MovimientoFinancieroFactory`, nueva) |
| 2026-07-31 | **Frontend — Combobox en `PaymentForm.tsx`** (campo "Destino del Pago" en el POS): convertido de `<Select>` a `<Combobox>` con lista combinada cuentas+clientes físicos, búsqueda por texto, truncado con tooltip. Encontrado y arreglado un bug de conflicto Radix `AlertDialog` vs `@base-ui/react` Combobox (portal fuera del focus-trap rompía click y scroll con mouse) — fix genérico en `combobox.tsx` (`ComboboxContent` acepta `container`), documentado en `pendiente-combobox-reemplazo.md` |
| 2026-07-31 | **Frontend — Inputs numéricos sin scroll-to-change**: fix centralizado en `resources/js/components/ui/input.tsx` (`onWheel` hace `blur()` cuando `type="number"`), cubre automáticamente todos los `<Input type="number">` del proyecto |
| 2026-07-30 | **Cierres — desglose de productos y filtros** (8 commits, 14:18→17:02, mal etiquetados "transacciones"): `CierreCajaController` agrega `productos` (nombre/marca/modelo/cantidad) a cada línea de comisión PV y Gestor; campo `moneda` en movimientos financieros del detalle de cierre; deduplicación de transferencias por `movimiento_id`; `Cierres/Show.tsx`/`Create.tsx` separan gastos/ingresos/transferencias `es_propio` vs externos y agregan búsqueda/filtro para cuentas y clientes en la comparativa (~800 líneas modificadas en total) |
| 2026-07-30 | "Compras con 0.90" en `CompraController` (commit `e7fc149e`, previo a los 8 commits de Cierres) |
| 2026-07-28 | **Transacciones 75%** — Gastos, Ingresos, Transferencias funcionales. Arreglos en flujo contable y control de saldos |
| 2026-07-28 | **Cuentas — `tipo_titular`** (externa/personal), eliminación campo `deuda`, unificación `temporales→permanentes` vía migración |
| 2026-07-28 | **Cuentas — soporte saldos negativos** como deudas, ajustes en backend y UI |
| 2026-07-28 | **Arreglo Empleados** — Correcciones en gestión de empleados |
| 2026-07-27 | **Logística II** — Expansión con Create/Edit/Show, layouts de charts (ComprasVentas, ProductosPorAlmacen, KPIsPeriodo) |
| 2026-07-27 | **Arreglo Movimientos** — Correcciones en flujo de movimientos de stock |
| 2026-07-26 | **Logística I** — 4 widgets Capital Financiero (Capital, USD, CUP, EUR) con datos reales, resúmenes de Cuentas/Clientes/Proveedores/Productos. Iconos (`Landmark`, `DollarSign`, `Wallet`, `Euro`), `border-l-4`, `shadow-sm hover:shadow-md`. Limpiados imports no usados y prop `balances`. |
| 2026-07-26 | **Cuentas Index — Row 3 ahora filtra solo permanentes**: nuevo `por_moneda_perm` en backend. Formato moneda con `": "` en toda la vista (ej. `$: 305.834,63`). |
| 2026-07-26 | **Cuentas Index rediseñado** — 3 filas de widgets interactivos clickeables. Filtros combinados + resumen de saldos por moneda. Deudas detectadas desde `saldo_cuenta < 0`. |
| 2026-07-25 | **F6** — Herramienta detección/fusión de duplicados: 2 modales, normalización unicode capacidad, suma cantidades + promedio precios |
| 2026-07-24 | Columnas **Marca, Modelo, Capacidad, Color** agregadas al Excel de export/import de precios (`PreciosVendedorExport`, `PreciosVendedorImport`). `UserController`: filtrado de cuentas para empleados solo `permanentes` |
| 2026-07-15 | `color_producto` añadido a tabla/tooltip en Productos, Movimientos, Compras y todas las vistas donde aparecía el producto |
| 2026-07-15 | `CompraController::show()` implementado — historial de compras recientes en `Comprar/Index`, vista detalle `Comprar/Show`. Fix: parámetro renombrado a `$comprar` para que el route model binding de `{comprar}` funcione correctamente |
| 2026-07-01 | Snapshot de mensajero en cierre_cajas, resumen financiero turno, desglose comisiones PV/Gestor |
| 2026-06-28 | `mensajero_monto_final_cup` editable, TasasFlotante global, validaciones mensajero en aprobar |
| 2026-06-25 | Mensajero multi-moneda en POS (selector moneda + tasa + equivalente USD) |
| 2026-06-23 | Lógica financiera unificada mensajero (propio/externo, USD/CUP) |
| 2026-06-22 | Migraciones mensajero en ventas y almacens |
| 2026-06-02 | Bot Telegram: infraestructura, webhook, notificaciones, comandos |
| 2026-05-30 | Refactor producto_vendedors (único por almacén), comisión en precio_historials |
| 2026-05-29 | Venta especial: campos de estado, flujo admin Telegram |
| 2026-05-25 | Comisión vendedor por item (`comision_unitaria`), tracking `total_comision` |
| 2026-05-21 | Códigos de barras en ventas, fixes de flujo |
