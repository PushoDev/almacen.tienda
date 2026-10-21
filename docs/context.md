# Contexto del Proyecto: almacen.tienda

> **ERP / POS multi-almacén** para tienda física con soporte multi-moneda (USD/CUP/MLC), control de inventario, ventas, compras, logística de traslados, comisiones por vendedor, cierre de caja por turno, y bot de Telegram para aprobaciones y reportes.
>
> **Stack:** Laravel 12 · React 19 · Inertia v2 (SPA) · MySQL 8.4 · TailwindCSS 4 · TypeScript

## Visión General

Sistema de gestión de inventario, punto de venta y logística multi-almacén diseñado para negocios que operan con **múltiples monedas** (USD, CUP, MLC) y varios puntos de venta simultáneos. Incluye control de comisiones por vendedor, gestión de mensajería, cierre de caja por turno y un bot de Telegram integrado para flujos de aprobación y reportes.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Laravel 12, PHP 8.2 |
| Frontend | React 19, TypeScript, Inertia.js v2, Vite 7 |
| UI | TailwindCSS 4, Radix UI, shadcn/ui, Lucide React |
| Tablas | @tanstack/react-table v8 |
| Gráficos | Recharts |
| Animaciones | Framer Motion, GSAP |
| PDFs | jsPDF + jspdf-autotable (client-side), barryvdh/laravel-dompdf |
| Excel | maatwebsite/excel |
| Códigos de barras | milon/barcode |
| Roles | spatie/laravel-permission |
| Auth | Laravel Sanctum |
| Bot | irazasyed/telegram-bot-sdk v3 |
| Ziggy | tightenco/ziggy (rutas Laravel en JS) |

---

## Roles de Usuario

| Rol | Permisos |
|---|---|
| `admin` | Acceso total. Puede modificar costos, saldos de cuentas, aprobar ventas especiales, eliminar registros |
| `moderador` | Similar a admin pero sin operaciones destructivas. Ve todos los datos |
| `vendedor` | Limitado a sus almacenes y cuentas asignadas. No ve precios de costo ni datos sensibles |

Los controladores filtran datos por rol mediante helpers del modelo: `$user->isAdmin()`, `$user->isModerador()`, o inline con `$user->role === 'admin'`.

---

## Entidades del Dominio

### Almacén (`almacens`)
Tipos: `almacen`, `punto_venta`, `transportacion`.
- Tiene responsable (nombre, apellido, carnet, teléfono).
- `mensajero_cuenta_id`: cuenta destino para pagos de mensajería.
- Relación M:M con Productos a través de `almacen_producto` (guarda `cantidad` y `cantidad_en_transito`).
- Usuarios acceden a sus almacenes asignados via `user_almacens`.

### Producto (`productos`)
- Atributos: nombre, marca, modelo, capacidad, categoria, `precio_compra_producto` (costo USD).
- Tiene múltiples **códigos de barras** (`producto_codigos`): cada código tiene cantidad propia y flag `es_default`.
- Stock real: suma de `almacen_producto.cantidad` a través de todos los almacenes.
- Imágenes en `public/productos/`. Default: `productos/producto-default.png`.
- Historial de cambios de costo en `historial_precio_costos` (requiere contraseña de admin).
- Importación/exportación masiva vía Excel.

### Precio por Vendedor (`producto_vendedors`)
Una fila única por par `(producto_id, almacen_id)`:
- `precio_venta`: precio base del producto en ese almacén.
- `comision`: margen del vendedor incluido en el precio.
- **Precio mínimo vendible** = `precio_venta - comision`.
- No se puede crear una venta sin que todos los productos del almacén tengan precio asignado.
- Se edita desde `/disponibles` (`Productos/Vendor/Index.tsx`) de dos formas: una fila a la vez (todos los roles, scopeado a los almacenes del usuario) o **masivo, admin-only** — ver sección dedicada abajo.

### Compra (`compras`)
Tipos de pago:
- `deuda_proveedor`: genera deuda con proveedor o acumula deuda del cliente fuente.
- `pago_cash`: descuenta de cuentas USD permanentes/temporales o saldo de clientes.

Fuente: puede ser un `Proveedor` o un `Cliente físico` (reseller).
Al registrar compra: crea/actualiza `Producto`, genera `ProductoCodigo`, incrementa `almacen_producto.cantidad`.
Pagos múltiples soportados en `compra_pago`.
- `user_id` (nullable, agregado 2026-08-06): quién registró la compra. Histórico queda en `null` — se captura desde `CompraController::store()` de ahora en adelante. Se agregó para poder acotar Compras por usuario en el reporte Rastreo de Operaciones (ver más abajo), no había forma de hacerlo antes.
- **`compra_producto`** (pivot con `productos`): desde el 2026-08-10 tiene `id` autoincremental como clave primaria (antes era compuesta `(compra_id, producto_id)`). El mismo producto puede aparecer en **varias líneas** de una misma compra (p. ej. mandado a dos almacenes distintos, o distinto color) — `CompraController::store()` ya no las fusiona ni promedia el precio entre ellas, cada línea del carrito queda como su propia fila. `TransaccionController` (distribución de costos y de gastos de transportación) y los reportes que cuentan "veces comprado" ya están adaptados para no asumir una fila por producto por compra.

#### Casillero de Compras — la nueva forma de las compras (Fases 1 y 2, 2026-10-20)
Detalle y plan completo en `docs/plan-casillero-de-compras.md`. La mercancía (muchas veces comprada en Amazon) espera en Panamá, sale en **contenedores** hacia el Mariel y **entra al stock una sola vez, al llegar al almacén**. Solo el administrador lo usa.
- **`compras`:** `flujo` (`clasico` por defecto o `casillero`), `etapa` (`casillero` mientras le quede alguna unidad sin contenedor, `contenedor` cuando todas están asignadas) y `llegada_panama_at`. **No se tocó el enum `estado`:** una compra del casillero es `pendiente` hasta que entre al stock (Fase 4), así Distribución de Costos y los reportes la tratan como sin stock. `aprobar()` y `actualizar()` la rechazan; `anular()` la rechaza con cargos activos o con unidades en un contenedor. Sus líneas llevan `almacen_id` nulo (el almacén se elige al llegar).
- **`casillero_cargos`** (+ pivote `casillero_cargo_compra`): cargo a mano (estadía en Panamá, transporte marítimo…) con `monto`, `moneda`, `tasa_cambio`, `monto_usd`, `cuenta_id`, `movimiento_financiero_id` y `estado` (activo/anulado). Cuelga de compras (pivote) o de un contenedor (`contenedor_id`). Se paga en el momento con un Gasto desde una cuenta USD con saldo suficiente y se anula devolviendo el dinero. **Regla de diseño: un cargo es una suma que se reparte entre los productos al entrar al stock (Fase 4), solo entre las unidades que llegaron** (propuesta: por valor, fórmula de Distribución de Costos).
- **`contenedores`** (`nombre`, `notas`, `fecha_salida`, `estado` abierto/cancelado) y **`contenedor_lineas`** (unidades de cada línea de `compra_producto` por contenedor; una fila por contenedor y línea). `asignarUnidades` reemplaza la cantidad; cancelar devuelve las unidades al casillero y no se puede con cargos activos.
- **Idea, sin construir:** «Incidencias» sobre unidades de una línea (cancelación, no llega, equivocado o dañado, devolución, faltante en el contenedor) con resolución por reembolso, devolución, reposición o pérdida; propuesta como Fase 2.5 y reutilizada por la Fase 3 para los faltantes.

### Venta (`ventas`)

**Flujo de estados:**
```
solicitud_especial  (si es venta especial)
pendiente           → stock descontado inmediatamente al crear
completada          → saldos de cuentas actualizados, ganancia calculada
cancelada           → stock devuelto
```

**Campos financieros clave:**
- `total`: en moneda principal de la venta.
- `total_ganancia`: suma de (precio_venta - costo) × cantidad.
- `total_comision`: comisión total del vendedor en USD.
- `ganancia_perdida_cambiaria`: diferencia entre CUP cobrado real vs a tasa oficial.
- `ganancia_real_total`: total_ganancia + ganancia_perdida_cambiaria.
- `total_esperado_usd`: costo + ganancia objetivo.

**Pagos (`pago_ventas`):**
- Destino: `cuenta_id` (afecta saldo de cuenta) **O** `cliente_id` (acumula deuda del cliente).
- Tipos: `efectivo`, `transferencia`.
- Cada pago tiene `moneda_id`, `monto`, `tasa_cambio_aplicada`, `monto_equivalente` (en moneda principal).

**Modos especiales:**
- **Venta Especial**: precio por debajo del mínimo. Requiere aprobación de admin. Notifica via Telegram con botones inline (Aprobar/Rechazar).
- **Venta Gestor**: venta a través de un intermediario. Descuenta `gestor_monto` de `gestor_cuenta_id` al aprobar.
- **Mensajero**: cargo de envío. Tipo `propio` (paga de cuenta interna) o `externo` (descuenta de cuenta). El mensajero es pass-through — no se incluye en ganancia cambiaria.

### Cuenta (`cuentas`)
- Tipos de instrumento: `tarjeta`, `efectivo`, `otro`.
- Categorías: `permanentes` (unificado — `temporales` migrado a `permanentes` el 2026-07-28).
- `tipo_titular`: `externa` o `personal` (nuevo campo 2026-07-28).
- Moneda vinculada via `moneda_id`.
- Vendedores solo ven sus cuentas asignadas (tabla `user_cuentas`).
- Modificar saldo requiere rol admin + contraseña de seguridad hardcoded (`glorietashop`).
- **Index rediseñado** (`resources/js/pages/Cuentas/Index.tsx`):
  - 3 filas de widgets interactivos: KPIs (total eq., activas/inactivas), desglose por tipo con barras de porcentaje por cantidad de cuentas, desglose por moneda.
  - Todos los widgets son clickeables y filtran la tabla al hacer clic.
  - Filtro combinado: tipo + moneda + estado + titular + deudas (por saldo negativo) + búsqueda.
  - Resumen de filtros activos con badges removibles y línea de totales por moneda.
  - Paginación con ventana de páginas.
  - **Row 3** (Desglose por Moneda): solo muestra cuentas **permanentes** (nuevo `por_moneda_perm` en backend).
  - Formato moneda: `": "` entre indicador y valor (ej. `$: 305.834,63`, `CUP: 5.444.544,38`).
- **Backend** (`CuentaController@index`): precalcula `$resumen` (por_tipo, por_moneda, por_moneda_perm, por_estado, total_saldo) y lo pasa a la vista Inertia.
- **Deudas**: detectadas desde `saldo_cuenta < 0` (no desde `tipo_cuenta = 'deudas'`).

### Moneda (`monedas`)
- `codigo_moneda`: ej. `USD`, `CUP`, `MLC`.
- `tasa_cambio`: tasa de conversión relativa a USD (divisor).
- `principal`: flag — la moneda principal es la base de conversión.
- Estado: activa/inactiva.
- Historial de cambios en `historial_tasa_cambios` (registra impacto financiero en todas las cuentas).

### Cliente (`clientes`)
Tipos: `fisico`, `asociado`.
- `deuda_pago_cliente`: saldo acumulado pendiente de pago.
- Pueden ser fuente de pagos en compras (descuenta su deuda).
- Pueden recibir pagos de ventas (acumula deuda en lugar de ir a cuenta).
- **Index rediseñado** (`resources/js/pages/Clientes/Index.tsx`):
  - Row 1: 4 KPIs clickeables (Total Clientes → limpia filtros, Fondo Total → filtra fondo, Deuda Total → filtra deuda, Balance Neto → informativo).
  - Row 2: 3 barras de estado (Con Fondo / En Deuda / Neutro) con badge, monto, barra de progreso y % sobre total. Toggle al clickear.
  - Paginación con ventana (delta=2 + ellipsis).
  - Filtros combinados: `filtroEstado` + `filtroTipo` + `busqueda`, badge activo + botón "Limpiar filtro".
  - Datos precalculados en backend via `$resumen` (`ClienteController@index`).
- **Backend** (`ClienteController@index`): precalcula `$resumen` con `total_clientes`, `total_fondo`, `total_deuda`, `balance_neto`, `por_estado`.

### Movimiento de Stock (`movimientos`)
Traslados entre almacenes.

**Estados:**
```
pendiente_confirmacion → en_transito → recibido_completo | recibido_parcial | rechazado | cancelado
```
- Al **enviar**: incrementa `almacen_producto.cantidad_en_transito` en origen.
- Al **recibir**: decrementa `cantidad` y `cantidad_en_transito` en origen, incrementa en destino.
- Soporta diferencias (recibido_parcial): excedentes/faltantes se reconcilian en el stock de origen.
- Auditoría completa en `movimiento_seguimientos`.

### Cierre de Caja (`cierre_cajas`)

El backend es la **fuente de verdad** (los datos del frontend se ignoran para los cálculos).

Calcula desde el último cierre del usuario hasta ahora:
- Pagos de ventas separados por destino: **a cuentas** (afecta saldo) vs **a clientes** (deuda, no afecta saldo).
- Movimientos financieros: gastos (−), ingresos extra (+), transferencias salientes (−), entrantes (+).
- Comisiones a gestores (descontadas del saldo).
- Mensajero: informativo, ya descontado del saldo esperado.
- Ventas especiales completadas, ventas anuladas.
- `saldo_esperado` = ventas_a_cuentas + ingresos - gastos - transferencias - mensajero.
- Snapshot de saldos de cuentas y deudas de clientes al momento del cierre.
- Comparativa con cierre anterior.

### Movimiento Financiero (`movimientos_financieros`)
Tipos (tabla `tipos_movimiento_financiero`):
- ID 1 → Gasto
- ID 2 → Ingreso
- ID 3 → Transferencia (bidireccional, soporta conversión de moneda)

---

## Lógica de Comisión del Vendedor

```
precioBase = producto_vendedors.precio_venta
comisionBase = producto_vendedors.comision
precioMinimo = precioBase - comisionBase

Si precio_venta >= precioBase:
    comisionUnitaria = comisionBase + (precio_venta - precioBase)  // markup extra va al vendedor

Si precio_venta < precioBase (solo en Venta Especial):
    descuento = precioBase - precio_venta
    comisionUnitaria = max(0, comisionBase - descuento)  // descuento absorbe comisión
```

---

## Lógica de Ganancia Cambiaria

Aplica cuando la venta se cobra en CUP pero los productos están valuados en USD:

```
monto_esperado_oficial = total_usd × tasa_oficial_cup
monto_real_cobrado_cup = suma pagos en CUP (sin mensajero)
ganancia_cambiaria = monto_real_cobrado_cup - monto_esperado_oficial
```

Positivo = cliente pagó a tasa mayor que oficial (ganancia). Negativo = pérdida cambiaria.

---

## Bot de Telegram

Webhook autenticado por `X-Telegram-Bot-Api-Secret-Token`.

> **2026-10-20:** el "hoy" de `/reporte` y `/estadocierres`, los filtros hoy/3d/5d/mes de cierres y movimientos, las horas que muestra el bot y el sello «🕐» de las notificaciones (Cierre de Caja, Remesa, Movimiento Financiero, Cierres Pendientes, Venta Devuelta, Venta Especial) y de la leyenda del backup usan la hora de Cuba (`FechaNegocio`), no UTC.

**Comandos:**
- `/vincular CODIGO`: vincula cuenta de usuario con chat de Telegram.
- `/start`: saludo + estado.
- `/reporte`: resumen del día.
- `/cierres`: últimos cierres.
- `/ayuda`: listado de comandos.

**Notificaciones automáticas:**
- `VentaCreadaNotification`: al crear venta (a admins/moderadores).
- `VentaEspecialSolicitudNotification`: cuando se solicita venta especial (con botones inline Aprobar/Rechazar).
- `VentaEspecialDecisionNotification`: al vendedor cuando admin decide.
- `MovimientoStockNotification`: al crear/enviar/recibir movimientos.
- `CierreCajaNotification`: al realizar cierre de caja.
- `CambioPrecioVendedorNotification`: cuando cambia precio de vendedor.
- `MovimientoFinancieroNotification`: en movimientos financieros.

**Avisos push del navegador (Web Push, 2026-10-15):** llegan con la pestaña cerrada. Paquete `laravel-notification-channels/webpush` 13.x (claves VAPID en `.env`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT`; tabla `push_subscriptions`, una fila por dispositivo). El usuario los activa con un diálogo animado (`components/Notifications/activar-avisos-dialog.tsx`, montado en `app-sidebar-layout.tsx`) que registra `public/sw.js` y manda la suscripción a `push/suscripciones`. **Solo van por push los avisos que exigen acción** (el resto queda en la campana, que consulta cada 30 s); la regla de destinatarios vive en el `via()` de cada notificación y el trait `App\Notifications\Concerns\EnviaAvisoPush` descarta a quien hizo la acción:

| Notificación | Push a |
|---|---|
| `VentaEspecialSolicitudNotification` | admin; moderador solo si `tipo_venta_especial = 'descuento'` |
| `VentaEspecialDecisionNotification` | el vendedor que la pidió |
| `TransferenciaPendienteNotification` | solo el aviso del envío recién registrado (`requiereAccion: true`) |
| `VentaDevueltaNotification` | admin y moderador |
| `CierreCajaNotification` | admin y moderador |
| `CierresPendientesNotification` | solo admin |
| `ProrrateoRequeridoNotification` | admin y moderador |
| `MovimientoStockNotification` | `en_transito`: almacén destino + admin/moderador; `recibido_parcial` y `rechazado`: almacén origen + admin/moderador; creado, editado y recibido completo, ninguno |

Sin push, solo campana: `VentaCreadaNotification`, `MovimientoFinancieroNotification`, `CambioPrecioVendedorNotification` y `RemesaNotification`. Reglas de volumen: ver nota del 2026-10-15 en `ESTADO_DESARROLLO.md`.

**Cierre de los push (2026-10-20):** (1) el usuario puede apagar y encender los avisos de ese dispositivo con el interruptor "Avisos en este dispositivo" del panel de la campana (`components/Notifications/avisos-push-switch.tsx`); apagar guarda `avisos-push-desactivados` en `localStorage` para que `use-push-notifications.ts` no se vuelva a suscribir solo al recargar, y `activar()` devuelve `'activado' | 'bloqueado' | 'error'` (si el navegador rechaza el registro — `AbortError`, p. ej. Brave con el push de Google desactivado — el diálogo muestra el paso `error`). (2) `CambioPrecioVendedorNotification::notificarAgrupado()` agrupa en un solo aviso sin leer (con contador `cantidad`) los cambios de precio del mismo vendedor y almacén de la última hora; un aviso ya leído no se reabre. (3) `VAPID_SUBJECT` es obligatorio para Safari/iPhone y se pone junto a las claves; en el servidor, `php artisan webpush:vapid` genera las claves y el `.env` debe terminar en salto de línea antes de añadirle algo con `>>`.

---

## API Pública y Ecommerce — RETIRADOS (2026-10-15)

El cliente decidió no usar el ecommerce. Se eliminaron el prefijo `/api/tienda/*` (catálogo, almacenes, Swagger), `EcommerceController`, `Api/CatalogoPublicoController`, `components/Ecommerce/` y `pages/Ecommerce/`. No hay API pública sin autenticación; la única entrada sin sesión es el webhook de Telegram (`routes/api.php`). Las columnas de BD que alimentaban ese catálogo (p. ej. `ciudad_almacen`, `activo` y `descripcion_producto` de productos) **siguen en las tablas**: no se tocaron migraciones.

---

## Estructura de Controladores

| Controlador | Responsabilidad Principal |
|---|---|
| `AdminController` | Dashboard, tasas de cambio (USD y MLC), historial de comparaciones mensuales, estadísticas costo/precio |
| `VentaController` | POS completo: crear venta, aprobar, anular, listado, reporte diario, datos JSON para el frontend |
| `CompraController` | Registro de compras, gestión inline de proveedores/clientes/almacenes/categorías; `store()` acepta `flujo=casillero` (solo admin) |
| `CasilleroController` | Casillero de Compras (solo admin): listado de lo que espera en Panamá, cargos a mano, anular cargo y llegada a Panamá (`casillero.*`) |
| `ContenedorController` | Contenedores del casillero (solo admin): crear, editar, asignar unidades, cargos y cancelar (`casillero.contenedores.*`) |
| `ProductoController` | CRUD de productos, búsqueda, transferencia de códigos, import/export Excel, detección/fusión de duplicados |
| `ImportacionBorradorController` | Importación de Excel en dos pasos: subir → borrador editable (hoja `Productos/Importaciones/Revisar.tsx`) → confirmar; admin/moderador, con bloqueo de fila al confirmar |
| `ImportacionProductoController` | Historial de importaciones (listado, detalle por fila) y deshacer una importación completa (solo admin, motivo + contraseña) |
| `LoteStockController` | Edición del código de un lote (`actualizarCodigo`) |
| `TurnoVendedorController` | Captura del turno ("Atendido por") de moderador/vendedor |
| `RemesaController` | Remesas / operaciones múltiples (admin/moderador) |
| `AlmacenController` | CRUD de almacenes, vista de inventario por almacén |
| `MovimientosController` | Traslados de stock: crear, aprobar, enviar, recibir, rechazar, seguimiento, discrepancias |
| `CuentaController` | CRUD de cuentas, control de saldo con contraseña, resumen con KPIs |
| `CierreCajaController` | Pre-cierre (cálculos), store (persistencia), show (detalle histórico), aprobar cierre |
| `ReporteController` | 14 de los 15 reportes: ventas, compras, inventario, ganancias, historial, finanzas. También datos dashboard (chart, financial-states, usuarios, monedas). Extracción incremental en curso hacia `App\Http\Controllers\Reportes\*` conforme se trabaja cada reporte |
| `Reportes\RastreoOperacionesController` | Reporte "Rastreo de Operaciones" (el 15º), extraído de `ReporteController` — ver sección dedicada arriba |
| `TransaccionController` | Movimientos financieros, distribución de costos de compra, gastos de transportación |
| `GastoController` | Registro de gastos financieros |
| `IngresoController` | Registro de ingresos financieros |
| `TransferenciaController` | Transferencias entre cuentas (incluye conversión de moneda) |
| `TelegramWebhookController` | Bot: comandos texto + callbacks inline de aprobación |
| `ProductoVendedorController` | Asignación/edición de precios y comisiones por almacén (individual y masiva admin-only), export/import Excel, precios base |
| `UserController` | Gestión de usuarios (CRUD) |
| `UserAlmacenController` | Asignación de usuarios a almacenes |
| `LogisticaController` | Dashboard de logística con KPIs y resúmenes (resource completo) |
| `MonedaController` | CRUD de monedas, actualización de tasas, cambiar estado, establecer principal |
| `MovimientosPendienteController` | Movimientos de stock pendientes |
| `NotificationController` | Lectura, historial y marcado de notificaciones |
| `DestinatarioVentaController` | Destinatarios/receptores de ventas |
| `ClienteController` | CRUD de clientes y gestión de deuda, resumen con KPIs |
| `ProveedorController` | CRUD de proveedores |
| `CategoriaController` | CRUD de categorías |
| `Settings/ProfileController` | Perfil de usuario, telegram token, desconexión telegram |
| `Settings/PasswordController` | Cambio de contraseña |

---

## Middlewares Relevantes

| Middleware | Uso |
|---|---|
| `auth` + `verified` | Protege todas las rutas del panel (dashboard, CRUDs, acciones) |
| `check.cuenta.permission` | Verifica que el usuario tiene acceso a la cuenta (en show/edit/update/destroy de cuentas) |
| `admin` (`EnsureUserIsAdmin`) | Permite admin **y** moderador. Aplicado a todo el módulo Reportes (`routes/acciones/reportes.php`) |
| `admin.only` (`EnsureUserIsAdminOnly`) | Exige estrictamente `admin`, ni moderador ni vendedor pasan. Aplicado a todas las rutas de Compras (`routes/acciones/compras.php` + duplicado en `routes/shop/puntoventa.php`) y a `PUT /disponibles/bulk-actualizar` (update masivo de precios) |
| `HandleInertiaRequests` | Comparte datos globales con Inertia (usuario, permisos, tasas) |
| `HandleAppearance` | Maneja preferencia de tema (claro/oscuro) |
| `throttle:60,1` | Rate limiting para API pública (60 req/min) |

> **Nota (2026-09-24):** los cuatro middlewares de rol (`admin`, `admin.only`, `moderator`, `vendor`) ahora redirigen al `dashboard` con aviso de acceso denegado (antes tres de ellos daban 500 por `route('vendedor')`); `moderator`/`vendor` siguen sin aplicarse a rutas, por decisión del cliente.
>
> **Nota (corregida 2026-08-13, estaba desactualizada):** `EnsureUserIsModerator`, `EnsureUserIsVendor` y `CheckAlmacenPermission` existen como clases pero no están aplicadas a rutas — la verificación para esos casos sigue siendo inline en los controladores. `EnsureUserIsAdmin`/`EnsureUserIsAdminOnly` sí están aplicados a rutas reales desde Compras/Reportes/Precios de Venta (ver fila arriba); esta nota decía lo contrario para las cuatro clases, ya no es cierto desde que se cerró el control de acceso de Compras (2026-08-11).

---

## Patrones y Convenciones

- **Inertia SSR**: Vistas PHP retornan `Inertia::render('Módulo/Vista', [...datos])`. El frontend recibe props tipadas.
- **Ziggy**: Rutas Laravel disponibles en JS como `route('nombre.ruta')`.
- **Transacciones DB**: todas las operaciones críticas (venta, compra, movimiento, cierre) usan `DB::beginTransaction()` con rollback en catch.
- **Stock inmediato**: al crear una venta (incluso pendiente), el stock se descuenta de inmediato para reservarlo.
- **Datos sensibles**: `precio_compra_producto` y `costo_unitario` solo se exponen a `admin` y `moderador` en respuestas JSON.
- **Nombres en español**: modelos, columnas, rutas y vistas siguen nomenclatura en español.
- **Rutas modularizadas**: `routes/web.php` incluye archivos de subdirectorio (`crud/`, `acciones/`, `shop/`, `empleados/`).
- **Zona horaria de negocio (2026-10-20)**: la BD y `config('app.timezone')` están en UTC; el día que el usuario elige en un filtro, el "hoy" y las horas que se muestran son los de Cuba (`config('app.business_timezone')`, `America/Havana`, sobrescribible con `APP_BUSINESS_TIMEZONE`). Usar `App\Services\FechaNegocio` para columnas **timestamp**: `inicioDelDiaUtc()` / `finDelDiaUtc()` / `rangoDelDiaUtc()` en lugar de `whereDate`, `ahora()` en lugar de `now()` para "hoy" y para mostrar horas, `diaDe()` para agrupar por día. Las columnas `date` (p. ej. `compras.fecha_compra`) ya son el día del negocio y siguen con `whereDate`. **No agrupar con `DATE(created_at)` en SQL** (agrupa por día UTC): sumar por venta y agrupar en PHP con `diaDe()`. Pendiente: `DashboardStatsService::applyPeriodFilter()` y los demás `DATE()`.
- **Tipos del frontend (2026-10-20, noche)**: `npm run types` (`tsc --noEmit`) funciona y termina con 0 errores; correrlo al tocar `.tsx`. Los props compartidos de Inertia están declarados una vez en `resources/js/types/global.d.ts` (`sharedPageProps: SharedData`), por lo que `usePage().props.auth.user` ya viene tipado: no hace falta castear a `any`. Los errores generales del servidor en un `useForm` (`error`, `message`, campos no declarados) se leen con `errorDe(form.errors, 'clave')` de `resources/js/lib/errores.ts`. No volver a crear un symlink `resources/js/Components` (rompió `tsc` durante meses).
- **Pantallas de auth (2026-10-20, noche)**: las 6 páginas de `pages/auth/*` pasan por `layouts/auth-layout.tsx` → `layouts/auth/auth-card-layout.tsx`, que pone fondo con imagen, **barra superior** (logo, botón «Documentación» —desactivado mientras `DOCUMENTACION_URL` sea `null`— y el selector de tema `AppearanceToggleDropdown`), el Card con la mascota «bleed» y el borde animado `spotlight-card` (`data-estado="indigo"`), y un **footer** con la cinta de logos `components/animated/logo-loop.tsx` (CSS puro; lista en `lib/logos-footer.ts`; miniaturas en `public/projects/footer/` con nombre `{carpeta}__{archivo}.webp`, generadas a 96 px de alto desde `card_cubans`, `card_interacionales`, `metodos_pago`, `efectivo` y `monedas`) y los derechos. Si se agrega un banco o vía de pago nuevo, hay que sumar su miniatura y una línea en `logos-footer.ts`.

---

## Reportes — Rastreo de Operaciones (`Reportes/Report/RastreoOperaciones.tsx`)

> **2026-10-20:** la subconsulta de ventas lleva `distinct()` (`destinatarios_venta` no tiene `unique` en `venta_id`), el orden es `fecha DESC, tipo, id DESC` (las páginas ya no repiten ni omiten filas con el mismo instante) y el filtro de fecha usa el día de Cuba (`FechaNegocio::rangoDelDiaUtc()`) en las columnas timestamp; `compras.fecha_compra` (columna `date`) sigue con `whereDate`.

El reporte prioritario del cliente dentro del módulo Reportes (los otros 14 reportes viven en `ReporteController`; este tiene su propio controlador: `app/Http/Controllers/Reportes/RastreoOperacionesController.php`). Unifica 5 tipos de operación en una sola tabla tipo "partida doble":

- **Venta, Gasto, Ingreso, Transferencia** (`movimientos_financieros` + `ventas`/`pago_ventas`) y **Compra** (`compras`/`compra_pago`, agregada 2026-08-06).
- Columnas: `Referencia | Cuenta Envía | Monto | Cuenta que Recibe | Monto | Tasa de la Operación | Detalles` — `Tipo` fusionado como badge dentro de `Referencia`. En Venta y Compra, cuando hay varios pagos, cada columna de cuenta/monto/tasa muestra un `Badge` por pago, alineados por índice y coloreados con `colorPago()` para identificar visualmente qué monto/tasa corresponde a qué cuenta.
- **Compra es admin/moderador-only** dentro de este reporte: dato de costo, y no hay forma de acotar "solo mis compras" para vendedor en filas históricas (`compras.user_id` es nullable, capturado solo desde 2026-08-06 en adelante).
- **Saldo anterior/posterior (2026-09-01):** cada fila expandida de Venta/Compra muestra ahora `movimientos_saldo` — una tarjeta `EntidadMovimientoCard` (mismo componente que ya usaban Gasto/Ingreso/Transferencia) por cada pata tocada: en Venta, cada pago + comisión PV + gestor + mensajero; en Compra, el receptor (proveedor/cliente) + cada pago. El dato vive en `pago_ventas`/`ventas`/`compra_pago`/`compras` (columnas `saldo_anterior`/`saldo_posterior`, nulas en operaciones de antes de esta fecha). Una Venta anulada también muestra el motivo/detalle de anulación en una tarjeta dedicada, sin pisar el snapshot de saldo de la aprobación original. El mismo dato se replicó además en el historial propio de `Cuentas/Show.tsx`, `Clientes/Show.tsx` y `Proveedores/Show.tsx` (Fase 4, misma iniciativa). Ver `docs/arreglos-pendientes/resumen-cambios-2026-09-01.md` y memoria `project_saldo_anterior_posterior_operaciones`.
- Filtros: fecha, tipo, usuario, búsqueda de texto libre, búsqueda exacta por número de referencia (`34` encuentra `Venta #34`/`Gasto #34` sin saber el tipo), y combobox multiselect con chips (Cliente/Cuenta, más Producto y Almacén) — cada uno aplica solo a los tipos donde el dato tiene sentido (p. ej. Cliente nunca aplica a un Ajuste). **Desde 2026-10-21 no hay filtro «Proveedor»:** el historial que apuntaba a proveedores pasó a los clientes del mismo nombre (migración `pasar_historial_de_proveedores_a_clientes`). En la tabla, un Gasto/Ingreso/Transferencia anulado muestra «Anulada» en Detalles. Para un vendedor, de una cuenta que no es de acceso `completo` el detalle muestra lo que la operación generó (`monto`) y no el saldo anterior/posterior (`DetalleOperacionService::paraUsuario()`).
- Costo/margen y widgets KPI gateados por rol; vendedor scoped a sus propias operaciones.
- **Pendiente conocido:** el botón "Exportar PDF" (`exportToPDF` en el mismo `.tsx`) sigue generando el set de columnas viejo (`Fecha, Tipo, Referencia, Usuario, Monto, Detalles`), desincronizado de la tabla en pantalla desde que esta se rediseñó.
- Ver `docs/arreglos-pendientes/rastreo-operaciones-rediseno-2026-08-01.md` para el plan de fases completo y `docs/arreglos-pendientes/reportes-arreglos-2026-08-01.md` para el resto del módulo Reportes (14 reportes aún sin trabajar, ordenados por el cliente uno a uno). **Prioridad baja desde 2026-09-05** — el cliente confirmó que estos se trabajan solo bajo petición explícita, no proactivamente.

---

## Precios de Venta — Modal Masivo por Almacén (`Productos/Vendor/Index.tsx`)

Vista `/disponibles`, donde se asigna `precio_venta`/`comision` por producto+almacén. Dos flujos coexisten:

- **Individual (todos los roles):** elegir almacén → tabla de ese almacén → click en la fila → dialog "Actualizar Precio" para ese producto+almacén. Vendedor scopeado a `$user->almacenes`.
- **Masivo, admin-only, agregado 2026-08-13:** botón "Buscar Producto" abre un modal de dos paneles — buscar producto (autocompletado client-side sobre los datos ya cargados, sin endpoint nuevo), ver en qué almacenes está disponible y a qué precio, marcar varios con checkbox, aplicar el mismo precio/comisión a todos a la vez. `PUT /disponibles/bulk-actualizar` (`ProductoVendedorController::updateBulk()`), transacción única, un `PrecioHistorial` por almacén donde el precio realmente cambió. **Exige reconfirmar la contraseña** (`Hash::check`, mismo patrón que `ProductoController::update()` para cambios de costo, pero acá siempre, no solo si cambia el precio) antes de aplicar.
- Tabla del almacén seleccionado: los widgets "Con Precio"/"Sin Precio" son ahora filtro-toggle (click para filtrar, click de nuevo para quitar), combinable con la búsqueda de texto.
- **Bug real encontrado y corregido:** las imágenes de producto en este proyecto viven en `public/productos/` (servidas vía `Producto::getImagenUrlAttribute()` → `asset()`), no en `storage/app/public/productos/` — el tooltip de la tabla y el modal nuevo usaban `/storage/{imagen_producto}` (URL equivocada, 403). Corregido a `/{imagen_producto}` en los 3 lugares.
- **Hallazgo sin resolver, bloquea tests:** `producto_vendedors` tiene desfase de esquema MySQL/SQLite — la migración `2026_05_30_000001_refactor_producto_vendedors_unico_por_almacen.php` hace `if (driver !== 'mysql') return;`, nunca corrió en SQLite (el motor de los tests). Bloquea probar todo `ProductoVendedorController`, no solo lo nuevo. `tests/Feature/ProductoVendedorTest.php` ya tiene 9 tests escritos para `updateBulk()`, sin poder correr hasta que se agregue una migración nueva compatible con SQLite (mismo patrón create/copy/drop/rename ya usado en `2026_08_10_191405_change_compra_producto_primary_key.php`).
- Ver `docs/arreglos-pendientes/precios-venta-modal-busqueda-producto-2026-08-13.md` para el detalle completo.

---

## Página de Logística (`Logistica/Index.tsx`)

La página de Logística es un **dashboard informativo** tipo KPI dashboard con cards de resumen:

### Cards superiores — Capitales Financieros (4 widgets):

> **Desde 2026-10-14 el capital NO suma `proveedors`** (decisión del cliente: los proveedores se retiran poco a poco). `getResumenProveedores()`, `countProveedores()`, `totalProveedores` y `resumenProveedores` ya no existen, y la card "Resumen de Proveedores" de abajo fue eliminada. Lo que queda escrito sobre proveedores en esta sección es histórico.

1. **Capital Financiero** (verde, `Landmark` icon) — Suma de: `total_saldo` (cuentas eq. USD) + `balance_neto` (clientes) + `total_importe_global` (productos) + dinero en tránsito *(antes sumaba también `balance_neto` de proveedores, hasta 2026-10-14)*
2. **Capital USD** (ámbar, `DollarSign` icon) — Suma de: `balance_neto` (clientes) + `total_importe_global` (productos) + `por_tipo['temporales']` + `por_moneda_perm['USD'].equivalente`
3. **Capital CUP** (índigo, `Wallet` icon) — `por_moneda_perm['CUP'].original` (saldo original en CUP)
4. **Capital EUR** (azul, `Euro` icon) — `por_moneda_perm['EUR'].original` (saldo original en EUR)

Cada card tiene: `border-l-4`, `shadow-sm hover:shadow-md`, icono en contenedor redondeado en esquina superior derecha.

### Cards de resumen (solo visibles para admin/moderador):

1. **Resumen de Cuentas** — 4 Rows:
   - **Row 1** (4 KPIs): Total Equivalente (en moneda principal), Total Cuentas, Activas, Inactivas
   - **Row 2** (3 barras): Permanentes/Temporales (saldo equivalente + % del total + barra), Con Deuda (cuentas con saldo < 0, saldo absoluto)
   - **Row 3**: Desglose por Moneda (solo cuentas permanentes) con original + equivalente + cantidad
   - **Row 4**: Desglose por Tipo+Moneda (Efectivo/Tarjeta × moneda)

2. **Resumen de Clientes** — 2 Rows:
   - **Row 1**: 4 KPIs (Total Clientes, Fondo Total, Deuda Total, Balance Neto)
   - **Row 2**: 3 barras (Con Fondo / En Deuda / Neutro) con cantidad, saldo, barra % y % sobre total

3. **Resumen de Proveedores** — 2 Rows (misma estructura que Clientes)

4. **Resumen de Productos** — 2 Rows:
   - **Row 1**: 4 KPIs (Total Productos, Total Unidades, Valor Total (costo), Stock Bajo cantidad + valor)
   - **Row 2**: 3 barras (Con Stock / Stock Bajo / Sin Stock) con cantidad productos + unidades + barra %

### Charts inferiores (visibles a todos los roles):
- PlaceholderPatterns al final

### Lo que NO tiene (eliminado):
- `CountingNumber`, `CursorFollow`/`CursorProvider` (animaciones innecesarias)
- `ComprasVentasCharts` (mock)
- 4 widgets placeholder: Productos, Proveedores, Clientes, Categorias (contenido genérico en inglés)
- Card "Resumen de Inventario a la Venta" (intentado y retirado)

---

## DashboardStatsService

| Método | Propósito | Retorna |
|---|---|---|
| `getLogisticaStats(User)` | Punto de entrada: orquesta todas las queries según rol | Array completo de KPIs + resúmenes |
| `getPeriodKpis(User, periodo)` | KPIs de ventas/compras por período (diario/semanal/mensual) | `ventas` + `compras` (admin) |
| `getResumenCuentas()` | Datos agregados de todas las cuentas | `total_saldo`, `por_tipo`, `por_moneda_perm`, `por_estado`, `por_tipo_moneda`, `cuentas_con_deuda`, `cuentas_deuda_saldo`, `moneda_principal` |
| `getResumenClientes()` | Datos agregados de clientes | `total_clientes`, `total_fondo`, `total_deuda`, `balance_neto`, `por_estado` |
| ~~`getResumenProveedores()`~~ | **Eliminado el 2026-10-14**: el capital ya no suma `proveedors` | — |
| `getResumenProductos()` | Datos agregados de productos | `total_productos`, `total_unidades`, `total_importe_global`, `productos_stock_bajo`, `valor_stock_bajo`, `por_stock` |
| `actualizarComparacionMensual(?userId)` | Comparación Mensual por moneda (más `INVENTARIO` y `CLIENTES`) contra el cierre del mes anterior | Por fila: `monto_actual`, `monto_anterior`, `diferencia`, `tasa_cambio` y **`tasa_cambio_anterior`** (tasa del cierre, desde el 2026-10-21) |
| `getGananciaAgenciaMes()` | Ganancia de **operaciones** del mes, antes de gastos e ingresos | `ganancia_ventas`, `ganancia_transferencias` (solo `completado`), `ganancia_remesas` (al vuelo: entra − sale − mensajero con la tasa del historial de cada momento) y `ganancia_neta_total` |
| `getCrecimientoCapitalMes()` | **Crecimiento del capital** del mes: capital de hoy − cierre del mes anterior guardado (cada moneda a su tasa de cierre; sin la fila `PROVEEDORES`) y el puente a la ganancia | `capital_actual`, `cierre_mes_anterior`, `crecimiento`, escalera (`margen_ventas`, `comision_ventas`, `cambiaria_y_ajustes_ventas`, `ganancia_ventas`, `ganancia_transferencias`, `ganancia_remesas`, `ganancia_operaciones`), `gastos`, `ingresos`, `otros_efectos` (null sin cierre) |
| `getResumenPorMonedaPerm()` | Saldo de cuentas permanentes agrupado por moneda | `[codigo => {original, equivalente, cantidad, simbolo}]` |
| `getMonedaPrincipal()` | Moneda principal del sistema (fallback primera activa, último `$/USD`) | `['simbolo', 'codigo']` |
| `getBalancesPorMoneda()` | Saldo de todas las monedas activas | `[{codigo, nombre, simbolo, saldo, tasa, principal}]` |
| Métodos privados auxiliares | `countCategorias()`, `countProductos()`, `sumUnidadesProductos()`, `calculateInversionTotal()`, `countCuentas()`, etc. | KPIs individuales |

### Detalles técnicos clave:
- `getResumenPorMonedaPerm()` usa **LEFT JOIN** directo a `monedas` y acumula por `codigo_moneda` (fix: CUP con id=2 y id=5 se sumaban, no sobrescribían)
- `cuentas_deuda_saldo`: suma absoluta del saldo equivalente de cuentas con `saldo_cuenta < 0`
- `STOCK_BAJO_THRESHOLD = 5`: constante de clase usada en `getResumenProductos()` para clasificar stock bajo
- `getMonedaPrincipal()`: método reutilizable que busca `principal=true` en monedas, fallback a primera activa, último fallback `['simbolo' => '$', 'codigo' => 'USD']`

---

## Servicios

| Servicio | Funciones Clave |
|---|---|
| `DashboardStatsService` | `getLogisticaStats()`, `getPeriodKpis()`, `getResumenCuentas()`, `getResumenClientes()`, `getResumenProveedores()`, `getResumenProductos()`, `getResumenPorMonedaPerm()`, `getMonedaPrincipal()`, y todos los KPIs auxiliares (counters, sums, etc.) |
| `NotificationService` | Determina destinatarios de notificaciones según contexto del movimiento/cierre |
| `LoteConsumoService` | Motor de consumo de `lotes_stock` compartido por Ventas y Movimientos: `consumir()` (FIFO o lote elegido), `devolver()`, `costoPromedio()` |
| `FusionLotesService` | Fusión de lotes con auditoría (`lote_fusions`) y acumulación de lotes idénticos al recibir un movimiento o al "Eliminar de la lista" un prorrateo (`acumularMovimientoEnLoteExistente`, `acumularCompraEnLoteExistente`, `acumularEnLoteIdentico`) |
| `FichasHermanasService` / `FusionProductosService` | Identidad de "fichas hermanas" (mismo producto físico en 2+ fichas) y su fusión sin borrar historial |
| `CodigoStockService` | Reparto por almacén de cada código de barras (`almacen_producto_codigos`): agregar, descontar, mover, reasignar, unir |
| `PrecioLoteService` | Precio base y comisión de una línea de venta según su lote de referencia (el elegido o el más antiguo): precio efectivo del lote, comisión propia → la del primer lote que la tenga → la del producto; lo usan el POS y `procesarVenta`/`editarVentaPendiente` |
| `ValorInventarioService` | Única fuente del valor de costo del inventario (costo real por lote); lo usan Productos, Dashboard/Logística, el reporte Valor del Inventario y el Excel |
| `ResumenAlmacenService` | Datos de la card "Resumen por Almacén" de Logística |
| `ImportacionProductosService` | Ejecuta una importación de Excel (un lote `IMP-…` por fila, una transacción por fila) y la deja en el historial; lo usan `ProductoController::import` y la confirmación de un borrador |
| `DetalleOperacionService` | Detalle de operaciones para Cuentas/Clientes/Proveedores y Rastreo de Operaciones (sin documentar por el cliente, ver `ESTADO_DESARROLLO.md`). **`paraUsuario(?User)` (2026-10-21)** devuelve una copia que, para un vendedor, quita el saldo anterior/posterior de las cuentas que no son `completo` para él y manda `monto` (lo que generó la operación); solo el Rastreo lo usa por ahora |
| `MetodosPagoService` | Métodos (efectivo / transferencia) y vías de pago (Zelle, EnZona, Transfermóvil…) que admite cada moneda: catálogo, configuración, resumen y guardado desde el CRUD de Monedas |
| `CatalogoTarjetasService` | Catálogo de bancos/tarjetas para las cuentas (`cuentas.tipo_banco`) |
| `CasilleroService` | Casillero de Compras: `registrarCargo` (sobre compras del casillero), `registrarCargoContenedor`, `anularCargo` y `marcarLlegadaPanama`; cada cargo se paga con un Gasto (tipo 1) desde una cuenta USD |
| `ContenedorService` | Contenedores: `crear`, `actualizar`, `asignarUnidades` (reemplaza la cantidad; recalcula la `etapa` de cada compra), `cancelar` y `unidadesEnCasillero` |
| `FechaNegocio` | Zona horaria de negocio (Cuba, 2026-10-20): convierte el día elegido en un filtro al rango UTC con que se guardan los timestamps (`inicioDelDiaUtc`, `finDelDiaUtc`, `rangoDelDiaUtc`, `inicioDeHaceDiasUtc`, `rangoDelMesActualUtc`) y expone `ahora()`, `aZonaDelNegocio()` y `diaDe()` |

---

## Branch Actual

**Actualización 2026-10-21, noche** (lo más reciente): **desplegado en producción** (commit `7cb62013`, 9 migraciones, claves VAPID, `/` y `/login` en 200). Tras `composer install --no-dev --no-scripts` hay que borrar `bootstrap/cache/{packages,services,events,config,routes-v7}.php` y correr `package:discover` antes de cualquier `artisan`, o el sitio da 500 por los paquetes de desarrollo cacheados; el `composer.lock` del servidor debe restaurarse (`git checkout -- composer.lock`) antes del `git pull`. Compra #31 aprobada (capital 1.295.018,52; 60,85 USD del Excel). Los movimientos #1692/#1693 solo son neutros junto con la transferencia #1672.

**Actualización 2026-10-21, tarde:** **conciliación del Excel con el sistema** (`docs/conciliacion-excel-vs-sistema-2026-10-21.md`: el capital cuadra al 0,24 %) y **Dashboard**: tarjeta nueva «Crecimiento del Capital del Mes» (`Dashboard/layout/CrecimientoCapitalMes.tsx`, `DashboardStatsService::getCrecimientoCapitalMes()`: capital de hoy − cierre del mes anterior guardado en `historial_comparacion_mensuals`, con escalera de ganancia de ventas, transferencias, remesas, gastos, ingresos y otros efectos); la tarjeta de ganancia pasa a «Ganancia de Ventas, Transferencias y Remesas» (`getGananciaAgenciaMes()` suma `ganancia_remesas`, calculada al vuelo con `historial_tasa_cambios`, y ya no cuenta transferencias anuladas; la clave `ganancia_ventas_transferencias` es ahora `ganancia_operaciones`); la Comparación Mensual trae `tasa_cambio_anterior` por fila y convierte el «Mes anterior» con la tasa de su cierre. Detalle en `docs/arreglos-pendientes/resumen-cambios-2026-10-21.md` (secciones 9 a 12).

**Actualización 2026-10-21:** **BD de desarrollo reemplazada** por el dump de producción `docs/backup/backup_2026-10-21_03-49.sql` (más las 8 migraciones que no trae) y **Rastreo de Operaciones, hallazgos 4, 5, 6 y 8**: «Anulada» en la fila de los movimientos anulados, migración `pasar_historial_de_proveedores_a_clientes` (61 movimientos y 5 remesas pasan al cliente del mismo nombre) con el filtro «Proveedor» quitado, `DetalleOperacionService::paraUsuario()` para los saldos del vendedor y banner con los tipos reales. El PDF del Rastreo (hallazgo 7) queda para después. Detalle en `docs/arreglos-pendientes/resumen-cambios-2026-10-21.md`.

**Actualización 2026-10-20, noche:** **`npm run types` arreglado** (se borró el symlink `resources/js/Components`; 110 errores corregidos, ver «Tipos del frontend» en Patrones y Convenciones) y **login rediseñado** (barra superior, footer con cinta de logos, borde animado, formulario corregido; ver «Pantallas de auth»). Detalle en `docs/arreglos-pendientes/resumen-cambios-2026-10-20.md` (secciones 10 y 11). El cliente dio por resuelto el login (visto y decidido) el 2026-10-21.

**Actualización 2026-10-20, tarde** (lo más reciente): **Casillero de Compras, Fases 1 y 2** — ver «Casillero de Compras» en la entidad Compra, `docs/plan-casillero-de-compras.md` y `docs/arreglos-pendientes/resumen-cambios-2026-10-20.md` (secciones 7 a 9). Suite completa 1.015 verdes. Siguen, con calma: incidencias (idea), llegada al almacén y entrada al stock con el reparto de cargos.

**Actualización 2026-10-20** (mañana): avisos push cerrados (interruptor en la campana, agrupado de avisos de cambio de precio, `VAPID_SUBJECT`); Rastreo con `distinct()` y orden `fecha, tipo, id`; **zona horaria de negocio** (`FechaNegocio`, ver "Patrones y Convenciones") aplicada a filtros por fecha, 2 gráficas, el "hoy" y las horas del bot de Telegram; Empleados, pasos 3 y 4 verificados como hechos (quedan 5–7); suite completa 977 verdes. Resumen: `docs/arreglos-pendientes/resumen-cambios-2026-10-20.md`.

**Actualización 2026-10-14** (lo más reciente; el detalle de 09-26 a 10-13 está en el historial de `docs/ESTADO_DESARROLLO.md`):

- **Proveedores se retiran poco a poco**: Compras usa `compras.cliente_id` ("Asociado"); Ingreso, Transferencia y Remesa ya no los ofrecen; Dashboard y Logística ya no los suman. La migración `2026_10_14_162650_mover_proveedores_con_uso_a_clientes` pasa a clientes los que tienen compras o saldo (corrida en test; **falta producción**). `proveedors` y su historial siguen intactos.
- **Dinero en tránsito**: una transferencia efectivo→efectivo queda pendiente (`transferencias_pendientes`) y se suma al capital; vista `/transacciones/envios` y hoja imprimible.
- **Cierre de Caja**: saldo esperado solo con lo que mueve una cuenta, tasa de cada operación (`monto_usd`), tránsito por días, `store()` validado y `aprobar()` solo admin/moderador.
- **Reportes** en un patrón uniforme (`.ai/rules/reportes.md`): Rastreo, Historial de Movimientos, Más Vendidos, Ventas por Período, Ventas por Vendedor, Ganancias, Historial de Precios, Cambios de Precio de Costo y Movimientos Financieros. Faltan 7 por rediseñar.
- **Entornos**: producción (`gestion.posglorietashop.com`) y test (`test-sistema.posglorietashop.com`) en el mismo servidor Hostinger.

`feature/desarrollo-caliente` — Estado al 2026-09-26 (todo lo de abajo hasta el 09-25 ya está commiteado; empezar por `docs/arreglos-pendientes/resumen-cambios-2026-09-25.md` y luego `docs/ESTADO_DESARROLLO.md`, cuya primera fila del historial es la verificación contra el código del 09-26):

- **2026-09-25:** Compras con `lockForUpdate` en aprobar/anular/editar; importación de Excel en dos pasos con hoja de revisión (`react-data-grid`), un lote `IMP-…` por fila, historial y deshacer; lotes de movimientos y compras que se acumulan al lote idéntico ("Eliminar de la lista" en Distribución de Costos); fusión de lotes sin bloqueo por prorrateo. 5 migraciones nuevas.
- **2026-09-24:** códigos de barras por almacén, `/disponibles` con agotadas, devoluciones de venta a su lote y código, ventas especiales en 2 tipos (`descuento` / `bajo_costo`), acceso denegado + páginas de error con la mascota, accesos rápidos en el encabezado.
- **2026-09-26 (Monedas):** cada moneda define en su CRUD qué métodos de pago admite y, en transferencia, sus vías (tablas `metodos_pago`, `vias_pago`, `moneda_metodo_pago`, `moneda_via_pago`); la columna `monedas.commission` se eliminó. El cobro (POS) aún no lee esa configuración.
- **2026-09-26 (comisión):** la cuenta de donde sale la comisión del vendedor se elige en el detalle de la venta (`Vendor/Show.tsx`, solo con la venta pendiente): cuentas CUP y cuentas USD de efectivo asignadas al vendedor de la venta; en USD `comision_tasa` = 1 y se debita `total_comision` en USD. El servidor lo valida en `guardarDistribucion`.
- **2026-09-26:** POS con selector de lote (2+ lotes, el más antiguo por defecto), comisión por lote (`lotes_stock.comision`, `venta_detalles.comision_base`) y precio propio de lote como precio base; `consumir()` trata el lote elegido como preferencia. 2 migraciones nuevas. Detalle en la primera fila del historial de `ESTADO_DESARROLLO.md`.
- **Sigue abierto (verificado 2026-09-26):** 3 huecos de lotes del POS (el cliente los rechazó dos veces; no tocar sin que los pida), ventas devueltas sin pantalla en el Cierre, notificaciones/bot de Telegram sin ponerse al día, rol de la importación directa (`productos.import`), estilo de los 4 export de Excel, reporte Valor del Inventario, despliegue del 09-25 a producción.

Track anterior (2026-09-20, sesión larga — `docs/arreglos-pendientes/resumen-cambios-2026-09-20.md`):

1. **Backfill de lotes de ajuste para stock viejo sin `lotes_stock` propio**: 1,512 lotes creados en todo el catálogo (comando `lotes:backfill-ajustes-legado`), cierra el hueco de stock previo al 2026-09-07 que caía al costo global sin lote propio.
2. **"Opción A" — precio de venta con override opcional por lote**: `lotes_stock.precio_venta` nullable, hereda el precio del almacén salvo que se corrija a mano por lote puntual (POS + `Show.tsx`/`Edit.tsx`).
3. **Movimiento #209 (Bejucal→Manzanillo) — prorrateo confirmado**, quedaba pendiente de la sesión anterior. Verificado en navegador.
4. **3 decisiones de diseño pendientes para mañana, sin implementar**: costo global en `Productos/Index.tsx` (también alcanzable desde Compras ahora), precio de venta al recibir en almacén nuevo vía Movimiento, y desglose por lote + atajo de fusión en `/disponibles`.

Detalle completo en `docs/arreglos-pendientes/resumen-cambios-2026-09-20.md` y memoria `project_compras_ficha_nueva_siempre_2026_09_18`.

Track anterior (2026-09-05):

1. **Impresión de venta por duplicado**: `Vendor/Imprimir.tsx` imprimía Ticket(interno, se queda en el punto de venta)/Factura+Garantía(se la lleva el cliente) en la mitad superior de la hoja A4, dejando la mitad inferior en blanco. A pedido del cliente, ahora se repite el mismo contenido (Ticket+Factura y las 31 cláusulas de garantía) en ambas mitades — al cortar por la línea ya marcada salen dos copias físicas idénticas. Contenido extraído a variables reutilizables, cada copia anclada por offset fijo en mm (no por alto renderizado) para evitar el bug de Chrome ya documentado. Verificado en navegador y **confirmado por el cliente en PDF real**.
2. **`exportToPDF` de Rastreo de Operaciones corregido**: generaba un PDF con 9 columnas viejas (incluía `Fecha`/`Usuario`, retirados de la tabla en pantalla desde agosto) — ahora exporta exactamente las 7 columnas reales.
3. **Prioridad de Reportes bajada explícitamente**: los 14 reportes del módulo `/reportes/*` aún sin trabajar (incluido `ProductosMasVendidos.tsx`, archivo vacío) quedan en prioridad baja — se trabajan solo bajo petición explícita del cliente.

Detalle completo en `docs/arreglos-pendientes/resumen-cambios-2026-09-05.md` y memoria `project_venta_recibo_impresion`/`project_reportes_module`.

Track anterior (2026-09-01):

1. **Saldo anterior/posterior en Venta y Compra, 4 fases**: Gasto/Ingreso/Transferencia ya mostraban el saldo antes/después de cada cuenta en Rastreo de Operaciones; Venta y Compra no capturaban nada, y ni Cuentas/Clientes/Proveedores mostraban lo que sí existía. Columnas nuevas en `pago_ventas`/`ventas`/`compra_pago`/`compras`, capturadas en `VentaController::aprobarVenta()`/`CompraController::store()`, mostradas en Rastreo de Operaciones (reutilizando `EntidadMovimientoCard`, más una tarjeta nueva de motivo de anulación) y en el historial propio de `Cuentas`/`Clientes`/`Proveedores`. Verificado en navegador con operaciones reales aisladas, rastro de prueba borrado al final. 258/258 tests. Detalle en `docs/arreglos-pendientes/resumen-cambios-2026-09-01.md` y memoria `project_saldo_anterior_posterior_operaciones`.
2. **`DatabaseSeeder.php` sincronizado con producción** para el `migrate:fresh --seed` que el cliente corre mañana (11 usuarios/24 almacenes/15 categorías reales, clientes de ejemplo quitados, cuentas base sin cambios). **Bug real crítico encontrado y corregido**: el seeder tenía un campo (`deuda`) de una columna ya eliminada — invisible en uso normal, pero `php artisan db:seed` desactiva la protección de mass-assignment globalmente, así que se hubiera caído a mitad de camino. Cubierto con `tests/Feature/DatabaseSeederTest.php` nuevo. Detalle en memoria `project_seeder_limpieza_produccion_2026_09_01`.

Track anterior (2026-08-22, sesión larga en 4 frentes — commiteado desde entonces, ver `git log`):

1. **Movimientos — editar antes de enviar**: `MovimientosController::actualizar()` nuevo (solo `pendiente_confirmacion`, revalida stock, sincroniza `MovimientoDetalle`), botón + diálogo en `Movimientos/Index.tsx`. Bug real encontrado probando la feature: `recibir()` clasificaba `recibido_completo` comparando solo la suma total en vez de cada línea (un movimiento con una línea de menos y otra de más que se cancelaban en el total quedaba mal marcado) — corregido, más comando `movimientos:corregir-recibido-completo --dry-run` para producción. Detalle en memoria `project_movimientos_editar_y_recibido_completo_fix`.
2. **Proveedores/Show.tsx, Proveedores/index.tsx, Clientes/Index.tsx**: pasada de consistencia visual (headers degradados, badges rojo/ámbar/esmeralda unificados, modal casero reemplazado por filas colapsables) + bug real de tipos (`decimal:2` cast serializa como string en JSON, rompía comparaciones `=== 0` con saldos exactos en $0.00). Detalle en memoria `project_proveedores_clientes_visual_2026-08-22`.
3. **Riel de accesos rápidos → "Dynamic Island"** *(REEMPLAZADO 2026-09-24)*: era `quick-access-rail.tsx`, una cápsula fija en el borde derecho; el cliente no la quería ahí (tapaba contenido) y se movió al encabezado como `resources/js/components/quick-access-tabs.tsx` (Cierres de Caja y Mis Ventas; el acceso activo se expande, los demás con tooltip; Notificaciones queda solo en la campana).
4. **Placeholder en campos numéricos** (Monedas/Create, Movimientos/Index, Proveedores/Create) — ver memoria `feedback_placeholder_vs_valor_real_campos_numericos`.

**Pendiente parcial, solo analizado, no implementado:** `docs/modelo-costo-producto/` — módulo "Formación de Costos y Precios", decidido que convive con `precio_compra_producto` (no lo reemplaza) por presión competitiva real del proyecto — ver memoria `project_contexto_negocio_prioridad_cliente`.

Track anterior (2026-08-20, cerrado y commiteado — commits `1b26ece6`..`43545fbc`, no quedó sin commitear como decía una nota vieja acá): **Módulo nuevo "Distribución de Costos"** (`/distribucion-costos`), reemplaza por completo el prorrateo que vivía enterrado en `TransaccionController.php`. Controlador propio (`DistribucionCostosController`), fórmula automática por peso proporcional (ya no manual, ya no tiene el bug de "sumar sin dividir entre unidades"), soporta lote de varias compras + varias cuentas CUP/USD mezcladas, más historial y detalle por distribución para auditoría. Detalle completo en `docs/arreglos-pendientes/distribucion-costos-modulo-2026-08-20.md`; contexto del hilo completo (Fases 1-5, identidad de producto por precio) en memoria `project_costo_promedio_ponderado`.

Track anterior (2026-08-13, cerrado salvo un bloqueo): **Precios de Venta — modal masivo por almacén** en `/disponibles`, ver sección dedicada abajo. Backend y frontend de la primera versión ya cerrados (búsqueda producto-primero, aplicar a varios almacenes, confirmación con contraseña, filtro Con Precio/Sin Precio en la tabla); pendiente resolver el desfase de esquema SQLite que bloquea los 9 tests ya escritos. Detalle completo en `docs/arreglos-pendientes/precios-venta-modal-busqueda-producto-2026-08-13.md`.

Otros tracks recientes, todos cerrados y commiteados por el cliente: **Dashboard** (2026-08-12, rework de Tabla 1 "Resumen Financiero" + Tabla 2 "Comparación Mensual", 3 bugs reales corregidos — ver `docs/arreglos-pendientes/dashboard-resumen-financiero-2026-08-12.md`); **Compras UX** (2026-08-10/11, formulario de alta, rediseño del carrito, diálogo de pago, control de acceso admin-only + auditoría de costos — ver `docs/arreglos-pendientes/`); **Reportes — Rastreo de Operaciones** (2026-08-06, Fases 7-9: Compras reintegrada como 5º tipo de operación, filtros multiselect + búsqueda por referencia — ver `docs/arreglos-pendientes/rastreo-operaciones-rediseno-2026-08-01.md`). Los otros 14 reportes del módulo Reportes siguen sin tocar (`docs/arreglos-pendientes/reportes-arreglos-2026-08-01.md`).

Trabajo previo (2026-07-26 a 2026-08-01, ya estable): **Compras con 0.90**, mejoras UX/UI en Cierres, **Transacciones** (Gastos/Ingresos/Transferencias) al 75%, **Cuentas** con `tipo_titular`, historial de operaciones en `Show.tsx` y acceso de vendedor a sus propias cuentas, **Logística I+II** (widgets Capital Financiero + resúmenes), **Bugs B1-B9 resueltos** (ver `ESTADO_DESARROLLO.md`).
