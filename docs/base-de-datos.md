# Base de Datos — Tablas Principales

> Referencia rápida de las tablas más usadas, sus campos clave y relaciones.
> Para el esquema completo ver las migraciones en `database/migrations/`.

---

## Tablas principales

### `users`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `name` | string | |
| `email` | string | |
| `password` | string | |
| `role` | enum | `admin`, `moderador`, `vendedor` |
| `avatar` | string nullable | |
| `telegram_chat_id` | string nullable | Chat ID de Telegram para notificaciones |
| `telegram_link_token` | string nullable | Token temporal para vincular cuenta |

**Relaciones:** `hasMany(UserAlmacen)`, `hasMany(Venta)`, `hasMany(CierreCaja)`

---

### `almacens`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `nombre_almacen` | string | |
| `tipo_almacen` | enum | `almacen`, `punto_venta`, `transportacion` |
| `telefono_almacen` | string | único |
| `correo_almacen` | string nullable | |
| `provincia_almacen` | string nullable | |
| `ciudad_almacen` | string nullable | Usado por `Api/CatalogoPublicoController` |
| `notas_almacen` | text nullable | |
| `nombre_responsable` | string nullable | |
| `apellido_responsable` | string nullable | |
| `carnet_responsable` | string nullable | |
| `telefono_responsable` | string nullable | |
| `mensajero_cuenta_id` | FK nullable | Cuenta CUP para pagos de mensajería |

> No existe columna `activo`/`activa` en `almacens`.

**Relaciones:** `belongsToMany(Producto)` via `almacen_producto`, `hasMany(UserAlmacen)`, `belongsTo(Cuenta, 'mensajero_cuenta_id')`

---

### `almacen_producto` (pivot con datos)
| Campo | Tipo | Descripción |
|---|---|---|
| `almacen_id` | FK | |
| `producto_id` | FK | |
| `cantidad` | int | Stock disponible en este almacén |
| `cantidad_en_transito` | int | Stock reservado en traslado |

---

### `productos`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `nombre_producto` | string | (**no** `nombre`) |
| `marca_producto` | string nullable | (**no** `marca`) |
| `modelo_producto` | string nullable | (**no** `modelo`) |
| `capacidad_producto` | string nullable | (**no** `capacidad`) |
| `color_producto` | string nullable | Agregado 2026-07-15 |
| `descripcion_producto` | text nullable | (**no** `descripcion`) |
| `codigo_producto` | string nullable unique | Código principal del producto |
| `barcode_image` | string nullable | Ruta de la imagen de código de barras generada |
| `imagen_producto` | string nullable | Ruta relativa desde `public/`, default `productos/producto-default.png` |
| `precio_compra_producto` | decimal | Costo en USD — **solo visible para admin/moderador** |
| `categoria_id` | FK | |
| `activo` | boolean | |

> No existen columnas `descripcion_corta` ni `slug` en `productos` pese a mencionarse en otros docs de e-commerce — verificar antes de usarlas en queries.

**Relaciones:** `hasMany(ProductoCodigo)`, `hasMany(AlmacenProducto)`, `hasMany(ProductoVendedor)`, `belongsTo(Categoria)`, `hasMany(CostoHistorial)`, `hasMany(HistorialPrecioCosto)`

---

### `producto_codigos`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `producto_id` | FK | |
| `codigo_barras` | string | Código de barras EAN-128 (**no** `codigo`) |
| `imagen_barcode` | string nullable | Imagen generada del código |
| `cantidad` | int | **Total** del producto con este código, sumando **todos** los almacenes (no dice dónde está cada unidad: eso está en `almacen_producto_codigos`) |
| `es_default` | boolean | Código principal del producto |

### `almacen_producto_codigos` (2026-09-24)
Reparto por almacén de las unidades de cada código de barras. Lo mantiene `CodigoStockService`; el POS solo lo usa cuando la suma de un producto en un almacén **cuadra** con `almacen_producto.cantidad` (si no, se comporta como antes). Llenado inicial: `php artisan codigos:backfill-por-almacen [--dry-run]`.
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `almacen_id` | FK → `almacens` | cascade |
| `producto_codigo_id` | FK → `producto_codigos` | cascade; el producto se deduce del código |
| `cantidad` | unsigned int | Unidades de ESE código en ESE almacén |
| | UNIQUE | `(almacen_id, producto_codigo_id)` |

### `lotes_stock` y `venta_detalle_lotes`
Trazabilidad de costo por lote (desde 2026-09-07; consumo por lote desde 2026-09-20). `lotes_stock`: `codigo` (único), `compra_producto_id`, `movimiento_id`, `lote_origen_id` (traslados), `fusionado_en_lote_id` (fusión), `producto_id`, `almacen_id`, `cantidad` (histórica, fija), `cantidad_disponible` (baja al vender/trasladar), `precio_costo`, `precio_venta` (precio propio opcional). Prefijos de `codigo`: `LOTE-{compra}-{n}` (compra), `LOTE-MOV-{mov}-{n}` (traslado), `AJUSTE-…` / `AJUSTE-LEGADO-…` (corrección de costo / stock anterior a los lotes), `FUSION-{producto}-{almacen}-{n}` (fusión) y **`DEV-{venta}-{línea}`** (unidades devueltas sin lote de origen, al costo al que se vendieron — 2026-09-24). `venta_detalle_lotes` guarda de qué lote(s) salió cada línea de venta (`lote_stock_id` null = parte "sin lote" al costo de la ficha) y permite devolverlas.

---

### `producto_vendedors` — **tabla crítica de precios**
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `producto_id` | FK | |
| `almacen_id` | FK | |
| `precio_venta` | decimal | Precio base del producto en este almacén |
| `comision` | decimal | Ganancia del vendedor por unidad al precio base |
| `user_id` | FK | Vendedor asignado (admin → user_id = 1) |

> Regla: `precio_minimo = precio_venta - comision`. No se puede vender por debajo sin venta especial.
> Una fila única por `(producto_id, almacen_id)`.

---

### `ventas`

#### Campos de estado e identificación
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `user_id` | FK | Vendedor que creó la venta |
| `almacen_id` | FK | |
| `cliente_id` | FK nullable | |
| `estado` | enum | `solicitud_especial`, `pendiente`, `pendiente_precio`, `completada`, `rechazada`, `cancelada` (`pendiente_precio` existe en el ENUM pero no está en uso actualmente en el código) |
| `motivo_anulacion` | string nullable | Solo en ventas canceladas |
| `detalle_anulacion` | string nullable | Razón detallada de anulación |
| `detalles_venta` | text nullable | Notas internas de la venta |
| `nota_venta_especial` | text nullable | Justificación de la venta especial |
| `tipo_venta_especial` | string(20) nullable | `descuento` (algún precio bajo `precio base − comisión`, no bajo el costo; la deciden admin o moderador) o `bajo_costo` (algún precio bajo el costo real; **solo admin**). Null = venta normal. Se fija al crear la venta (2026-09-24) |
| `decision_notificada` | boolean | Si el vendedor ya vio la decisión admin |
| `es_venta_especial` | boolean nullable | Flag de venta especial |

#### Campos financieros
| Campo | Tipo | Descripción |
|---|---|---|
| `total` | decimal | Total cobrado al cliente (productos + mensajero) |
| `total_ganancia` | decimal | Suma de `(precio_venta - costo) × cantidad` |
| `total_comision` | decimal | Comisión total del vendedor en USD |
| `ganancia_perdida_cambiaria` | decimal | Diferencia cambiaria (CUP real vs oficial) |
| `ganancia_real_total` | decimal | `total_ganancia + ganancia_perdida_cambiaria` |
| `total_esperado_usd` | decimal | Costo total + ganancia objetivo |
| `moneda_id` | FK | Moneda principal de la venta |
| `tasa_cambio_principal` | decimal | Tasa al momento de crear |
| `moneda_cobro_id` | FK nullable | Moneda en que se cobró realmente |
| `tasa_aplicada_venta` | decimal nullable | Tasa real aplicada en la venta |
| `monto_diferencia_cambiaria` | decimal nullable | Diferencia por tasa aplicada vs oficial |

#### Campos de mensajero
| Campo | Tipo | Descripción |
|---|---|---|
| `mensajero_monto` | decimal nullable | Monto mensajero en USD equivalente |
| `mensajero_tipo` | enum nullable | `propio` o `externo` |
| `mensajero_cuenta_id` | FK nullable | Cuenta CUP que recibe/paga al mensajero |
| `mensajero_cuenta_origen_id` | FK nullable | Cuenta origen para mensajero externo |
| `mensajero_tasa` | decimal nullable | Tasa referencia (ya no dicta el monto final) |
| `mensajero_monto_final_cup` | decimal nullable | **Monto real en CUP** — editable en Show.tsx |
| `mensajero_moneda_id` | FK nullable | Moneda original del cliente |
| `mensajero_monto_original` | decimal nullable | Monto en moneda original del POS |
| `mensajero_tasa_entrada` | decimal nullable | Tasa usada en POS para convertir a USD |

#### Campos de comisión vendedor
| Campo | Tipo | Descripción |
|---|---|---|
| `comision_cuenta_id` | FK nullable | Cuenta CUP de donde sale la comisión |
| `comision_tasa` | decimal nullable | Tasa CUP/USD para la comisión |

#### Campos de gestor
| Campo | Tipo | Descripción |
|---|---|---|
| `es_venta_gestor` | boolean | XOR con comisión vendedor |
| `gestor_cuenta_id` | FK nullable | Cuenta del gestor |
| `gestor_monto` | decimal nullable | Monto a descontar al gestor |
| `gestor_comentario` | text nullable | |
| `tasa_aplicada_gestor` | decimal nullable | |
| `tasa_aplicada_venta` | decimal nullable | |

---

### `venta_detalles`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `venta_id` | FK | |
| `producto_id` | FK | |
| `producto_codigo_id` | FK nullable | Código de barras específico usado |
| `cantidad` | int | |
| `precio_venta` | decimal | Precio aplicado en esta venta |
| `precio_base` | decimal nullable | Precio base del producto_vendedors al momento de la venta |
| `costo_unitario` | decimal | Costo unitario al momento de la venta (campo `costo_unitario` en migración, no `precio_compra`) |
| `subtotal` | decimal | `precio_venta × cantidad` |
| `ganancia` | decimal | `(precio_venta - costo_unitario) × cantidad` |
| `comision_unitaria` | decimal | Comisión por unidad calculada |

> No existe columna `costo` (costo total). El costo total se calcula inline (`costo_unitario × cantidad`) donde se necesita, no se persiste.

---

### `pago_ventas`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `venta_id` | FK | |
| `cuenta_id` | FK nullable | **XOR** con cliente_id |
| `cliente_id` | FK nullable | **XOR** con cuenta_id |
| `moneda_id` | FK | |
| `tipo` | enum | `efectivo`, `transferencia` |
| `monto` | decimal | Monto en la moneda del pago |
| `tasa_cambio_aplicada` | decimal | |
| `monto_equivalente` | decimal | Monto convertido a moneda principal |

---

### `cierre_cajas`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `user_id` | FK | Vendedor que hizo el cierre |
| `almacen_id` | FK nullable | Almacén del turno |
| `revisor_id` | FK nullable | Admin/moderador que revisó |
| `fecha_apertura` | datetime nullable | Inicio del turno |
| `fecha_cierre` | datetime | Momento del cierre |
| `saldo_inicial` | decimal nullable | Efectivo inicial en caja |
| `saldo_esperado` | decimal | Calculado por el sistema |
| `saldo_contado` | decimal | Ingresado por el vendedor |
| `diferencia` | decimal | `saldo_contado - saldo_esperado` |
| `ventas_efectivo` | decimal nullable | Total ventas cobradas en efectivo |
| `ventas_otros` | decimal nullable | Total ventas cobradas por otros medios |
| `total_gastos` | decimal nullable | Total de gastos del turno |
| `total_devoluciones` | decimal nullable | Total devuelto a clientes |
| `comisiones_gestor` | decimal nullable | Total comisiones de gestores |
| `comisiones_gestor_detalles` | json nullable | Desglose de comisiones gestor |
| `observaciones` | text nullable | |
| `estado` | string nullable | Estado del cierre |
| `detalles` | json nullable | Datos de ventas y operaciones del turno |
| `arqueo_detalles` | json nullable | Conteo físico por denominación |
| `confirmacion_transferencias` | json nullable | Transferencias pendientes de confirmar |
| `snapshot_cuentas` | json | Saldos de cuentas al momento del cierre |
| `snapshot_clientes` | json | Deudas de clientes al momento del cierre |
| `mensajero_total_usd` | decimal | Total mensajero del turno en USD |
| `mensajero_total_cup` | decimal | Total mensajero del turno en CUP |
| `mensajero_count` | int | Número de ventas con mensajero |
| `mensajero_detalles` | json nullable | Detalles por venta `{venta_id, monto_usd, monto_cup, tipo}` |

---

### `cuentas`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `nombre_cuenta` | string | único |
| `tipo` | enum | `caja`, `banco`, `tarjeta`, `efectivo`, `otro` (**no** `tipo_instrumento`) |
| `tipo_cuenta` | enum | `permanentes` (único valor desde 2026-07-28 — `temporales` unificado) |
| `tipo_titular` | enum nullable | `externa`, `personal` (agregado 2026-07-28) |
| `tipo_moneda` | enum | `USD`, `EUR`, `MLC`, `CUP` — campo legado, sigue en `$fillable`, coexiste con `moneda_id` |
| `moneda_id` | FK | |
| `saldo_cuenta` | decimal | Saldo actual |
| `estado` | enum | `activa`, `inactiva` (**no** existe una columna booleana `activa`) |
| `notas_cuenta` | text nullable | |

> ⚠️ `temporales` fue unificado a `permanentes` el 2026-07-28. El campo `deuda` fue eliminado de la tabla en esa misma fecha.

---

### `monedas`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `nombre_moneda` | string | Nombre completo (ej. `Dólar Americano`) |
| `codigo_moneda` | string | Código ISO: `USD`, `CUP`, `MLC` |
| `simbolo_moneda` | string nullable | Símbolo: `$`, `₱`, etc. |
| `tasa_cambio` | decimal | Unidades de esta moneda por 1 USD |
| `principal` | boolean | La moneda base del sistema |
| `activa` | boolean | |
| `commission` | decimal nullable | Comisión por cambio de moneda |

---

### `movimientos` (stock)
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `almacen_origen_id` | FK | |
| `almacen_destino_id` | FK | |
| `user_id` | FK | |
| `estado` | enum | `pendiente_confirmacion`, `en_transito`, `recibido_completo`, `recibido_parcial`, `rechazado`, `cancelado` |
| `notas` | text nullable | |

**Relaciones:** `hasMany(MovimientoDetalle)`, `hasMany(MovimientoSeguimiento)`

---

### `movimientos_financieros`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `user_id` | FK | Quién registró el movimiento |
| `tipo_movimiento_id` | FK | → `tipos_movimiento_financiero` (**no** `tipo_movimiento_financiero_id`) |
| `cuenta_origen_id` | FK nullable | |
| `cliente_origen_id` | FK nullable | |
| `cuenta_destino_id` | FK nullable | |
| `cliente_destino_id` | FK nullable | |
| `proveedor_destino_id` | FK nullable | |
| `monto` | decimal | |
| `moneda` | enum | `USD`, `EUR`, `MLC`, `CUP` — **no** es FK (`moneda_id`), es un enum plano |
| `moneda_origen` / `moneda_destino` | string nullable | Monedas al momento del movimiento (transferencias con conversión) |
| `tasa_cambio_aplicada` | decimal nullable | |
| `descripcion` | text nullable | |
| `fecha_operacion` | datetime nullable | |
| `estado` | enum | `completado`, `pendiente`, `cancelado` |
| `saldo_anterior_origen` | decimal nullable | Snapshot para auditoría |
| `saldo_posterior_origen` | decimal nullable | |
| `saldo_anterior_destino` | decimal nullable | |
| `saldo_posterior_destino` | decimal nullable | |

---

### `clientes`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `nombre_cliente` | string | único |
| `tipo_cliente` | enum | `fisico`, `asociado` (**no** `tipo`) |
| `telefono_cliente` | string | único (**no** `telefono`) |
| `direccion_cliente` | string nullable | |
| `ciudad_cliente` | string nullable | |
| `deuda_pago_cliente` | decimal | Deuda acumulada pendiente |

---

### `compras`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `proveedor_id` | FK | |
| `cuenta_id` | FK nullable | Cuenta desde la que se paga (si aplica) |
| `cliente_id` | FK nullable | Cuando la fuente es un cliente reseller |
| `fecha_compra` | date | |
| `total_compra` | decimal | (**no** `total`) |
| `tipo_compra` | string | `deuda_proveedor`, `pago_cash`, `pago_cliente_fisico` (**no** `tipo_pago`; es `string` libre, no ENUM en DB) |

> No existe columna `almacen_id` en `compras`.

**Relaciones:** `hasMany(CompraProducto)`, `hasMany(CompraPago)`

---

---

## Tablas adicionales (no documentadas anteriormente)

### `cost_distributions`
Distribución de costos de compra entre productos (landed cost).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `compra_id` | FK | Compra asociada |
| `total_gastos` | decimal | Total de gastos a distribuir |
| `metodo` | string | Método de distribución |
| `moneda_id` | FK | Moneda de los gastos |

### `cost_distribution_items`
Cada ítem de la distribución de costos.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `cost_distribution_id` | FK | Distribución padre |
| `producto_id` | FK | Producto |
| `monto` | decimal | Monto asignado |

### `transaccion_cuentas`
Relación M:M entre transacciones y cuentas (soporta múltiples cuentas por movimiento).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `movimiento_financiero_id` | FK | |
| `cuenta_id` | FK | |
| `tipo` | enum | `origen`, `destino` |
| `monto` | decimal | |

### `precio_historials`
Historial de cambios de precios por vendedor.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `producto_vendedor_id` | FK | |
| `precio_anterior` | decimal | |
| `precio_nuevo` | decimal | |
| `user_id` | FK | Quién hizo el cambio |
| `motivo` | string nullable | |

### `historial_precio_costos`
Historial de cambios de costo de productos (con protección por contraseña de admin).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `producto_id` | FK | |
| `costo_anterior` | decimal | |
| `costo_nuevo` | decimal | |
| `user_id` | FK | |
| `motivo` | string nullable | |

### `historial_tasa_cambios`
Historial de cambios de tasa de monedas.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `moneda_id` | FK | |
| `tasa_anterior` | decimal | |
| `tasa_nueva` | decimal | |
| `user_id` | FK | |
| `impacto_cuentas` | json nullable | Impacto financiero del cambio |

### `tipos_movimiento_financiero`
Catálogo de tipos de movimiento financiero. (**Nombre real de la tabla** — no `tipo_movimiento_financieros`; modelo `TipoMovimientoFinanciero` con `protected $table = 'tipos_movimiento_financiero'`.)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | 1=Gasto, 2=Ingreso, 3=Transferencia |
| `nombre` | string | único |
| `efecto` | enum | `ingreso` (suma al saldo) / `egreso` (resta) |
| `descripcion` | text nullable | |

### `destinatario_ventas`
Destinatario/receptor de una venta.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `venta_id` | FK | |
| `nombre` | string | |
| `telefono` | string nullable | |
| `direccion` | text nullable | |

### `user_cuentas`
Asignación de cuentas financieras a usuarios.

| Campo | Tipo | Descripción |
|---|---|---|
| `user_id` | FK | |
| `cuenta_id` | FK | |

### `historial_comparacion_mensuals`
Snapshot mensual de comparación entre periodos.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `user_id` | FK | |
| `datos` | json | Datos del periodo |
| `periodo` | string | Identificador del periodo |

---

## Relaciones importantes

```
users ─── user_almacens ─── almacens
       └── user_cuentas  ─── cuentas

almacens ─── almacen_producto ─── productos
          └── producto_vendedors

ventas ─── venta_detalles ─── productos
        └── pago_ventas ─── cuentas | clientes

cierre_cajas ─── users (el vendedor que cerró)
```

---

## Índice de migraciones recientes (2026)

| Migración | Qué hace |
|---|---|
| `2026_09_24_160325_add_tipo_venta_especial_to_ventas_table` | `ventas.tipo_venta_especial`; clasifica las ventas especiales existentes (bajo_costo si alguna línea se vendió bajo su costo, si no descuento) |
| `2026_09_24_151300_create_almacen_producto_codigos_table` | Reparto de códigos de barras por almacén |
| `2026_07_28_165942_unificar_tipo_cuenta_temporales_a_permanentes` | Unifica `temporales→permanentes`, modifica ENUM a solo `permanentes` |
| `2026_07_28_153937_drop_deuda_from_cuentas` | Elimina columna `deuda` de cuentas |
| `2026_07_28_153931_add_tipo_titular_to_cuentas` | Nuevo campo `tipo_titular` (`externa`/`personal`) |
| `2026_07_15_162640_add_color_producto_to_productos` | Campo `color_producto` en productos |
| `2026_07_01_000001_add_mensajero_snapshot_to_cierre_cajas` | 4 columnas mensajero en cierre_cajas |
| `2026_06_29_000001_add_mensajero_cuenta_origen_to_ventas` | Campo `mensajero_cuenta_origen` |
| `2026_06_28_000001_add_mensajero_monto_final_cup_to_ventas` | Campo `mensajero_monto_final_cup` |
| `2026_06_25_000001_add_mensajero_moneda_fields_to_ventas` | 3 campos de mensajero multi-moneda |
| `2026_06_23_000001_add_comision_cuenta_to_ventas` | Campos `comision_cuenta_id`, `comision_tasa` |
| `2026_06_22_000001_add_mensajero_cuenta_to_almacens` | `mensajero_cuenta_id` en almacens |
| `2026_06_22_000002_add_mensajero_fields_to_ventas` | Campos mensajero base en ventas |
| `2026_06_02_*` | `telegram_chat_id` y `telegram_link_token` en users |
| `2026_05_25_*` | `comision_unitaria` en venta_detalles, `total_comision` en ventas |
| `2026_05_14_*` | Tabla `producto_codigos` |
