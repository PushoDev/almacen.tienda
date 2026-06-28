# Contexto de Ventas — Estado Actual del Código

**Creado:** 2026-06-28
**Referencia:** Ver `flujos-venta.md` para diseño y flujos, `pendiente-cierre-caja.md` para cierre.

---

## Archivos involucrados en el sistema de ventas

| Archivo | Rol |
|---|---|
| `app/Http/Controllers/VentaController.php` | Controlador principal (2033 líneas) |
| `app/Models/Venta.php` | Modelo principal |
| `app/Models/VentaDetalle.php` | Ítem por producto |
| `app/Models/PagoVenta.php` | Pago individual (puede ir a cuenta o cliente) |
| `app/Models/AlmacenProducto.php` | Stock por almacén |
| `app/Models/HistorialStock.php` | Auditoría de movimientos de stock |
| `app/Models/ProductoCodigo.php` | Códigos de barras por producto |
| `app/Models/Cuenta.php` | Cuenta financiera (con moneda, tipo, saldo) |
| `app/Models/Cliente.php` | Cliente (físico o asociado, con deuda) |
| `app/Notifications/VentaCreadaNotification.php` | Notificación venta normal |
| `app/Notifications/VentaEspecialSolicitudNotification.php` | Notificación solicitud especial |
| `app/Notifications/VentaEspecialDecisionNotification.php` | Notificación decisión admin |
| `resources/js/pages/Vendor/Index.tsx` | POS — punto de venta |
| `resources/js/pages/Vendor/Show.tsx` | Detalle y gestión de venta pendiente |
| `resources/js/pages/Vendor/Listado.tsx` | Listado de ventas con filtros |
| `resources/js/pages/Vendor/ReporteDiario.tsx` | Reporte diario |
| `database/tables/producto_vendedors` | Precios y comisiones por almacén/producto |

---

## Estados posibles de una venta

```
pendiente → completada
pendiente → cancelada
solicitud_especial → pendiente (si admin aprueba)
solicitud_especial → rechazada (si admin rechaza)
completada → cancelada
```

---

## Mapa de métodos del controlador

### Endpoints de datos (API JSON)

| Método | Ruta aproximada | Qué devuelve |
|---|---|---|
| `getAlmacenes()` | GET | Almacenes accesibles + mensajero_cuenta del almacén |
| `getProductosPorAlmacen($id)` | GET | Productos con stock, precio_base, comision del almacén |
| `getClientes()` | GET | id + nombre_cliente |
| `getCuentas()` | GET | Cuentas accesibles con moneda y saldo |
| `getCuentasFiltradas()` | GET | Cuentas filtradas por moneda_id + método pago (efectivo/tarjeta) |
| `getCuentasParaGestor()` | GET | Cuentas con tipo (efectivo/tarjeta) para selector de gestor |
| `getMonedas()` | GET | Monedas activas con tasa_cambio |
| `storeClienteForVenta()` | POST | Crea cliente o devuelve existente (busca por nombre o teléfono) |
| `getClientesFisicosParaPago()` | GET | Clientes físicos con deuda actual |

### Endpoints de vistas (Inertia)

| Método | Vista |
|---|---|
| `index()` | `Vendor/Index` — pasa monedas, cuentas y almacenes del usuario |
| `show($id)` | `Vendor/Show` — carga venta completa con todas las relaciones |
| `listadoVentas()` | `Vendor/Listado` — paginado × 15, filtros por estado/almacén/fecha |
| `showReporteDiarioView()` | `Vendor/ReporteDiario` |

### Endpoints de procesamiento

| Método | Qué hace |
|---|---|
| `procesarVenta()` | Crea venta, descuenta stock inmediatamente, calcula comisión, crea pagos |
| `guardarDestinatario()` | Guarda receptor + configura gestor (solo en estado `pendiente`) |
| `guardarDistribucion()` | Configura mensajero (tipo/cuenta/tasa) y/o comisión vendedor |
| `editarVentaPendiente()` | Reemplaza pagos completo + recalcula precios/comisiones si vienen items |
| `aprobarVenta()` | Ejecuta todos los movimientos financieros → estado `completada` |
| `anularVenta()` | Revierte stock siempre; revierte financiero solo si estaba `completada` |
| `aprobarSolicitudEspecial()` | Admin: especial → pendiente + notifica vendedor |
| `rechazarSolicitudEspecial()` | Admin: revierte stock + estado rechazada + notifica vendedor |
| `marcarDecisionNotificada()` | Vendedor confirma que vio el veredicto |

---

## Tabla `producto_vendedors` — precios por almacén

Es la fuente de `precio_base` y `comision` por producto en cada almacén.
Se consulta en `procesarVenta`, `editarVentaPendiente`, y `getProductosPorAlmacen`.

```
almacen_id | producto_id | precio_venta (= precio_base) | comision
```

Si un producto no tiene fila en esta tabla → el almacén se bloquea con error `almacen_incompleto`.

---

## Reglas de precio y comisión

```
precio_minimo    = precio_base - comision_base
precio_venta     >= precio_minimo          → venta normal
precio_venta     < precio_minimo           → requiere venta especial (bloqueo)
precio_venta     < precio_compra_producto  → requiere venta especial

comision_unitaria:
  venta especial                  → 0
  precio_venta >= precio_base     → comision_base + (precio_venta - precio_base)
  precio_venta <  precio_base     → max(0, comision_base - (precio_base - precio_venta))
```

La ganancia de la agencia es siempre `(precio_venta - precio_compra) * cantidad - comision_unitaria * cantidad`.

---

## Mensajero — campos en `ventas`

| Campo | Cuándo se llena |
|---|---|
| `mensajero_monto` | POS — monto en USD |
| `mensajero_moneda_id` | POS — moneda en que el cliente paga el envío |
| `mensajero_monto_original` | POS — monto en moneda original (si no es USD) |
| `mensajero_tasa_entrada` | POS — tasa usada para calcular el equivalente USD |
| `mensajero_tipo` | Show — `propio` o `externo` |
| `mensajero_cuenta_id` | Show — cuenta que recibe/paga el mensajero |
| `mensajero_tasa` | Show — tasa CUP para el movimiento de cuenta al aprobar |

**Lógica al aprobar:**
```
si mensajero_moneda != USD y monto_original > 0  →  usa monto_original directamente
si mensajero_tasa > 0                            →  mensajero_monto × mensajero_tasa
sino                                             →  mensajero_monto tal cual
```

**Efecto en cuenta:**
- `propio` → `cuentaMensajero.saldo += montoFinal`
- `externo` → `cuentaMensajero.saldo -= montoFinal`

**El mensajero se excluye del total USD de productos y del cálculo cambiario.**

---

## Gestor — campos en `ventas`

| Campo | Descripción |
|---|---|
| `es_venta_gestor` | Boolean — activa el modo gestor (XOR con comisión vendedor) |
| `gestor_cuenta_id` | Cuenta de donde se descuenta la comisión al gestor |
| `gestor_monto` | Monto a descontar (en moneda de la cuenta del gestor) |
| `gestor_comentario` | Nota libre |
| `tasa_aplicada_gestor` | Tasa para calcular `gestor_monto_usd = gestor_monto / tasa` |
| `tasa_aplicada_venta` | Tasa real a la que se realizó la venta (puede diferir de oficial) |

Se puede configurar en `procesarVenta` (POS) o en `guardarDestinatario` (Show).
En ventas especiales: gestor siempre se fuerza a null/0.

**Al aprobar:** `cuentaGestor.saldo -= gestor_monto` (requiere saldo suficiente → excepción si no alcanza).

---

## Comisión vendedor — campos en `ventas`

| Campo | Descripción |
|---|---|
| `comision_cuenta_id` | Cuenta CUP de donde sale la comisión |
| `comision_tasa` | Tasa CUP/USD |
| `total_comision` | Total en USD calculado al crear la venta |

**Al aprobar:** `cuentaComision.saldo -= total_comision × comision_tasa` (en CUP).
Solo aplica si `!es_venta_gestor && total_comision > 0 && comision_cuenta_id && comision_tasa > 0`.

---

## Pagos (`pago_ventas`)

Cada pago tiene destino XOR:
- `cuenta_id` → al aprobar: `cuenta.saldo += pago.monto` (si monedas coinciden)
- `cliente_id` → al aprobar: `cliente.deuda_pago_cliente += pago.monto` (solo clientes físicos)

No pueden tener ambos (validado en backend con excepción).
Regalos (`total = 0`) pueden tener `pagos = []` vacío.

---

## Orden de ejecución en `aprobarVenta`

```
1. estado → completada
2. Procesar pagos:
   - cliente físico → incrementa deuda_pago_cliente
   - cuenta → incrementa saldo_cuenta (si moneda coincide)
3. Calcular ganancia_perdida_cambiaria (solo sobre CUP, sin mensajero)
4. Actualizar ganancia_perdida_cambiaria y ganancia_real_total
5. Descuento gestor (si es_venta_gestor && gestor_cuenta_id && gestor_monto > 0)
6. Mensajero (si mensajero_monto > 0 && mensajero_cuenta_id)
7. Comisión vendedor (si !es_venta_gestor && comision_cuenta_id && comision_tasa > 0)
```

---

## Reversión en `anularVenta`

```
SIEMPRE (pendiente o completada):
  - almacen_producto.cantidad += detalle.cantidad  (por cada detalle)
  - producto_codigo.cantidad += detalle.cantidad    (al código exacto, o default si no hay)
  - HistorialStock tipo 'venta_anulada'

SOLO SI estaba completada:
  - cliente.deuda_pago_cliente -= pago.monto       (pagos a clientes)
  - cuenta.saldo -= pago.monto                     (pagos a cuentas)
  - gestorCuenta.saldo += gestor_monto             (revertir gestor)
  - mensajeroCuenta.saldo +=/-= montoFinal         (inverso al tipo propio/externo)
  - comisionCuenta.saldo += total_comision × tasa  (revertir comisión vendedor)
```

---

## Bugs pendientes conocidos (de flujos-venta.md)

| ID | Ubicación | Descripción | Impacto |
|---|---|---|---|
| B1 | `guardarDistribucion` | Devuelve `saldo_actual` en respuesta pero el campo es `saldo_cuenta` | UI muestra dato incorrecto |
| B2 | `aprobarVenta` / `anularVenta` | Falta guardia XOR — la comisión vendedor podría ejecutarse aunque haya gestor | Doble débito potencial |
| B3 | `procesarVenta` | `foreach ($validatedData['pagos'] as $pago)` sin `?? []` en la primera iteración (línea ~810) | Crash si pagos es null |

---

## Features pendientes conocidas (de flujos-venta.md)

| ID | Pantalla | Descripción |
|---|---|---|
| F1 | Show.tsx | Selector XOR visual `[Punto de Venta] / [Gestor]` en panel distribución |
| F2 | Show.tsx | Display mensajero multi-moneda (interface TypeScript incompleta) |
| F3 | Show.tsx | Form edición mensajero en Show — solo acepta USD/CUP, falta soporte multi-moneda |

---

## Notas rápidas para cambios

- **Validar precios:** siempre consultar `producto_vendedors` (tabla `preciosAlmacen`) — no confiar en `precio_venta` del frontend
- **Gestor y comisión son XOR:** si se activa uno, el otro debe limpiarse en DB
- **Mensajero es pass-through:** excluir siempre de cálculos de ganancia y cambiario
- **Stock se descuenta al crear** (no al aprobar) — reversión siempre aplica sin importar el estado
- **Pagos a clientes no modifican cuentas** — solo incrementan deuda del cliente
- **Los movimientos financieros (cuentas/deudas) solo ocurren al aprobar**, no al crear
