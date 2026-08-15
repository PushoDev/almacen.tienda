# Estado del Desarrollo — almacen.tienda

> **Actualizar este archivo cada vez que se resuelva un bug, se complete una feature o aparezca algo nuevo.**
> Fecha de última actualización: 2026-08-15

---

## Rama activa

`feature/desarrollo-caliente`

---

## 🎯 Lista de tareas priorizada

> Backlog de trabajo consolidado (tests + frontend + bugs conocidos + limpieza). Actualizar el estado (`[ ]`→`[x]`) según se avance, y mover/quitar ítems cuando cambien de prioridad. No duplica el detalle — enlaza a la fuente cuando existe (memoria de progreso de tests, `pendiente-combobox-reemplazo.md`, etc.).

### Alta prioridad
- [ ] **`Cierres/Create.tsx` — no existe conteo físico real de caja**: `saldo_contado` se inicializa como `calculos.saldo_esperado_global` y **no hay ningún `<Input>` en el formulario que permita al usuario escribirlo** (se verificó: no hay `setData('saldo_contado', ...)` en todo el archivo). Consecuencia: `saldo_contado` siempre queda igual a `saldo_esperado`, y por lo tanto `diferencia` (calculada en `store()`) **siempre es 0**. El concepto central de un cierre de caja (comparar lo contado físicamente contra lo esperado) no está implementado en la UI, aunque el backend sí lo soporta completo (`saldo_contado`, `diferencia`, `CierreCaja::tieneDiferencia()`). Hay un array `DENOMINACIONES` (billetes USD/CUP) declarado en `Create.tsx` y nunca usado — parece ser el resto de una calculadora de conteo por denominación que quedó sin terminar. Por esto, la columna/filtro "Cuadre" de `Cierres/Index.tsx` se ocultó temporalmente (2026-07-31) — el filtro backend (`whereRaw('ABS(diferencia)...')`) se dejó implementado y listo, solo falta reconectarlo cuando exista el input real. Encontrado 2026-07-31.
- [ ] **Tests — módulo Cuentas (parcial)**: `Cuentas/Show` (acceso por rol + historial de 3 fuentes) ya tiene 10 tests (`tests/Feature/CuentaTest.php`, 2026-08-01). Falta: `ajustarSaldo` (requiere contraseña admin), saldo negativo interpretado como deuda.
- [ ] **Combobox — `Vendor/Index.tsx`** (selectores Cliente y Almacén del POS): todavía usa la API antigua declarativa (`items` + objeto completo como `value`), no el patrón validado de `Movimientos/Index.tsx`. Este selector vive fuera de cualquier Dialog, así que la conversión es directa (ver `pendiente-combobox-reemplazo.md`).
- [ ] **Bug a validar**: `anularVenta` desde estado `rechazada` podría revertir el stock dos veces (el stock ya se revirtió en `rechazarSolicitudEspecial`). Verificar si la UI expone ese botón para ventas rechazadas y si el controlador tiene guardia.

### Media prioridad
- [ ] **`VentaController.php` — sin control de permisos/dueño en acciones que mueven dinero**: `aprobarVenta`, `anularVenta`, `editarVentaPendiente`, `guardarDistribucion`, `guardarDestinatario`, `aprobarSolicitudEspecial`, `rechazarSolicitudEspecial`, `marcarDecisionNotificada` no tienen ningún chequeo de rol ni de dueño — los comentarios dicen "Admin aprueba..." pero nada lo obliga, así que cualquier vendedor autenticado puede hoy aprobar/anular la venta de otro (mueve saldos de cuenta, comisiones, mensajero) o ver el detalle financiero completo de una venta ajena vía `show()`. Solo `listadoVentas` filtra por dueño. Mismo tipo de hueco ya cerrado en `MovimientosController` (ver historial 2026-08-14), pero acá hay dinero de por medio — mayor impacto. Encontrado y explícitamente pospuesto por el cliente 2026-08-14 ("por ahora dejemoslo asi... eso lo dejamos para luego"). Bugs relacionados en el mismo archivo, también sin arreglar: campos `mensajero_monto_original`/`mensajero_tasa_entrada` se validan/guardan pero nunca se envían desde `Vendor/Index.tsx` (aprueba/anula con monto mensajero en 0 si `mensajero_monto_final_cup` tampoco está); "mensajero propio" queda a medias deshabilitado (validación/enum lo aceptan, pero el movimiento de dinero está comentado); modal "Crear Cliente" en `Vendor/Index.tsx` nunca muestra errores de campo (`setLocalErrors(...)` comentado en línea ~777) — el usuario solo ve un toast genérico. Detalle completo en memoria `project_venta_permisos_bugs_pendientes`. Las 2 rutas huérfanas relacionadas (`ventas.validarStock`/`ventas.actualizarTasas`) ya estaban listadas más abajo en "Pendientes menores conocidos".
- [ ] **`Vendor/Show.tsx` — pasada de UX/UI (headers con degradado), 4 de 8 cards hechas**: ya tienen el header degradado (`docs/patron-card-header-degradado.md`): Distribución de la Venta (emerald), Productos Vendidos (indigo), Detalles de Pago (sky), Resumen Financiero (teal). Faltan 4 cards en `bg-card` plano: "Destinatario" (~línea 2679), "Comisión Punto de Venta" (~2750), "Gestor - Comisión" (~2808), y una cuarta sin confirmar (~2907, posible mensajero) — los números de línea van a estar desactualizados, confirmar con grep antes de tocar. No arrancar ninguna sin que el cliente la nombre primero (disciplina de cola de a un ítem). Pausado además por el cliente, sin fecha: los sub-bloques internos de "Distribución de la Venta" (Resumen de cobro, Mensajería, Comisión Vendedor/Gestor) y el rediseño visual completo de "Detalles de Pago" (logos de banco/bandera/badges, necesita nueva migración en `cuentas`, esquema aún sin decidir). Detalle completo en memoria `project_vendor_show_ux_pass` y `project_detalles_pago_rediseno_visual`.
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
| Cuentas financieras | CRUD, control de saldo con contraseña, tipos de instrumento, historial de operaciones (Compras/Ventas/Transacciones) con filtros, acceso de vendedor a sus propias cuentas (2026-08-01) |
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
| **B9** | `CuentaController::obtenerHistorialVentas()` | Al agregar filtros (`->where('fuente', ...)`) sobre una query armada con `UNION ALL` embebida como subquery cruda (`DB::raw()`), usar `mergeBindings($query)` y luego encadenar `->where()` corrompe el orden de los bindings — Laravel compila el bucket `where` ANTES que `union`, así que el binding del filtro nuevo se cuela en medio de los bindings del UNION en vez de ir al final (donde está su `?` real en el SQL de texto). Filtrar por "Comisión Gestor" devolvía filas de "Pago de venta" | Corregido 2026-08-01: reemplazar `mergeBindings($query)` por `addBinding($query->getBindings(), 'where')`, que aplana todo en un solo bucket en el orden real del SQL. Regresión cubierta por 2 tests nuevos en `CuentaTest.php` |

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
- [ ] **Reportes** — Limpieza de los 15 reportes en curso, uno por uno según orden del cliente. Ver `docs/arreglos-pendientes/reportes-arreglos-2026-08-01.md` (índice completo con hallazgos por reporte) — no duplicar el detalle acá. **Rastreo de Operaciones** (el que le interesa al cliente) tiene Fases 0-3, 5, 7, 8, 9 cerradas; quedan Fase 4 (stock final) y parte de Fase 6 (drill-down, PDF export), ambas baja prioridad — detalle en `docs/arreglos-pendientes/rastreo-operaciones-rediseno-2026-08-01.md`. Los otros 14 reportes siguen `[ ] Pendiente`, sin tocar. Dos bugs reales ya identificados ahí: #8 Productos Más Vendidos no tiene archivo frontend (rompe al abrir), varios reportes no tienen paginación/límite.

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
| 2026-08-15 | **Dos hallazgos de la sesión del 2026-08-14 anotados como "media prioridad" a pedido del cliente** (no se tocó código): (1) `VentaController.php` sin control de permisos/dueño en las acciones que mueven dinero (`aprobarVenta`/`anularVenta`/etc.) — cualquier vendedor puede hoy aprobar/anular la venta de otro; más bugs relacionados (campos mensajero muertos, "mensajero propio" a medias, modal "Crear Cliente" sin mostrar errores de campo). (2) `Vendor/Show.tsx`: quedan 4 de 8 cards sin header degradado (Destinatario, Comisión Punto de Venta, Gestor-Comisión, una cuarta sin confirmar). Ver detalle en la sección "Media prioridad" arriba. También corregido: el checklist de migración sileo (`docs/arreglos-pendientes/migracion-toasts-sileo-2026-08-14.md`) tenía `Movimientos/Index.tsx` marcado `[ ] Pendiente` cuando ya está migrado (verificado en código) — actualizado a `[x]` |
| 2026-08-13 | **Precios de Venta — modal masivo por almacén (`/disponibles`), admin-only.** Nuevo botón "Buscar Producto" abre un modal de dos paneles: buscar producto (autocompletado client-side, sin endpoint nuevo, sobre los datos ya cargados), ver en qué almacenes está disponible con su precio actual, marcar varios con checkbox, aplicar el mismo precio/comisión a todos a la vez. Backend: `PUT /disponibles/bulk-actualizar` (`ProductoVendedorController::updateBulk()`, ruta bajo middleware `admin.only`), transacción única, `PrecioHistorial` solo donde el precio realmente cambió. **Exige reconfirmar contraseña** antes de aplicar (`Hash::check`, mismo patrón que el cambio de costo en `ProductoController::update()`, pero siempre, no condicional). Reordenado el resto de la vista: estadísticas arriba, controles del almacén (selector con autocompletado + buscar + exportar/importar) agrupados, subtítulo Marca/Modelo/Capacidad visible en la tabla sin hover, y los widgets "Con Precio"/"Sin Precio" ahora funcionan como filtro-toggle de la tabla. **2 bugs reales encontrados y corregidos de paso**: (1) las imágenes de producto usaban `/storage/{imagen_producto}` (403) en vez de `/{imagen_producto}` — este proyecto sirve imágenes desde `public/productos/` vía `asset()`, no desde el disco `storage`; corregido también en el tooltip preexistente de la tabla. (2) el widget de precio de costo en el modal usaba `text-sidebar` (color rojizo del tema, sin contraste en dark mode) en vez de un color neutro. **Hallazgo sin resolver, bloquea tests**: `producto_vendedors` tiene desfase de esquema MySQL/SQLite — la migración `2026_05_30_000001_refactor_producto_vendedors_unico_por_almacen.php` nunca corrió en SQLite (`if (driver !== 'mysql') return;`), así que los 9 tests ya escritos en `tests/Feature/ProductoVendedorTest.php` no pueden correr hasta agregar una migración nueva compatible con SQLite. Detalle completo en `docs/arreglos-pendientes/precios-venta-modal-busqueda-producto-2026-08-13.md` |
| 2026-08-10 | **Módulo Compras — perfeccionamiento del formulario de alta y 3 bugs de UX resueltos.** Nueva sesión, foco en `Comprar/Index.tsx`/`CompraController.php`, todo verificado en navegador contra datos reales. **(1) Autocompletado de productos existentes**: nuevo endpoint `compras.productos.buscar` (reutiliza `Producto::scopeBuscar` y el accessor `cantidad_total`), dispara desde Nombre/Marca/Modelo, autocompleta Marca/Modelo/Capacidad/Categoría (nunca Color ni Precio, a propósito) y avisa stock/costo actual desglosado por almacén antes de sobreescribir el costo. **(2) Formulario reorganizado** en 3 grupos visuales (`FieldSet`: Identificación / Destino y Categoría / Datos Comerciales), prefijo `$` en Precio, Enter para agregar sin mouse, preview en vivo del código autogenerado. **(3) Tabla del carrito rediseñada**: envuelta en `Card` (antes `min-h-[100vh]` dejaba un vacío enorme con pocos productos), zebra striping, footer con tokens del tema en vez de grises hardcodeados que rompían el modo oscuro. **(4) Migración `compra_producto`**: pasó de clave primaria compuesta `(compra_id, producto_id)` a `id` autoincremental — el mismo producto ya puede tener varias líneas en una compra (distinto almacén/color) sin fusionarse ni promediar precio; ajustados `TransaccionController` (distribución de costos/transportación) y los reportes que contaban "veces comprado" para no asumir una fila por producto. 1 test nuevo en `CompraTest.php` (suite completa: 140/140 verdes). **(5) Tres bugs de UX arreglados**: Combobox roto por mouse dentro del diálogo "Editar Producto" (mismo patrón ya documentado en `pendiente-combobox-reemplazo.md`, resuelto con `container` + ref-callback porque el diálogo vive en un `.map()`); dos listas de clientes desincronizadas entre el combobox superior y el paso de pago (helper `sincronizarClienteEnListas` compartido); errores de validación del backend que solo se mostraban si fallaba el producto en índice 0 del carrito, ahora identifican el producto real sin importar el índice. Nuevo patrón documentado en `docs/patron-dialog-formulario-grande.md` (diálogo grande de dos paneles, más las 2 variantes de una sola columna ya existentes en el proyecto, y un anti-patrón identificado en `Proveedores/Show.tsx` que no usa el componente `Dialog` real). Pendiente, explícitamente pausado por el cliente: reemplazar el paso de pago "Pagar Ahora" por el patrón `PaymentForm`/`PaymentList` que ya usa Ventas — el más grande de la lista, no arrancar sin decisión explícita |
| 2026-08-08 | **Verificación de estado + actualización de documentación**: confirmado que Fases 7/8/9 de Rastreo de Operaciones (abajo) ya están commiteadas (`ee8942c4`..`a5f2e052`), árbol de trabajo limpio. Suite de tests re-corrida: **139 tests, 138 passed, 1 failed** — la regresión de `public/build/manifest.json` (fila siguiente) **no está activa hoy** (esa carpeta no existe en disco); el único fallo es nuevo y distinto: `RastreoOperacionesTest.php:115`, `UniqueConstraintViolationException` en `monedas.nombre_moneda` — parece colisión aleatoria del Faker generando un nombre de moneda duplicado en el factory, no un bug de la feature. Sin arreglar, solo reportado. `context.md` e `INDEX.md` actualizados en la misma pasada para reflejar Fases 7-9 |
| 2026-08-06 | **Rastreo de Operaciones — filtros nuevos: Cliente/Proveedor/Cuenta multiselect + buscar por número de referencia (Fase 9, cerrada)**: pedido explícito del cliente ("ni yo mismo sé qué tipo es esa operación") — escribir un número como `34` ahora encuentra `Venta #34`/`Gasto #34`/etc. sin saber el tipo (`ctype_digit($buscar)` agrega un match exacto por id, sumado a la búsqueda de texto libre de siempre). Los 3 filtros `<select>` de una sola cuenta se reemplazan por combobox multiselect con chips (Cliente/Proveedor/Cuenta) — primer uso real en el proyecto del componente `resources/js/components/ui/combobox.tsx` (`@base-ui/react`), que ya existía sin usarse. Backend: cada filtro aplica solo donde el dato tiene sentido por tipo (ej. Proveedor nunca calza en Venta — el subquery de Venta se fuerza a 0 resultados si el filtro está activo), usando `whereExists` contra `pago_ventas`/`compra_pago` para no duplicar filas cuando una operación tiene varios pagos. `clientes`/`proveedores`/`cuentas` se mandan como props a todos los roles (no es dato de costo). Verificado con tinker y en navegador (selección, chips, remover, persistencia al recargar), y 5 tests nuevos en `RastreoOperacionesTest.php` (135 tests, todos verdes). Detalle completo en `docs/arreglos-pendientes/rastreo-operaciones-rediseno-2026-08-01.md` (Fase 9) |
| 2026-08-06 | **Rastreo de Operaciones — Compras reintegradas al reporte (Fase 7, cerrada)**: quinto tipo junto a Venta/Gasto/Ingreso/Transferencia, admin/moderador-only (vendedor no ve la clave `Compra` en los widgets ni puede forzarla por `?tipo=Compra`, es dato de costo y no había forma de acotar "solo lo mío"). Requirió migración `add_user_id_to_compras_table` (nullable) porque `compras` nunca guardó quién la hizo; `CompraController::store()` lo captura de ahora en adelante, histórico queda en `—`. Backend: `RastreoOperacionesController` gana `construirSubqueryCompra()`/`transformarCompra()` con su propia forma de detalle (proveedor/cliente que recibió el pago, uno o varios métodos de pago que salieron del sistema, productos comprados sin costo/ganancia). Frontend: `RastreoOperaciones.tsx` gana el tipo `'Compra'` en badges/widgets/filtro/columnas y un nuevo componente de detalle expandido. Verificado con tinker + navegador contra las 5 compras reales existentes, y con 4 tests nuevos en `RastreoOperacionesTest.php` (130 tests, todos verdes). Detalle completo en `docs/arreglos-pendientes/rastreo-operaciones-rediseno-2026-08-01.md` (Fase 7) |
| 2026-08-06 | **Rastreo de Operaciones — Fecha/Hora fuera de la tabla y pagos de Venta con badges alineados por color**: dos ajustes emergentes sobre la Fase 8, mismo día. (1) Columna `Fecha/Hora` retirada de la tabla principal a pedido del cliente (sigue en el detalle expandido); tabla queda en 7 columnas: `Referencia \| Cuenta Envía \| Monto \| Cuenta que Recibe \| Monto \| Tasa de la Operación \| Detalles`. (2) En Venta, "Cuenta que Recibe"/"Monto"/"Tasa de la Operación" dejaron de fusionar cuenta+monto en un badge de texto — ahora cada columna muestra un `Badge` por pago, alineados por índice y coloreados con la misma paleta nueva (`colorPago()`) para identificar de un vistazo qué monto y tasa van con qué cuenta cuando una venta tiene varios pagos. Verificado en navegador contra la venta real `#392` (dos pagos, tasas distintas: 685 y 675). Hallazgo nuevo, sin arreglar: el botón "Exportar PDF" del mismo reporte quedó con las columnas viejas, desincronizado de la tabla en pantalla. Solo frontend, sin cambios en el controller. Detalle en `docs/arreglos-pendientes/rastreo-operaciones-rediseno-2026-08-01.md` (Fase 8) |
| 2026-08-06 | **Rastreo de Operaciones — reorganización de columnas de la tabla (Fase 8, UX)**: `Referencia` absorbe la columna `Tipo` (badge coloreado + chevron en una celda). Tabla pasa a formato "partida doble": `Referencia \| Fecha/Hora \| Cuenta Envía \| Monto \| Cuenta que Recibe \| Monto \| Tasa de la Operación \| Detalles`. En Venta, "Cuenta que Recibe" muestra un badge por cada pago (puede haber varias cuentas en una sola venta). Columna `Usuario` retirada de la tabla — **pendiente: Venta se quedó sin ningún lugar donde mostrar quién la hizo**, decidir dónde reponerla. Solo frontend, sin cambios en el controller. Detalle en `docs/arreglos-pendientes/rastreo-operaciones-rediseno-2026-08-01.md` (Fase 8) |
| 2026-08-06 | **Hallazgo (no arreglado todavía): regresión de la suite de tests** — 23 de 126 tests fallan con 409 "Invalid JSON was returned from the route" en rutas Inertia (`CierreCajaTest`, `CuentaTest`, `RastreoOperacionesTest`). Causa: `public/build/manifest.json` ahora existe en disco (antes no) e `Inertia\Middleware::version()` lo hashea automáticamente; los tests no mandan `X-Inertia-Version`, así que Inertia responde 409 de conflicto antes de que la ruta corra. No es un bug de la app — es un artefacto de tener assets compilados al correr la suite. Pendiente de arreglar como parte de "actualizar los tests" |
| 2026-08-01 | **Cuentas — historial de operaciones en `Cuentas/Show.tsx`**: nuevo, antes solo mostraba datos estáticos. `CuentaController` agrega 3 métodos (`obtenerHistorialTransacciones`/`Ventas`/`Compras`) que arman el historial real combinando 4 fuentes que tocan `saldo_cuenta` (`movimientos_financieros`, `pago_ventas`, `ventas` directo para comisión PV/gestor/mensajería, `compra_pago` — las últimas 3 NO quedan logueadas en `movimientos_financieros`, ver B9 para el bug de bindings encontrado al agregar filtros). Frontend: 3 Cards separadas (Compras/Ventas/Transacciones, estilo `Proveedores/Show.tsx` y `Clientes/Show.tsx`) con badge de conteo, botón "Detalle" que enlaza al registro real (`ventas.show`/`transacciones.show`/`comprar.show`), buscador + filtro por tipo + rango de fechas por Card (paginación real, `pagina_transacciones`/`pagina_ventas`/`pagina_compras` como nombres de página independientes). Compras se oculta a `vendedor` (mismo criterio que `precio_compra`). 10 tests nuevos en `tests/Feature/CuentaTest.php` |
| 2026-08-01 | **Cuentas — acceso de `vendedor` a `Cuentas/Show`**: antes solo `admin` (middleware `check.cuenta.permission` binario). Ahora `admin`/`moderador` siempre, `vendedor` solo si la cuenta está en `auth()->user()->cuentas()` (mismo patrón que Gasto/Ingreso/Transferencia). La ruta `show` salió del middleware compartido; el chequeo vive en `CuentaController::show()`. `Cuentas/Index.tsx` muestra "Ver detalles" también a vendedor (antes oculto); "Editar"/"Eliminar" siguen admin-only |
| 2026-08-01 | **Cierres — fix de transferencias entre monedas distintas**: `CierreCajaController::obtenerResumenTransferencias()` deduplicaba por `movimiento_id` con un `$seenMovimientos` declarado DENTRO del loop por moneda — para una transferencia que cruza de moneda (ej. CUP→USD) el "lado saliente" y el "lado entrante" caen en buckets de moneda distintos, así que nunca se deduplicaban entre sí y la transferencia salía duplicada en el historial. Fix: el mapa de vistos se movió fuera del loop (alcance global a la función). Frontend (`Cierres/Show.tsx`/`Create.tsx`): al filtrar por una moneda específica, la fila ahora se muestra desde la perspectiva de esa moneda (signo correcto) en vez del `tipo` canónico fijo |
| 2026-08-01 | **Widget "Resumen Financiero del Turno" oculto para `vendedor`** en `Cierres/Show.tsx`/`Create.tsx` — mostraba ganancia de la agencia, dato que no le corresponde ver a ese rol |
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
