# Flujos de Venta — Contexto y Diseño

**Última actualización:** 2026-06-24

---

## Actor principal: El Vendedor

El vendedor gestiona el ciclo completo de una venta normal de principio a fin.
El admin solo interviene en ventas especiales (precio por debajo del mínimo permitido).

---

## Los tres flujos de dinero en una venta

Son independientes entre sí. No se tocan.

```
CLIENTE PAGA: $115 (ejemplo)
     │
     ├─── $105 → FLUJO PRODUCTOS
     │           ├─ costo              → lo que costó el producto
     │           ├─ comisión vendedor  → su ganancia por vender
     │           └─ ganancia agencia   → margen neto de la tienda
     │
     └─── $10  → FLUJO MENSAJERO (pass-through)
                 → va directo a la cuenta del mensajero (propio o externo)
                 → NO es ingreso de la agencia
                 → NO entra en cálculo de comisiones
                 → NO entra en cálculo cambiario
```

---

## Comisiones: vendedor O gestor, nunca ambos

La comisión de los productos va siempre a UNO solo:

```
Si hay gestor  → la comisión completa va al gestor
Si no hay gestor → la comisión completa va al vendedor (punto de venta)
```

El gestor se activa en Show.tsx mediante el modal de destinatario (hay un switch
que convierte al destinatario en gestor). Al activarlo, la comisión deja de ir
al vendedor y pasa al gestor.

### Reglas de comisión por ítem según precio aplicado

```
precio_base      = precio estándar asignado al vendedor
comision_base    = ganancia base del vendedor al precio estándar
precio_minimo    = precio_base - comision_base  (suelo sin venta especial)
```

| Situación | Comisión vendedor |
|---|---|
| `precio = precio_base` | `comision_base` |
| `precio > precio_base` | `comision_base + (precio - precio_base)` |
| `precio_minimo ≤ precio < precio_base` | `max(0, comision_base - descuento)` |
| `precio < precio_minimo` | `0` — requiere venta especial |

La ganancia de la agencia es constante. Todo markup extra que ponga el vendedor
va a su propia comisión, no a la agencia.

---

## Cálculo cambiario (excluye mensajero)

```php
usd_objetivo           = costo_productos + ganancia_productos   // solo productos
monto_esperado_oficial = usd_objetivo × tasa_oficial
monto_real_cobrado     = sum(pagos en moneda_cobro)
monto_real_productos   = monto_real_cobrado - mensajero_en_moneda_cobro
diferencia_cambiaria   = monto_real_productos - monto_esperado_oficial
```

El mensajero se excluye porque es un pass-through y no es ingreso de la agencia.

---

## Qué se gestiona en cada pantalla

### POS — Index.tsx

| Sección | Contenido |
|---|---|
| Almacén / Cliente | Selección inicial |
| Carrito | Productos, cantidades, precios individuales, comisión estimada en tiempo real |
| Mensajero | Checkbox opcional → campo de monto en USD |
| Resumen | Subtotal productos / + Mensajería / Total a cobrar al cliente |
| Pagos | PaymentForm: múltiples métodos y monedas hasta cubrir el total completo |

**El mensajero en el POS es solo el monto (USD).** El tipo (propio/externo),
la cuenta y la tasa se configuran en Show.tsx antes de aprobar.

### Show.tsx — Panel "Distribución de la Venta"

Aparece solo en ventas `pendiente`. Se gestiona ANTES de aprobar.

| Sección | Contenido |
|---|---|
| Resumen de cobro | Productos / Mensajería / Total cliente / Pagos recibidos desglosados |
| Mensajero | Editable: monto ya guardado, configura tipo + cuenta + tasa (conversión USD→CUP) |
| Comisión | Si hay gestor: muestra info del gestor (configurado en modal destinatario). Si no hay gestor: configura cuenta CUP + tasa para el vendedor |

**El mensajero siempre se acumula en CUP:**
- **Propio:** CUP equivalente se acredita en la cuenta CUP del almacén (entra dinero)
- **Externo:** CUP equivalente se debita de una cuenta CUP (sale dinero para pagar al mensajero)

### Show.tsx — Otras secciones

- **Editar precios/pagos:** ajuste de precio por ítem con comisión recalculada en tiempo real
- **Destinatario / Gestor:** modal con switch para convertir receptor en gestor
- **Aprobar:** activo cuando hay destinatario y la distribución está completa
- **Anular:** disponible con motivo

---

## Flujos completos

### Flujo A — Venta simple
```
POS:   productos → pago USD → crear venta
Show:  (opcional) ajustar precio → configurar comisión cuenta → aprobar
```

### Flujo B — Venta con mensajero propio
```
POS:   productos ($100) + mensajero ($10) = total cliente $110
       cliente paga $110 completo (zelle, CUP, efectivo, etc.)

Show:  mensajero: tipo=propio, tasa=500 → 5000 CUP acreditados en cuenta mensajero
       comisión: cuenta MANZANILLO 1 CUP, tasa=500 → X CUP debitados
       aprobar
```

### Flujo C — Venta con mensajero externo
```
POS:   productos + mensajero ($15 USD) = total cliente
       cliente paga todo

Show:  mensajero: tipo=externo, cuenta CUP origen, tasa → 7500 CUP salen de la cuenta
       (ese dinero se le paga en mano al mensajero externo)
       comisión → vendedor o gestor
       aprobar
```

### Flujo D — Venta con gestor
```
POS:   productos → pago → crear venta

Show:  modal destinatario → switch "es gestor" → configurar monto, cuenta, tasa
       La comisión de productos va completa al gestor
       El vendedor no recibe comisión directa
       aprobar
```

### Flujo E — Venta especial (precio bajo mínimo)
```
POS:   vendedor intenta precio bajo el mínimo → sistema activa modo especial
       vendedor escribe justificación → crear solicitud (estado: solicitud_especial)

Show vendedor:  ve "esperando decisión del admin" — sin comisión
Show admin:     análisis de pérdida, costos internos → aprueba o rechaza con nota
Vendedor:       recibe notificación de la decisión
```

---

## Endpoints clave

| Ruta | Método | Descripción |
|---|---|---|
| `/ventas/procesar` | POST | Crear venta — recibe items, total, pagos, mensajero_monto |
| `/ventas/{venta}/distribucion` | POST | Guardar mensajero (tipo/cuenta/tasa) y/o comisión vendedor |
| `/ventas/{venta}/destinatario` | POST | Guardar destinatario o gestor |
| `/ventas/{venta}/aprobar` | POST | Aprobar venta pendiente — ejecuta todos los movimientos |
| `/ventas/{venta}/editar-pendiente` | POST | Editar precios/pagos de venta pendiente |
| `/ventas/{venta}/anular` | POST | Anular venta con motivo |

---

## Estado actual (2026-06-24)

### Implementado y funcional

- **POS:** mensajero monto (toggle USD) se suma al total → cliente paga todo completo
- **POS:** comisión estimada por ítem en tiempo real al cambiar precio
- **Show:** panel unificado "Distribución" con resumen de cobro + mensajero + comisión
- **Show:** mensajero configurable (tipo, cuenta, tasa) → guarda vía `guardarDistribucion`
- **Show:** comisión va a vendedor (cuenta CUP + tasa) O a gestor según switch destinatario
- **Show:** modal edición con comisión recalculada en tiempo real por ítem
- **Backend:** `guardarDistribucion` — guarda distribución sin afectar stock ni cuentas hasta aprobar
- **Backend:** `monto_diferencia_cambiaria` excluye mensajero correctamente
- **Backend:** comisión fórmula corregida — precio > precio_base suma markup completo
- **Migración:** columnas `comision_cuenta_id` y `comision_tasa` en tabla `ventas`

### Pendiente / No tocado

- Separar `ganancia_real_total` del cálculo (actualmente muestra 0 en algunos casos)
- Mover configuración de cuenta mensajero del almacén de Almacenes/Edit a Empleados/Edit
- Filtrar cuentas CUP-only en `AlmacenController@edit`
