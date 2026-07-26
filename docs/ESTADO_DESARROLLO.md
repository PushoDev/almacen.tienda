# Estado del Desarrollo — almacen.tienda

> **Actualizar este archivo cada vez que se resuelva un bug, se complete una feature o aparezca algo nuevo.**
> Fecha de última actualización: 2026-07-26

---

## Rama activa

`feature/bot-telegram`

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

## 🐛 Bugs conocidos pendientes

### VentaController

| ID | Método | Descripción | Impacto |
|---|---|---|---|
| **B1** | `guardarDistribucion` (~L1759) | Devuelve `saldo_actual` en la respuesta pero el campo real del modelo es `saldo_cuenta` | UI muestra saldo incorrecto en el modal de distribución |
| **B2** | `aprobarVenta` + `anularVenta` | Falta guardia XOR: el bloque de comisión vendedor no tiene `&& !$venta->es_venta_gestor` | Doble débito potencial si gestor y comisión PV están ambos configurados |
| **B3** | `procesarVenta` (~L803) | `foreach ($validatedData['pagos'] as $pago)` sin `?? []` | Crash si el frontend envía `pagos: null` |

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
| **F6** | Herramienta detección y fusión de productos duplicados — 2 modales, agrupación con capacidad normalizada, suma cantidades + promedio precios | 2026-07-25 |

## 📋 Pendientes menores conocidos

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
app/Http/Controllers/CierreCajaController.php
app/Models/CierreCaja.php
resources/js/pages/Cierres/Create.tsx
resources/js/pages/Cierres/Show.tsx
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

---

## 🔄 Historial de cambios recientes

| Fecha | Cambio |
|---|---|---|
| 2026-07-26 | **Cuentas Index — Row 3 ahora filtra solo permanentes**: nuevo `por_moneda_perm` en backend. Formato moneda con `": "` en toda la vista (ej. `$: 305.834,63`). Bug detectado: moneda USD (id=1) eliminada de DB — 79 cuentas huérfanas agrupadas como 'N/A'. |
| 2026-07-26 | **Cuentas Index rediseñado** — 3 filas de widgets interactivos clickeables (KPIs, desglose por tipo con barras, desglose por moneda). Filtros combinados + resumen de saldos por moneda. Deudas detectadas desde `saldo_cuenta < 0`. Bugfixes: filtro "all" roto, opción "Deudas" ausente en dropdown, acciones ocultas en móvil, paginación con páginas duplicadas. Backend: bloque `$resumen` precalculado en `CuentaController@index`. |
| 2026-07-25 | **F6** — Herramienta detección/fusión de duplicados: 2 modales, normalización unicode capacidad, suma cantidades + promedio precios |
| 2026-07-15 | `color_producto` añadido a tabla/tooltip en Productos, Movimientos, Compras y todas las vistas donde aparecía el producto |
| 2026-07-15 | `CompraController::show()` implementado — historial de compras recientes en `Comprar/Index`, vista detalle `Comprar/Show`. Fix: parámetro renombrado a `$comprar` para que el route model binding de `{comprar}` funcione correctamente |
| 2026-07-24 | Columnas **Marca, Modelo, Capacidad, Color** agregadas al Excel de export/import de precios (`PreciosVendedorExport`, `PreciosVendedorImport`). `UserController`: filtrado de cuentas para empleados solo `permanentes` |
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
