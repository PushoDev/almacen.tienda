# Contexto de Ventas — Estado Actual del Código

**Creado:** 2026-06-28
**Última actualización:** 2026-07-30
**Referencia:** Ver `flujos-venta.md` para diseño y flujos, `pendiente-cierre-caja.md` para cierre.

---

## Archivos involucrados en el sistema de ventas

| Archivo | Rol |
|---|---|
| `app/Http/Controllers/VentaController.php` | Controlador principal |
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
| `resources/js/pages/Vendor/DetalleCierre.tsx` | Desglose de cierre por venta |
| `resources/js/pages/Vendor/Cierre.tsx` | Vista de cierre individual |
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
| `guardarDistribucion()` | Configura mensajero (tipo/cuenta/monto_final_cup) y/o comisión vendedor |
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

El mensajero es el cobro por entrega a domicilio. El cliente lo paga en el POS junto a los
productos. En Show se configura a quién se le paga y cuánto exactamente.

| Campo | Cuándo se llena | Descripción |
|---|---|---|
| `mensajero_monto` | POS | Equivalente en USD del cobro al cliente |
| `mensajero_moneda_id` | POS | Moneda en que el cliente pagó el envío |
| `mensajero_monto_original` | POS | Monto en moneda original (referencia inmutable del POS) |
| `mensajero_tasa_entrada` | POS | Tasa usada para calcular el equivalente USD |
| `mensajero_tipo` | Show | `propio` o `externo` |
| `mensajero_cuenta_id` | Show | Cuenta CUP que recibe o paga al mensajero |
| `mensajero_tasa` | Show | Tasa CUP/USD (referencia — ya no dicta el monto final) |
| `mensajero_monto_final_cup` | Show | **Monto real en CUP que se mueve en la cuenta** (editable, permite premio/sanción) |

### Reglas del mensajero

- El cliente **siempre paga en CUP** → se convierte a USD por tasa para acumular al total
- La empresa **siempre paga al mensajero en CUP** → la cuenta en Show es siempre CUP
- `monto_original` es la referencia del POS — **no se modifica desde Show**
- `monto_final_cup` es el monto editable — puede ser mayor (premio) o menor (sanción) que `monto_original`
- Si `monto_final_cup` no está configurado, el backend usa `monto_original` como fallback

**Efecto en cuenta al aprobar:**
- `propio` → `cuentaMensajero.saldo += monto_final_cup`
- `externo` → `cuentaMensajero.saldo -= monto_final_cup`

**El mensajero se excluye del total USD de productos y del cálculo cambiario.**

### Validaciones en `aprobarVenta` (añadidas 2026-06-28)

```
Si mensajero_monto > 0 y mensajero_cuenta_id es null  → bloquea con error
Si mensajero_monto > 0 y mensajero_tipo es null       → bloquea con error
```

Antes de esta corrección el movimiento se saltaba silenciosamente si faltaban estos campos.

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
0. Validaciones previas (ANTES de la transacción):
   - estado === 'pendiente'
   - tiene destinatario
   - si mensajero_monto > 0: debe tener mensajero_cuenta_id y mensajero_tipo

1. estado → completada
2. Procesar pagos:
   - cliente físico → incrementa deuda_pago_cliente
   - cuenta → incrementa saldo_cuenta (si moneda coincide)
3. Calcular ganancia_perdida_cambiaria (solo sobre CUP, sin mensajero)
4. Actualizar ganancia_perdida_cambiaria y ganancia_real_total
5. Descuento gestor (si es_venta_gestor && gestor_cuenta_id && gestor_monto > 0)
6. Mensajero (si mensajero_monto > 0 && mensajero_cuenta_id):
   montoFinal = mensajero_monto_final_cup ?? mensajero_monto_original
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
    donde montoFinal = mensajero_monto_final_cup ?? mensajero_monto_original
  - comisionCuenta.saldo += total_comision × tasa  (revertir comisión vendedor)
```

---

## Bugs resueltos

| ID | Ubicación | Descripción | Estado |
|---|---|---|---|
| B_mensajero_skip | `aprobarVenta` | Movimiento del mensajero se saltaba silenciosamente si faltaba cuenta o tipo | ✅ Resuelto — bloquea con error claro |
| B_mensajero_tasa | `aprobarVenta` / Show.tsx | La tasa en Show no tenía efecto real cuando moneda era CUP | ✅ Resuelto — reemplazado por `monto_final_cup` editable |
| **B1** | `guardarDistribucion` | Devuelve `saldo_actual` pero el campo es `saldo_cuenta` | ✅ Resuelto — ahora retorna `saldo_disponible` desde `saldo_cuenta` |
| **B2** | `aprobarVenta` | Falta guardia XOR en comisión vendedor | ✅ Resuelto — `if (!$venta->es_venta_gestor && ...)` implementado |
| **B3** | `procesarVenta` | `foreach ($pagos)` sin `?? []` | ✅ Resuelto — `foreach ($validatedData['pagos'] ?? [] as $pago)` |

## Bugs activos pendientes

| ID | Ubicación | Descripción | Impacto |
|---|---|---|---|
| B4 | `AlmacenController@edit` | Selector cuenta mensajero mezcla USD/CUP/MLC | Puede romper lógica mensajero |
| B5 | Config mensajero | Está en `Almacenes/Edit`, debería estar en `Empleados/Edit` | UX confusa |

---

## Features pendientes conocidas

| ID | Pantalla | Descripción | Prioridad |
|---|---|---|---|
| F1 | Show.tsx | Selector XOR visual `[Punto de Venta] / [Gestor]` en panel distribución | Alta |
| F2 | Show.tsx | Display mensajero multi-moneda completo (soporte cualquier moneda) | Media |
| F4 | — | `ganancia_real_total` muestra 0 en algunos casos | Media |
| F5 | Productos/Index | Selector de paginación (10/15/25/50/100) | Baja |

---

## Cierre de Caja — Archivos y estructura (actualizado 2026-07-30)

| Archivo | Rol |
|---|---|
| `app/Http/Controllers/CierreCajaController.php` | Controlador del cierre — `create()`, `store()`, `show()`, `obtenerDetallesCierre()`, `aprobar()` (~1,943 líneas — creció desde la última edición de este doc con el desglose de productos por comisión y el campo `moneda`) |
| `app/Models/CierreCaja.php` | Modelo — snapshot financiero del turno |
| `resources/js/pages/Cierres/Create.tsx` | Vista de creación — preview en tiempo real |
| `resources/js/pages/Cierres/Show.tsx` | Vista histórica de cierre guardado |
| `database/migrations/2026_07_01_000001_add_mensajero_snapshot_to_cierre_cajas.php` | Añade 4 columnas mensajero al cierre |

### Patrón snapshot

El cierre es un documento histórico — los datos se guardan al momento del `store()` y no se recalculan.
Campos snapshot en `cierre_cajas`: `snapshot_cuentas`, `snapshot_clientes`, `mensajero_detalles`,
`mensajero_total_usd`, `mensajero_total_cup`, `mensajero_count`.

En `show()` se usa snapshot si existe; si no (cierres legacy), fallback con recálculo desde DB.

### Secciones del payload `create()` / `show()`

| Campo | Descripción |
|---|---|
| `ventas_brutas_usd` | Suma `total_esperado_usd` de ventas completadas del turno |
| `comisiones_pv_cup` | `SUM(total_comision * comision_tasa)` — comisión vendedor en CUP |
| `comisiones_gestor_cup` | Suma de `gestor_monto` de cuentas CUP |
| `comisiones_total_cup` | PV + Gestor |
| `comisiones_pv_detalles` | Array `{venta_id, comision_usd, comision_cup, fecha}` por venta |
| `mensajero_detalles` | Array `{venta_id, monto_usd, monto_cup, tipo}` por venta |
| `mensajero_total_usd` / `_cup` / `_count` | Totales del turno |

### Modal "Detalles de Venta" (Por dónde entraron → eye icon)

Muestra pagos, productos, y si la venta tuvo mensajero: sección azul "MENSAJERÍA"
con CUP + equiv. USD, colocada antes del bloque "Total Venta".

El eye icon está en `Create.tsx` y `Show.tsx`. En Show.tsx, `getOperacionesPorVenta`
usa `cierre.detalles` directamente (no `calculos` — se inicializa más tarde con useMemo).

---

## Widget de tasas de cambio (TasasFlotante)

Componente global añadido el 2026-06-28 para que vendedores y admin consulten las tasas
en cualquier pantalla sin salir del flujo de trabajo.

| Archivo | Rol |
|---|---|
| `resources/js/components/TasasFlotante.tsx` | Componente flotante |
| `app/Http/Middleware/HandleInertiaRequests.php` | Comparte `tasas` globalmente via Inertia |
| `resources/js/types/index.d.ts` | Interfaz `TasaMoneda` + campo `tasas` en `SharedData` |
| `resources/js/layouts/app/app-sidebar-layout.tsx` | Inyectado aquí |
| `resources/js/layouts/app/app-header-layout.tsx` | Inyectado aquí |

**Comportamiento:**
- Botón redondo fijo abajo a la derecha en todas las páginas del layout principal
- Click → panel con todas las monedas activas ordenadas (principal primero)
- Muestra: código de moneda + cuántas unidades equivalen a 1 USD
- La moneda base aparece marcada en azul con etiqueta `base`
- Solo lectura — no permite editar tasas desde aquí
- Las tasas vienen en cada respuesta Inertia (sin llamadas adicionales al servidor)
- Soporta modo claro y oscuro

**Por qué es relevante para ventas:**
- El vendedor necesita la tasa CUP al configurar el mensajero en Show
- Al cobrar pagos en múltiples monedas en el POS, la tasa determina el equivalente USD
- El cálculo cambiario al aprobar usa la tasa oficial del sistema

---

## Notas rápidas para cambios

- **Validar precios:** siempre consultar `producto_vendedors` (tabla `preciosAlmacen`) — no confiar en `precio_venta` del frontend
- **Gestor y comisión son XOR:** si se activa uno, el otro debe limpiarse en DB
- **Mensajero es pass-through:** excluir siempre de cálculos de ganancia y cambiario
- **Stock se descuenta al crear** (no al aprobar) — reversión siempre aplica sin importar el estado
- **Pagos a clientes no modifican cuentas** — solo incrementan deuda del cliente
- **Los movimientos financieros (cuentas/deudas) solo ocurren al aprobar**, no al crear
- **`monto_final_cup` es la fuente de verdad del mensajero** — no `monto_original` ni `tasa`
- **La misma cuenta CUP puede recibir y pagar en la misma aprobación** (pago cliente + mensajero + comisión) — todo ocurre en una sola `DB::transaction()` de forma secuencial
