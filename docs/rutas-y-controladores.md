# Rutas y Controladores — Referencia

> Mapa completo de rutas → controlador → método → vista. Actualizar cuando se agreguen rutas nuevas.
> Última actualización: 2026-07-30

---

## Módulo de Ventas (POS)

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/punto-venta` | `VentaController@index` | `Vendor/Index` |
| GET | `/ventas/listado` | `VentaController@listadoVentas` | `Vendor/Listado` |
| GET | `/ventas/{id}/show` | `VentaController@show` | `Vendor/Show` |
| GET | `/ventas/reporte-diario` | `VentaController@showReporteDiarioView` | `Vendor/ReporteDiario` |
| POST | `/ventas/procesar` | `VentaController@procesarVenta` | JSON |
| POST | `/ventas/{venta}/destinatario` | `VentaController@guardarDestinatario` | JSON |
| POST | `/ventas/{venta}/distribucion` | `VentaController@guardarDistribucion` | JSON |
| POST | `/ventas/{venta}/editar-pendiente` | `VentaController@editarVentaPendiente` | JSON |
| POST | `/ventas/{venta}/aprobar` | `VentaController@aprobarVenta` | JSON |
| POST | `/ventas/{venta}/anular` | `VentaController@anularVenta` | JSON |
| POST | `/ventas/{venta}/especial/aprobar` | `VentaController@aprobarSolicitudEspecial` | JSON |
| POST | `/ventas/{venta}/especial/rechazar` | `VentaController@rechazarSolicitudEspecial` | JSON |
| POST | `/ventas/{venta}/decision-notificada` | `VentaController@marcarDecisionNotificada` | JSON |

> ⚠️ **Rutas registradas pero rotas**: `POST /ventas/validar-stock` (`ventas.validarStock`) y `POST /ventas/actualizar-tasas` (`ventas.actualizarTasas`) están definidas en `routes/shop/puntoventa.php` pero `VentaController` **no tiene** los métodos `validarStock` ni `actualizarTasas` — llamarlas produce un error fatal.

### Endpoints JSON del POS (datos para el frontend)

| Método | Ruta | Qué devuelve |
|--------|------|-------------|
| GET | `/ventas/almacenes` | Almacenes accesibles del usuario + cuenta mensajero |
| GET | `/ventas/almacenes/{id}/productos` | Productos con stock, precio_base, comision |
| GET | `/ventas/clientes` | Clientes (id + nombre) |
| GET | `/ventas/cuentas` | Cuentas accesibles con moneda y saldo |
| GET | `/ventas/cuentas/filtradas` | Cuentas filtradas por moneda_id + tipo |
| GET | `/ventas/cuentas/gestor` | Cuentas para el selector de gestor |
| GET | `/ventas/monedas` | Monedas activas con tasa |
| GET | `/ventas/clientes-fisicos-pago` | Clientes físicos con deuda (para pagos) |
| POST | `/ventas/clientes/store` | Crear cliente o devolver existente |
| GET | `/ventas/reporte-data` | Datos para reporte diario |

---

## Módulo de Cierre de Caja

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/vendor/cierres` | `CierreCajaController@index` | `Cierres/Index` |
| GET | `/vendor/cierres/crear` | `CierreCajaController@create` | `Cierres/Create` |
| POST | `/vendor/cierres` | `CierreCajaController@store` | redirect |
| GET | `/vendor/cierres/{id}` | `CierreCajaController@show` | `Cierres/Show` |
| POST | `/vendor/cierres/{id}/aprobar` | `CierreCajaController@aprobar` | JSON |

---

## Módulo de Productos

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/listado-productos` | `ProductoController@index` | `Productos/Index` |
| GET | `/listado-productos/create` | `ProductoController@create` | `Productos/Create` |
| POST | `/listado-productos` | `ProductoController@store` | redirect |
| GET | `/listado-productos/{producto}` | `ProductoController@show` | `Productos/Show` |
| GET | `/listado-productos/{producto}/edit` | `ProductoController@edit` | `Productos/Edit` |
| PUT | `/listado-productos/{producto}` | `ProductoController@update` | redirect |
| DELETE | `/listado-productos/{producto}` | `ProductoController@destroy` | JSON |
| GET | `/listado-productos/exportar/excel` | `ProductoController@export` | Excel download |
| POST | `/listado-productos/importar/excel` | `ProductoController@import` | JSON |
| POST | `/listado-productos/importar/almacen/{almacenId}` | `ProductoController@importToAlmacen` | JSON |
| GET | `/listado-productos/descargar/plantilla` | `ProductoController@downloadTemplate` | Excel download |
| GET | `/listado-productos/duplicados` | `ProductoController@duplicados` | JSON |
| POST | `/listado-productos/normalizar-duplicados` | `ProductoController@normalizarDuplicados` | JSON |
| POST | `/listado-productos/fusionar-duplicados` | `ProductoController@fusionarDuplicados` | JSON |
| POST | `/listado-productos/{producto}/transferir-codigo` | `ProductoController@transferirCodigo` | JSON |

### Precios de vendedor

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/disponibles` | `ProductoVendedorController@index` | `Productos/Vendor/Index` |
| POST | `/disponibles/{disponible}` | `ProductoVendedorController@update` | JSON |
| GET | `/disponibles/{producto}/precios-vendedores/{almacen}` | `ProductoVendedorController@preciosPorVendedor` | JSON |
| POST | `/disponibles/{producto}/precios-base` | `ProductoVendedorController@setPreciosBase` | JSON |
| GET | `/disponibles/almacen/{almacen}/exportar` | `ProductoVendedorController@exportExcel` | Excel download |
| POST | `/disponibles/almacen/{almacen}/importar` | `ProductoVendedorController@importExcel` | JSON |

---

## Módulo de Compras

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/comprar` | `CompraController@index` | `Comprar/Index` |
| GET | `/comprar/{comprar}` | `CompraController@show` | `Comprar/Show` |
| POST | `/comprar` | `CompraController@store` | JSON |

### Endpoints JSON de Compras

| Método | Ruta | Qué devuelve |
|--------|------|-------------|
| GET | `/compras/almacenes` | Almacenes con búsqueda |
| POST | `/compras/almacenes` | Crear almacén inline |
| GET | `/compras/proveedores` | Proveedores con búsqueda |
| POST | `/compras/proveedores` | Crear proveedor inline |
| GET | `/compras/categorias` | Categorías |
| POST | `/compras/categorias` | Crear categoría inline |
| GET | `/compras/clientes/fisicos` | Clientes físicos |
| GET | `/compras/clientes/buscar` | Búsqueda rápida de clientes |
| POST | `/compras/clientes` | Crear cliente inline |
| GET | `/compras/cuentas/pago` | Cuentas para pago |
| GET | `/compras/datos` | Datos combinados para formulario |
| POST | `/compras/registrar` | Registrar compra completa |
| GET | `/compras/almacenes/{id}/productos` | Productos por almacén |

---

## Módulo de Almacenes

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/almacenes` | `AlmacenController@index` | `Almacenes/Index` |
| GET | `/almacenes/create` | `AlmacenController@create` | `Almacenes/Create` |
| POST | `/almacenes` | `AlmacenController@store` | redirect |
| GET | `/almacenes/{almacen}` | `AlmacenController@show` | `Almacenes/Show` |
| GET | `/almacenes/{almacen}/edit` | `AlmacenController@edit` | `Almacenes/Edit` |
| PUT | `/almacenes/{almacen}` | `AlmacenController@update` | redirect |
| DELETE | `/almacenes/{almacen}` | `AlmacenController@destroy` | redirect |

---

## Módulo de Categorías

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/categorias` | `CategoriaController@index` | `Categorias/Index` |
| GET | `/categorias/create` | `CategoriaController@create` | `Categorias/Create` |
| POST | `/categorias` | `CategoriaController@store` | redirect |
| GET | `/categorias/{categoria}` | `CategoriaController@show` | `Categorias/Show` |
| GET | `/categorias/{categoria}/edit` | `CategoriaController@edit` | `Categorias/Edit` |
| PUT | `/categorias/{categoria}` | `CategoriaController@update` | redirect |
| DELETE | `/categorias/{categoria}` | `CategoriaController@destroy` | redirect |

`Route::resource` completo, definido en `routes/crud/categorias.php`.

---

## Módulo de Proveedores

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/proveedores` | `ProveedorController@index` | `Proveedores/Index` |
| GET | `/proveedores/create` | `ProveedorController@create` | `Proveedores/Create` |
| POST | `/proveedores` | `ProveedorController@store` | redirect |
| GET | `/proveedores/{proveedor}` | `ProveedorController@show` | `Proveedores/Show` |
| GET | `/proveedores/{proveedor}/edit` | `ProveedorController@edit` | `Proveedores/Edit` |
| PUT | `/proveedores/{proveedor}` | `ProveedorController@update` | redirect |
| DELETE | `/proveedores/{proveedor}` | `ProveedorController@destroy` | redirect |

`Route::resource` completo, definido en `routes/crud/proveedores.php`. `ProveedorController` también define `actualizarSaldo`, `conDeuda`, `conFondo`, `resetearSaldo` — implementados pero **sin ruta asignada** (código muerto/no expuesto).

---

## Módulo de Movimientos de Stock

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/movimientos` | `MovimientosController@index` | `Movimientos/Index` |
| GET | `/movimientos/{movimiento}` | `MovimientosController@show` | `Movimientos/Show` |
| POST | `/movimientos` | `MovimientosController@store` | JSON |
| POST | `/movimientos/{movimiento}/aprobar` | `MovimientosController@aprobar` | JSON |
| POST | `/movimientos/{movimiento}/enviar` | `MovimientosController@enviar` | JSON |
| POST | `/movimientos/{movimiento}/recibir` | `MovimientosController@recibir` | JSON |
| POST | `/movimientos/{movimiento}/rechazar` | `MovimientosController@rechazar` | JSON |
| GET | `/movimientos/{movimiento}/seguimiento` | `MovimientosController@seguimiento` | JSON |
| GET | `/movimientos/reportes/discrepancias` | `MovimientosController@reporteDiscrepancias` | JSON |
| GET | `/movimientos/almacenes` | `MovimientosController@getAlmacenes` | JSON |
| GET | `/movimientos/almacenes/{id}/productos` | `MovimientosController@getProductosPorAlmacen` | JSON |

---

## Módulo de Cuentas Financieras

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/cuentas` | `CuentaController@index` | `Cuentas/Index` |
| GET | `/cuentas/create` | `CuentaController@create` | `Cuentas/Create` |
| POST | `/cuentas` | `CuentaController@store` | JSON |
| GET | `/cuentas/{cuenta}` | `CuentaController@show` | `Cuentas/Show` |
| GET | `/cuentas/{cuenta}/edit` | `CuentaController@edit` | `Cuentas/Edit` |
| PUT/PATCH | `/cuentas/{cuenta}` | `CuentaController@update` | JSON |
| DELETE | `/cuentas/{cuenta}` | `CuentaController@destroy` | JSON |
| POST | `/cuentas/{id}/ajustar-saldo` | `CuentaController@ajustarSaldo` | JSON — requiere contraseña |

> Las rutas `show`, `edit`, `update`, `destroy` están protegidas por middleware `check.cuenta.permission`.

---

## Módulo de Transacciones Financieras

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/transacciones` | `TransaccionController@index` | `Transacciones/Index` |
| GET | `/transacciones/{movimiento}` | `TransaccionController@show` | `Transacciones/Show` |
| GET | `/transacciones/distribuir-costos/{compra}` | `TransaccionController@mostrarFormularioDistribucion` | Vista |
| POST | `/transacciones/distribuir-costos-manual` | `TransaccionController@distribuirCostosManual` | JSON |
| POST | `/transacciones/distribuir-costos` | `TransaccionController@distribuirCostosManual` | JSON — ruta duplicada (mismo método, nombre `distribuir.costos.manual`) |
| POST | `/transacciones/gastar` | `GastoController@store` | JSON |
| GET | `/transacciones/ingreso/data` | `IngresoController@formData` | JSON |
| POST | `/transacciones/ingresar` | `IngresoController@store` | JSON |
| GET | `/transacciones/transferencia/data` | `TransferenciaController@formData` | JSON |
| POST | `/transacciones/transferir` | `TransferenciaController@store` | JSON |
| POST | `/transacciones/gasto-transportacion` | `TransaccionController@gastoTransportacion` | JSON |

---

## Módulo de Usuarios y Empleados

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/empleados` | `UserController@index` | `Empleados/Index` |
| GET | `/empleados/create` | `UserController@create` | `Empleados/Create` |
| POST | `/empleados` | `UserController@store` | redirect |
| GET | `/empleados/{user}/edit` | `UserController@edit` | `Empleados/Edit` |
| PUT | `/empleados/{user}` | `UserController@update` | redirect |
| DELETE | `/empleados/{user}` | `UserController@destroy` | redirect |

---

## Módulo de Clientes

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/clientes` | `ClienteController@index` | `Clientes/Index` |
| GET | `/clientes/{cliente}` | `ClienteController@show` | `Clientes/Show` |
| POST | `/clientes` | `ClienteController@store` | JSON |
| PUT | `/clientes/{cliente}` | `ClienteController@update` | JSON |
| DELETE | `/clientes/{cliente}` | `ClienteController@destroy` | JSON |

---

## Módulo de Reportes

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/reportes` | `ReporteController@index` | `Reportes/Index` |
| GET | `/reportes/ventas-por-periodo` | `ReporteController@ventasPorPeriodo` | `Reportes/Report/VentasPorPeriodo` |
| GET | `/reportes/ventas-por-vendedor` | `ReporteController@ventasPorVendedor` | `Reportes/Report/VentasPorVendedor` |
| GET | `/reportes/productos-mas-vendidos` | `ReporteController@productosMasVendidos` | `Reportes/Report/ProductosMasVendidos` |
| GET | `/reportes/compras-por-periodo` | `ReporteController@comprasPorPeriodo` | `Reportes/Report/CompraPorPeriodo` |
| GET | `/reportes/compras-por-proveedor/{proveedorId?}` | `ReporteController@comprasPorProveedor` | `Reportes/Report/ComprasPorProveedor` |
| GET | `/reportes/productos-mas-comprados` | `ReporteController@productosMasComprados` | `Reportes/Report/ProductosMasComprados` |
| GET | `/reportes/balance-gastos-mensuales` | `ReporteController@balanceGastosMensuales` | `Reportes/Report/BalanceGastosMensuales` |
| GET | `/reportes/inventario-por-almacen` | `ReporteController@inventarioPorAlmacen` | `Reportes/Report/InventarioPorAlmacen` |
| GET | `/reportes/inventario-detallado-por-almacen` | `ReporteController@inventarioDetalladoPorAlmacen` | `Reportes/Report/InventarioDetalladoPorAlmacen` |
| GET | `/reportes/reporte-stock-bajo` | `ReporteController@reporteStockBajo` | `Reportes/Report/ReporteStockBajo` |
| GET | `/reportes/valor-inventario` | `ReporteController@valorInventario` | `Reportes/Report/ValorInventario` |
| GET | `/reportes/reporte-ganancias` | `ReporteController@reporteGanancias` | `Reportes/Report/ReporteGanancias` |
| GET | `/reportes/historial-precios` | `ReporteController@historialPrecios` | `Reportes/Report/HistorialPrecios` |
| GET | `/reportes/historial-costo-precio` | `ReporteController@historialCostoPrecio` | `Reportes/Report/HistorialCostoPrecio` |
| GET | `/reportes/movimientos-financieros` | `ReporteController@movimientosFinancieros` | `Reportes/Report/MovimientosFinancieros` |
| GET | `/reportes/rastreo-operaciones` | `ReporteController@rastreoOperaciones` | `Reportes/Report/RastreoOperaciones` |

---

## Módulo de Logística

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/logistica` | `LogisticaController@index` | `Logistica/Index` |
| GET | `/logistica/create` | `LogisticaController@create` | `Logistica/Create` |
| POST | `/logistica` | `LogisticaController@store` | redirect |
| GET | `/logistica/{logistica}` | `LogisticaController@show` | `Logistica/Show` |
| GET | `/logistica/{logistica}/edit` | `LogisticaController@edit` | `Logistica/Edit` |
| PUT | `/logistica/{logistica}` | `LogisticaController@update` | redirect |
| DELETE | `/logistica/{logistica}` | `LogisticaController@destroy` | redirect |

---

## Módulo de Monedas

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/monedas` | `MonedaController@index` | `Monedas/Index` |
| GET | `/monedas/create` | `MonedaController@create` | `Monedas/Create` |
| POST | `/monedas` | `MonedaController@store` | redirect |
| GET | `/monedas/{moneda}/edit` | `MonedaController@edit` | `Monedas/Edit` |
| PUT | `/monedas/{moneda}` | `MonedaController@update` | redirect |
| DELETE | `/monedas/{moneda}` | `MonedaController@destroy` | redirect |
| PATCH | `/monedas/{moneda}/cambiar-estado` | `MonedaController@cambiarEstado` | JSON |
| PATCH | `/monedas/{moneda}/establecer-principal` | `MonedaController@establecerPrincipal` | JSON |

---

## Dashboard

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/` | — | `auth/login` (Inertia) |
| GET | `/dashboard` | `AdminController@index` | `dashboard` |
| POST | `/dashboard/update-tasa` | `AdminController@update` | JSON |
| POST | `/dashboard/update-tasa-mlc` | `AdminController@updateMLC` | JSON |
| GET | `/dashboard/chart-data` | `ReporteController@getComprasVentasData` | JSON |
| GET | `/dashboard/financial-states` | `ReporteController@getFinancialStates` | JSON |
| GET | `/dashboard/usuarios` | `ReporteController@getUsuarios` | JSON |
| GET | `/dashboard/monedas` | `ReporteController@getMonedas` | JSON |
| GET | `/dashboard/historial-comparaciones` | `AdminController@getHistorialComparaciones` | JSON |
| GET | `/dashboard/historial-comparaciones/view` | — | `dashboard/historial-comparaciones` |
| GET | `/dashboard/estadisticas-costo-precio` | `AdminController@getEstadisticasCostoPrecio` | JSON |

---

## Notificaciones

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/notifications` | `NotificationController@index` | `Notifications/Index` |
| GET | `/notifications/history` | `NotificationController@history` | JSON |
| POST | `/notifications/{id}/read` | `NotificationController@markAsRead` | JSON |
| POST | `/notifications/mark-all-read` | `NotificationController@markAllAsRead` | JSON |

---

## Settings (Ajustes de Perfil)

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/settings/profile` | `ProfileController@edit` | `settings/profile` |
| PATCH | `/settings/profile` | `ProfileController@update` | redirect |
| DELETE | `/settings/profile` | `ProfileController@destroy` | redirect |
| POST | `/settings/profile/telegram-token` | `ProfileController@generateTelegramToken` | JSON |
| DELETE | `/settings/profile/telegram` | `ProfileController@disconnectTelegram` | JSON |
| GET | `/settings/password` | `PasswordController@edit` | `settings/password` |
| PUT | `/settings/password` | `PasswordController@update` | redirect |
| GET | `/settings/appearance` | — | `settings/appearance` |

---

## API Pública (catálogo sin autenticación)

Definida en `routes/web.php` con prefijo `/api/tienda` y middleware `throttle:60,1`.

| Método | Ruta | Controlador@Método | Descripción |
|--------|------|-------------------|-------------|
| GET | `/api/tienda/almacenes` | `CatalogoPublicoController@indexAlmacenes` | Lista almacenes activos |
| GET | `/api/tienda/almacenes/{id}` | `CatalogoPublicoController@showAlmacen` | Detalle de almacén |
| GET | `/api/tienda/almacenes/{id}/productos` | `CatalogoPublicoController@productosPorAlmacen` | Productos del almacén con stock |
| GET | `/api/tienda/productos` | `CatalogoPublicoController@searchProductos` | Búsqueda de productos |
| GET | `/api/tienda/productos/{id}` | `CatalogoPublicoController@showProducto` | Detalle de producto |
| GET | `/api/tienda/productos/{id}/stock` | `CatalogoPublicoController@stockPorProducto` | Stock por almacén |
| GET | `/api/tienda/categorias` | `CatalogoPublicoController@indexCategorias` | Categorías |
| GET | `/api/tienda/docs/openapi.json` | `CatalogoPublicoController@openApiSpec` | Especificación OpenAPI |
| GET | `/api/tienda/docs` | `CatalogoPublicoController@swaggerUi` | Swagger UI |

---

## Bot de Telegram (webhook)

Definido en `routes/api.php`.

| Método | Ruta | Controlador@Método |
|--------|------|-------------------|
| POST | `/api/telegram/webhook` | `TelegramWebhookController@handle` |

Autenticado por header `X-Telegram-Bot-Api-Secret-Token`.

---

## Remesas

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|--------|------|-------------------|-------------------|
| GET | `/remesas` | — (Inertia directo) | `Remesas/Index` |

---

## Middlewares aplicados por ruta

| Middleware | Qué protege |
|-----------|-------------|
| `auth` + `verified` | **Todos** los grupos de rutas en `routes/*.php` (web, crud/, acciones/, shop/, empleados/) — no es una protección selectiva por módulo, es blanket-wide |
| `check.cuenta.permission` | Verifica que el usuario tiene acceso a la cuenta en `show`/`edit`/`update`/`destroy` de cuentas |
| `HandleInertiaRequests` | Comparte datos globales con Inertia (usuario, tasas, permisos) |
| `throttle:60,1` | API pública (60 req/min) |

> **Nota (corregida):** `EnsureUserIsAdmin`, `EnsureUserIsModerator` y `EnsureUserIsVendor` **sí están registradas** como alias de middleware (`admin`, `moderator`, `vendor`) en `bootstrap/app.php:37-40`, pero **no se aplican a ninguna ruta**. Solo `CheckAlmacenPermission` está realmente sin registrar (importada pero comentada en `bootstrap/app.php:31`). La verificación de roles se hace inline en los controladores mediante `$user->isAdmin()`, `$user->isModerador()`.

> **Ruta huérfana:** `routes/vendor/vendedor.php` (define `GET /vendedor`) existe pero **no está incluida (`require`) desde `routes/web.php`** — es código muerto, inalcanzable.
