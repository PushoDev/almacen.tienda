# Contexto del Proyecto: almacen.tienda

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

Los controladores filtran datos por rol directamente: `in_array($user->role, ['admin', 'moderador'])`.

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

### Compra (`compras`)
Tipos de pago:
- `deuda_proveedor`: genera deuda con proveedor o acumula deuda del cliente fuente.
- `pago_cash`: descuenta de cuentas USD permanentes/temporales o saldo de clientes.

Fuente: puede ser un `Proveedor` o un `Cliente físico` (reseller).
Al registrar compra: crea/actualiza `Producto`, genera `ProductoCodigo`, incrementa `almacen_producto.cantidad`.
Pagos múltiples soportados en `compra_pago`.

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
- Categorías: `permanentes`, `temporales`, `deudas`.
- Moneda vinculada via `moneda_id`.
- Vendedores solo ven sus cuentas asignadas (tabla `user_cuentas`).
- Modificar saldo requiere rol admin + contraseña de seguridad hardcoded (`glorietashop`).
- **Index rediseñado** (`resources/js/pages/Cuentas/Index.tsx`):
  - 3 filas de widgets interactivos: KPIs (total eq., activas/inactivas), desglose por tipo con barras de porcentaje por cantidad de cuentas, desglose por moneda.
  - Todos los widgets son clickeables y filtran la tabla al hacer clic.
  - Filtro combinado: tipo + moneda + estado + deudas (por saldo negativo) + búsqueda.
  - Resumen de filtros activos con badges removibles y línea de totales por moneda.
  - Paginación con ventana de páginas.
  - **Row 3** (Desglose por Moneda): solo muestra cuentas **permanentes** (nuevo `por_moneda_perm` en backend).
  - Formato moneda: `": "` entre indicador y valor (ej. `$: 305.834,63`, `CUP: 5.444.544,38`).
- **Backend** (`CuentaController@index`): precalcula `$resumen` (por_tipo, por_moneda, por_moneda_perm, por_estado, total_saldo) y lo pasa a la vista Inertia.
- **Deudas**: detectadas desde `saldo_cuenta < 0` (no desde `tipo_cuenta = 'deudas'`, que aún no está en uso).

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

---

## API Pública (e-commerce)

Prefijo: `/api/tienda` — sin autenticación, throttle: 60 req/min.

| Endpoint | Descripción |
|---|---|
| `GET /almacenes` | Lista de almacenes activos |
| `GET /almacenes/{id}` | Detalle de almacén |
| `GET /almacenes/{id}/productos` | Productos del almacén con stock |
| `GET /productos` | Búsqueda de productos |
| `GET /productos/{id}` | Detalle de producto |
| `GET /productos/{id}/stock` | Stock por almacén |
| `GET /categorias` | Categorías |
| `GET /docs/openapi.json` | Spec OpenAPI |
| `GET /docs` | Swagger UI |

---

## Estructura de Controladores

| Controlador | Responsabilidad Principal |
|---|---|
| `AdminController` | Dashboard, tasas de cambio (USD y MLC), historial de comparaciones mensuales |
| `VentaController` | POS completo: crear venta, aprobar, anular, listado, datos JSON para el frontend |
| `CompraController` | Registro de compras, gestión inline de proveedores/clientes/almacenes/categorías |
| `ProductoController` | CRUD de productos, búsqueda, transferencia de códigos, import/export Excel |
| `AlmacenController` | CRUD de almacenes, vista de inventario por almacén |
| `MovimientosController` | Traslados de stock: crear, enviar, recibir, rechazar, discrepancias |
| `CuentaController` | CRUD de cuentas, control de saldo con contraseña |
| `CierreCajaController` | Pre-cierre (cálculos), store (persistencia), show (detalle histórico) |
| `ReporteController` | Todos los reportes: ventas, compras, inventario, ganancias, auditoría |
| `TransaccionController` | Movimientos financieros, distribución de costos de compra |
| `TelegramWebhookController` | Bot: comandos texto + callbacks inline de aprobación |
| `ProductoVendedorController` | Asignación/edición de precios y comisiones por almacén |
| `UserController` | Gestión de usuarios |
| `UserAlmacenController` | Asignación de usuarios a almacenes |
| `LogisticaController` | Vista de logística |
| `MonedaController` | CRUD de monedas, actualización de tasas |
| `MovimientosPendienteController` | Movimientos de stock pendientes |
| `NotificationController` | Lectura y marcado de notificaciones |
| `EcommerceController` | Vista de catálogo público (en desarrollo) |
| `Api/CatalogoPublicoController` | API REST pública sin auth |
| `DestinatarioVentaController` | Destinatarios/receptores de ventas |
| `ClienteController` | CRUD de clientes y gestión de deuda |
| `ProveedorController` | CRUD de proveedores |
| `CategoriaController` | CRUD de categorías |

---

## Middlewares Relevantes

| Middleware | Uso |
|---|---|
| `EnsureUserIsAdmin` | Protege rutas solo para `admin` |
| `EnsureUserIsModerator` | Rutas para `admin` o `moderador` |
| `EnsureUserIsVendor` | Rutas de vendedor |
| `CheckAlmacenPermission` | Verifica que el usuario tiene acceso al almacén solicitado |
| `CheckCuentaPermission` | Verifica que el usuario tiene acceso a la cuenta solicitada |
| `HandleInertiaRequests` | Comparte datos globales con Inertia (usuario, permisos) |

---

## Patrones y Convenciones

- **Inertia SSR**: Vistas PHP retornan `Inertia::render('Módulo/Vista', [...datos])`. El frontend recibe props tipadas.
- **Ziggy**: Rutas Laravel disponibles en JS como `route('nombre.ruta')`.
- **Transacciones DB**: todas las operaciones críticas (venta, compra, movimiento, cierre) usan `DB::beginTransaction()` con rollback en catch.
- **Stock inmediato**: al crear una venta (incluso pendiente), el stock se descuenta de inmediato para reservarlo.
- **Datos sensibles**: `precio_compra_producto` y `costo_unitario` solo se exponen a `admin` y `moderador` en respuestas JSON.
- **Nombres en español**: modelos, columnas, rutas y vistas siguen nomenclatura en español.
- **Rutas modularizadas**: `routes/web.php` incluye archivos de subdirectorio (`crud/`, `acciones/`, `shop/`, `empleados/`).

---

## Página de Logística (`Logistica/Index.tsx`)

La página de Logística es un **dashboard informativo** tipo KPI dashboard con cards de resumen:

### Cards superiores — Capitales Financieros (4 widgets):

1. **Capital Financiero** (verde, `Landmark` icon) — Suma de: `total_saldo` (cuentas eq. USD) + `balance_neto` (clientes) + `balance_neto` (proveedores) + `total_importe_global` (productos)
2. **Capital USD** (ámbar, `DollarSign` icon) — Suma de: `balance_neto` (clientes) + `balance_neto` (proveedores) + `total_importe_global` (productos) + `por_tipo['temporales']` + `por_moneda_perm['USD'].equivalente`
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
| `getResumenProveedores()` | Datos agregados de proveedores | `total_proveedores`, `total_fondo`, `total_deuda`, `balance_neto`, `por_estado` |
| `getResumenProductos()` | Datos agregados de productos | `total_productos`, `total_unidades`, `total_importe_global`, `productos_stock_bajo`, `valor_stock_bajo`, `por_stock` |
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

---

## Branch Actual

`feature/bot-telegram` — Trabajo activo en integración del bot de Telegram.
Últimos cambios: **Dashboard Logística** convertido en panel de resúmenes con 4 cards (Cuentas, Clientes, Proveedores, Productos). Eliminados widgets mock y placeholders. Fixes en `getResumenPorMonedaPerm()` (acumulación por codigo_moneda), extracción de `getMonedaPrincipal()`, constante `STOCK_BAJO_THRESHOLD`. Formato moneda consistente con `toLocaleString('es-ES')`.
