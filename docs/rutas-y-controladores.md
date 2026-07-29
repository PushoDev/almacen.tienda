# Rutas y Controladores — Referencia

> Mapa completo de rutas → controlador → método → vista. Actualizar cuando se agreguen rutas nuevas.

---

## Módulo de Ventas (POS)

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|---|---|---|---|
| GET | `/ventas` | `VentaController@index` | `Vendor/Index` |
| GET | `/ventas/listado` | `VentaController@listadoVentas` | `Vendor/Listado` |
| GET | `/ventas/{id}` | `VentaController@show` | `Vendor/Show` |
| POST | `/ventas/procesar` | `VentaController@procesarVenta` | JSON |
| POST | `/ventas/{id}/destinatario` | `VentaController@guardarDestinatario` | JSON |
| POST | `/ventas/{id}/distribucion` | `VentaController@guardarDistribucion` | JSON |
| POST | `/ventas/{id}/editar-pendiente` | `VentaController@editarVentaPendiente` | JSON |
| POST | `/ventas/{id}/aprobar` | `VentaController@aprobarVenta` | JSON |
| POST | `/ventas/{id}/anular` | `VentaController@anularVenta` | JSON |
| POST | `/ventas/{id}/aprobar-especial` | `VentaController@aprobarSolicitudEspecial` | JSON |
| POST | `/ventas/{id}/rechazar-especial` | `VentaController@rechazarSolicitudEspecial` | JSON |
| POST | `/ventas/{id}/decision-notificada` | `VentaController@marcarDecisionNotificada` | JSON |

### Endpoints JSON del POS (datos para el frontend)

| Método | Ruta | Qué devuelve |
|---|---|---|
| GET | `/ventas/almacenes` | Almacenes accesibles del usuario + cuenta mensajero |
| GET | `/ventas/almacen/{id}/productos` | Productos con stock, precio_base, comision |
| GET | `/ventas/clientes` | Clientes (id + nombre) |
| GET | `/ventas/cuentas` | Cuentas accesibles con moneda y saldo |
| GET | `/ventas/cuentas-filtradas` | Cuentas filtradas por moneda_id + tipo |
| GET | `/ventas/cuentas-gestor` | Cuentas para el selector de gestor |
| GET | `/ventas/monedas` | Monedas activas con tasa |
| GET | `/ventas/clientes-fisicos` | Clientes físicos con deuda (para pagos) |
| POST | `/ventas/cliente` | Crear cliente o devolver existente |

---

## Módulo de Cierre de Caja

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|---|---|---|---|
| GET | `/cierres` | `CierreCajaController@index` | `Cierres/Index` |
| GET | `/cierres/crear` | `CierreCajaController@create` | `Cierres/Create` |
| POST | `/cierres` | `CierreCajaController@store` | redirect |
| GET | `/cierres/{id}` | `CierreCajaController@show` | `Cierres/Show` |

---

## Módulo de Productos

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|---|---|---|---|
| GET | `/productos` | `ProductoController@index` | `Productos/Index` |
| GET | `/productos/{id}` | `ProductoController@show` | `Productos/Show` |
| GET | `/productos/{id}/editar` | `ProductoController@edit` | `Productos/Edit` |
| PUT | `/productos/{id}` | `ProductoController@update` | redirect |
| DELETE | `/productos/{id}` | `ProductoController@destroy` | JSON |
| POST | `/productos/importar` | `ProductoController@importar` | JSON |
| GET | `/productos/exportar` | `ProductoController@exportar` | Excel download |

### Precios de vendedor

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|---|---|---|---|
| GET | `/productos/vendedor` | `ProductoVendedorController@index` | `Productos/Vendor/Index` |
| POST | `/productos/vendedor/actualizar` | `ProductoVendedorController@actualizarPrecios` | JSON |
| GET | `/productos/vendedor/exportar` | `ProductoVendedorController@exportar` | Excel download |
| POST | `/productos/vendedor/importar` | `ProductoVendedorController@importar` | JSON |

---

## Módulo de Compras

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|---|---|---|---|
| GET | `/compras` | `CompraController@index` | `Comprar/Index` |
| GET | `/compras/{id}` | `CompraController@show` | `Comprar/Show` |
| POST | `/compras` | `CompraController@store` | JSON |

---

## Módulo de Almacenes

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|---|---|---|---|
| GET | `/almacenes` | `AlmacenController@index` | `Almacenes/Index` |
| GET | `/almacenes/crear` | `AlmacenController@create` | `Almacenes/Create` |
| POST | `/almacenes` | `AlmacenController@store` | redirect |
| GET | `/almacenes/{id}` | `AlmacenController@show` | `Almacenes/Show` |
| GET | `/almacenes/{id}/editar` | `AlmacenController@edit` | `Almacenes/Edit` |
| PUT | `/almacenes/{id}` | `AlmacenController@update` | redirect |
| DELETE | `/almacenes/{id}` | `AlmacenController@destroy` | redirect |

---

## Módulo de Movimientos de Stock

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|---|---|---|---|
| GET | `/movimientos` | `MovimientosController@index` | `Movimientos/Index` |
| GET | `/movimientos/{id}` | `MovimientosController@show` | `Movimientos/Show` |
| POST | `/movimientos` | `MovimientosController@store` | JSON |
| POST | `/movimientos/{id}/enviar` | `MovimientosController@enviar` | JSON |
| POST | `/movimientos/{id}/recibir` | `MovimientosController@recibir` | JSON |
| POST | `/movimientos/{id}/rechazar` | `MovimientosController@rechazar` | JSON |
| POST | `/movimientos/{id}/cancelar` | `MovimientosController@cancelar` | JSON |

---

## Módulo de Cuentas Financieras

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|---|---|---|---|
| GET | `/cuentas` | `CuentaController@index` | `Cuentas/Index` |
| POST | `/cuentas` | `CuentaController@store` | JSON |
| PUT | `/cuentas/{id}` | `CuentaController@update` | JSON |
| DELETE | `/cuentas/{id}` | `CuentaController@destroy` | JSON |
| POST | `/cuentas/{id}/ajustar-saldo` | `CuentaController@ajustarSaldo` | JSON — requiere contraseña |

---

## Módulo de Transacciones Financieras

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|---|---|---|---|
| GET | `/transacciones` | `TransaccionController@index` | `Transacciones/Index` |
| POST | `/transacciones/distribuir-costos-manual` | `TransaccionController@distribuirCostosManual` | JSON |
| GET | `/transacciones/distribuir-costos/{compra}` | `TransaccionController@mostrarFormularioDistribucion` | Vista |
| GET | `/transacciones/historial` | `TransaccionController@historial` | `Transacciones/Historial` |
| POST | `/transacciones/gastar` | `GastoController@store` | JSON |
| GET | `/transacciones/ingreso/data` | `IngresoController@formData` | JSON |
| POST | `/transacciones/ingresar` | `IngresoController@store` | JSON |
| POST | `/transacciones/transferir` | `TransferenciaController@store` | JSON |

---

## Módulo de Usuarios y Empleados

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|---|---|---|---|
| GET | `/empleados` | `UserController@index` | `Empleados/Index` |
| GET | `/empleados/crear` | `UserController@create` | `Empleados/Create` |
| POST | `/empleados` | `UserController@store` | redirect |
| GET | `/empleados/{id}/editar` | `UserController@edit` | `Empleados/Edit` |
| PUT | `/empleados/{id}` | `UserController@update` | redirect |
| DELETE | `/empleados/{id}` | `UserController@destroy` | redirect |
| POST | `/empleados/{id}/almacenes` | `UserAlmacenController@sync` | JSON |

---

## Módulo de Clientes

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|---|---|---|---|
| GET | `/clientes` | `ClienteController@index` | `Clientes/Index` |
| GET | `/clientes/{id}` | `ClienteController@show` | `Clientes/Show` |
| POST | `/clientes` | `ClienteController@store` | JSON |
| PUT | `/clientes/{id}` | `ClienteController@update` | JSON |
| DELETE | `/clientes/{id}` | `ClienteController@destroy` | JSON |

---

## Módulo de Reportes

| Método | Ruta | Controlador@Método | Vista / Respuesta |
|---|---|---|---|
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

## API Pública (sin autenticación)

Prefijo: `/api/tienda` — throttle: 60 req/min

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/tienda/almacenes` | Lista almacenes activos |
| GET | `/api/tienda/almacenes/{id}` | Detalle de almacén |
| GET | `/api/tienda/almacenes/{id}/productos` | Productos del almacén con stock |
| GET | `/api/tienda/productos` | Búsqueda de productos |
| GET | `/api/tienda/productos/{id}` | Detalle de producto |
| GET | `/api/tienda/productos/{id}/stock` | Stock por almacén |
| GET | `/api/tienda/categorias` | Categorías |
| GET | `/api/tienda/docs/openapi.json` | Especificación OpenAPI |
| GET | `/api/tienda/docs` | Swagger UI |

---

## Bot de Telegram (webhook)

| Método | Ruta | Controlador@Método |
|---|---|---|
| POST | `/api/telegram/webhook` | `TelegramWebhookController@handle` |

Autenticado por header `X-Telegram-Bot-Api-Secret-Token`.

---

## Dashboard

| Método | Ruta | Controlador@Método | Vista |
|---|---|---|---|
| GET | `/` | `AdminController@dashboard` | `dashboard` |
| GET | `/historial-comparaciones` | `AdminController@historialComparaciones` | `dashboard/historial-comparaciones` |

---

## Middlewares aplicados por ruta

| Middleware | Qué protege |
|---|---|
| `auth` | Todas las rutas web (excepto login) |
| `EnsureUserIsAdmin` | Rutas exclusivas de admin (aprobar ventas especiales, modificar costos, etc.) |
| `EnsureUserIsModerator` | Rutas para admin + moderador |
| `EnsureUserIsVendor` | Rutas del POS y cierre de caja |
| `CheckAlmacenPermission` | Verifica que el usuario tiene acceso al almacén en la URL |
| `CheckCuentaPermission` | Verifica que el usuario tiene acceso a la cuenta en la URL |
