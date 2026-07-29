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
| `tipo` | enum | `almacen`, `punto_venta`, `transportacion` |
| `activo` | boolean | |
| `responsable_nombre` | string nullable | |
| `responsable_apellido` | string nullable | |
| `responsable_carnet` | string nullable | |
| `responsable_telefono` | string nullable | |
| `mensajero_cuenta_id` | FK nullable | Cuenta CUP para pagos de mensajería |

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
| `nombre` | string | |
| `marca` | string nullable | |
| `modelo` | string nullable | |
| `capacidad` | string nullable | |
| `descripcion` | text nullable | |
| `imagen` | string nullable | Ruta relativa desde `public/` |
| `precio_compra_producto` | decimal | Costo en USD — **solo visible para admin/moderador** |
| `categoria_id` | FK | |
| `activo` | boolean | |

**Relaciones:** `hasMany(ProductoCodigo)`, `hasMany(AlmacenProducto)`, `hasMany(ProductoVendedor)`, `belongsTo(Categoria)`

---

### `producto_codigos`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `producto_id` | FK | |
| `codigo` | string | Código de barras EAN-128 |
| `cantidad` | int | Unidades que representa este código |
| `es_default` | boolean | Código principal del producto |

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
| `estado` | enum | `solicitud_especial`, `pendiente`, `completada`, `rechazada`, `cancelada` |
| `motivo_anulacion` | string nullable | Solo en ventas canceladas |
| `nota_venta_especial` | text nullable | Justificación de la venta especial |
| `decision_notificada` | boolean | Si el vendedor ya vio la decisión admin |

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

#### Campos de mensajero
| Campo | Tipo | Descripción |
|---|---|---|
| `mensajero_monto` | decimal nullable | Monto mensajero en USD equivalente |
| `mensajero_tipo` | enum nullable | `propio` o `externo` |
| `mensajero_cuenta_id` | FK nullable | Cuenta CUP que recibe/paga al mensajero |
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
| `precio_compra` | decimal | Costo unitario al momento de la venta |
| `subtotal` | decimal | `precio_venta × cantidad` |
| `ganancia` | decimal | `(precio_venta - precio_compra) × cantidad` |
| `comision_unitaria` | decimal | Comisión por unidad calculada |

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
| `saldo_esperado` | decimal | Calculado por el sistema |
| `saldo_contado` | decimal | Ingresado por el vendedor |
| `diferencia` | decimal | `saldo_contado - saldo_esperado` |
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
| `nombre_cuenta` | string | |
| `tipo_instrumento` | enum | `tarjeta`, `efectivo`, `otro` |
| `tipo_cuenta` | enum | `permanentes` (único valor desde 2026-07-28 — `temporales` unificado) |
| `tipo_titular` | enum nullable | `externa`, `personal` (agregado 2026-07-28) |
| `moneda_id` | FK | |
| `saldo_cuenta` | decimal | Saldo actual |
| `activa` | boolean | |

> ⚠️ `temporales` fue unificado a `permanentes` el 2026-07-28. El campo `deuda` fue eliminado de la tabla en esa misma fecha.

---

### `monedas`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `nombre` | string | |
| `codigo_moneda` | string | Ej: `USD`, `CUP`, `MLC` |
| `tasa_cambio` | decimal | Unidades de esta moneda por 1 USD |
| `principal` | boolean | La moneda base del sistema |
| `activa` | boolean | |

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
| `tipo_movimiento_financiero_id` | FK | 1=Gasto, 2=Ingreso, 3=Transferencia |
| `cuenta_origen_id` | FK nullable | |
| `cuenta_destino_id` | FK nullable | |
| `monto` | decimal | |
| `moneda_id` | FK | |
| `descripcion` | text nullable | |
| `saldo_anterior_origen` | decimal nullable | Snapshot para auditoría |
| `saldo_posterior_origen` | decimal nullable | |
| `saldo_anterior_destino` | decimal nullable | |
| `saldo_posterior_destino` | decimal nullable | |

---

### `clientes`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `nombre_cliente` | string | |
| `tipo` | enum | `fisico`, `asociado` |
| `telefono` | string nullable | |
| `deuda_pago_cliente` | decimal | Deuda acumulada pendiente |

---

### `compras`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | PK | |
| `almacen_id` | FK | |
| `proveedor_id` | FK nullable | |
| `cliente_id` | FK nullable | Cuando la fuente es un cliente reseller |
| `tipo_pago` | enum | `deuda_proveedor`, `pago_cash` |
| `total` | decimal | |

**Relaciones:** `hasMany(CompraProducto)`, `hasMany(CompraPago)`

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
