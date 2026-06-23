# Flujos de Ventas — Documentación de Sistema

> Contexto: Sistema de gestión de ventas para negocio cubano.
> Maneja múltiples monedas (USD, CUP, MLC), gestores/intermediarios,
> destinatarios en Cuba y clientes físicos con deuda diferida.

---

## Estados posibles de una Venta

| Estado | Descripción |
|--------|-------------|
| `solicitud_especial` | Venta especial esperando aprobación del admin |
| `pendiente` | Venta creada, esperando receptor y aprobación final |
| `completada` | Venta aprobada, stock y saldos aplicados |
| `rechazada` | Solicitud especial rechazada por el admin (terminal) |
| `cancelada` | Venta anulada (terminal) |

---

## Mapa de transiciones de estado

```
              [solicitud_especial]
             /         |          \
    rechazar()    aprobar()    anular()
         |             |             |
   [rechazada]   [pendiente]   [cancelada]
                /     |      \
           editar()   |    anular()
                      |         |
             guardar()      [cancelada]
             destinatario
                      |
               aprobar()
                      |
               [completada]
                      |
                  anular()
                      |
               [cancelada]
```

---

## Flujo 1: Venta Normal

**Quién lo ejecuta:** Vendedor (crea y agrega receptor) + Admin (aprueba final)

```
procesarVenta() ──► [pendiente]
                         │
                  guardarDestinatario()
                  (receptor + gestor opcional)
                         │
                   aprobarVenta() ──► [completada]
```

**Detalles clave:**
- Stock se descuenta **al crear** (reserva inmediata), no al aprobar
- Los saldos de cuentas y deudas de clientes se aplican **solo al aprobar**
- El vendedor puede bajar el precio dentro del margen de su comisión sin intervención del admin
- Notifica a admins/moderadores con `VentaCreadaNotification` al crear
- El receptor (destinatario) es obligatorio antes de poder aprobar

---

## Flujo 2: Venta Especial

**Cuándo aplica:** Precio por debajo del mínimo permitido (precio_base - comisión), total $0 (regalo/rotura/rifa)

**Quién lo ejecuta:** Vendedor crea → Admin decide → si aprobada, sigue flujo normal

```
procesarVenta(es_venta_especial=true) ──► [solicitud_especial]
                                               │
                    ┌──────────────────────────┤ Admin decide
                    │                          │
             rechazarSolicitud()        aprobarSolicitud()
                    │                          │
             [rechazada]              [pendiente]
             + revierte stock         + notifica vendedor
                                               │
                                      guardarDestinatario()
                                               │
                                        aprobarVenta() ──► [completada]
```

**Detalles clave:**
- Comisión del vendedor = 0 (forzado)
- Gestor = false forzado al momento de crear
- Stock se reserva igual que en venta normal
- Notifica admins con `VentaEspecialSolicitudNotification`
- Vendedor recibe notificación de la decisión (`VentaEspecialDecisionNotification`)
- Vendedor ve el veredicto en un AlertDialog (auto-abre si `decision_notificada = false`)
- Total $0 = regalo → no se requieren pagos

---

## Flujo 3: Venta con Gestor (overlay)

**Qué es:** Un intermediario/broker cuya cuenta se debita al completar la venta.

**Se puede activar en:**
- `procesarVenta()` — para ventas normales
- `guardarDestinatario()` — cuando la venta ya está en `pendiente` (incluso si era especial ya aprobada)

```
Al aprobarVenta():
  └─ gestor_monto se DESCUENTA de gestor_cuenta
     (valida que haya saldo suficiente antes de descontar)

Al anularVenta() si era completada:
  └─ gestor_monto se RESTAURA a gestor_cuenta
```

**Campos involucrados:**
- `es_venta_gestor` (boolean)
- `gestor_monto` — monto a descontar de la cuenta del gestor
- `gestor_cuenta_id` — cuenta del gestor a debitar
- `gestor_comentario` — nota opcional
- `tasa_aplicada_gestor` — tasa de cambio aplicada al gestor
- `tasa_aplicada_venta` — tasa de cambio de la venta

---

## Flujo 4: Pago a Cliente (deuda diferida, overlay)

**Qué es:** En lugar de ir el pago a una cuenta del sistema, se registra como deuda del cliente físico.

```
procesarVenta() con pago.cliente_id (en lugar de cuenta_id)
     │
aprobarVenta():
     └─ incrementa deuda_pago_cliente del cliente físico

anularVenta() si era completada:
     └─ decrementa deuda_pago_cliente del cliente físico
```

**Regla XOR estricta en cada pago:**
- Cada pago tiene `cuenta_id` OR `cliente_id`
- Nunca ambos al mismo tiempo
- Nunca ninguno de los dos

---

## Flujo 5: Edición de Venta Pendiente (paso opcional)

**Cuándo aplica:** Cuando se necesita corregir precios o pagos antes de aprobar.

```
[pendiente]
     │
editarVentaPendiente()
     ├─ Actualiza precios de items
     │    └─ recalcula subtotal, ganancia y comisión por item
     │    └─ recalcula total, total_ganancia, total_comision de la venta
     └─ Reemplaza TODOS los pagos (borra y recrea)
     │
[sigue en pendiente] ──► continúa flujo normal
```

**Restricciones:**
- Solo funciona en estado `pendiente` (no en `solicitud_especial`)
- Valida precio mínimo igual que `procesarVenta`
- No actualiza `total_esperado_usd` ni `monto_diferencia_cambiaria`

---

## Flujo 6: Anulación

**Desde qué estados:** Cualquier estado excepto `cancelada`

```
anularVenta() requiere: motivo_anulacion
     │
     ├─ SIEMPRE: revierte stock + códigos de barras + registra historial
     │
     └─ Solo si era [completada]:
          ├─ decrementa saldo_cuenta por cada pago con cuenta_id
          ├─ decrementa deuda_pago_cliente por cada pago con cliente_id
          ├─ restaura gestor_monto a gestor_cuenta
          └─ revierte impacto del mensajero (ver Flujo 7)
```

**Motivos de anulación disponibles:**
`error_precio` | `solicitud_cliente` | `producto_defectuoso` | `duplicado_venta` | `error_pedido` | `otros`

> ⚠️ **Nota:** `anularVenta` acepta ventas en estado `rechazada`, pero ese estado
> ya tuvo su stock revertido por `rechazarSolicitudEspecial`. Si la UI permite
> anular una venta rechazada, el stock se revertiría dos veces. Verificar acceso en rutas.

---

## Flujo 7: Mensajero — Entrega a Domicilio (overlay, PENDIENTE DE IMPLEMENTAR)

**Qué es:** Servicio de entrega del producto al hogar del destinatario en Cuba.
El mensajero NO es una persona registrada en el sistema — es cualquier persona de confianza.
El costo lo paga el cliente y se suma al total de la venta.

**Es completamente opcional** — los campos deben estar preparados pero no activados por defecto.

### Regla fundamental

```
Total cliente  =  subtotal productos  +  mensajero_monto

Comisión vendedor  →  calculada solo sobre subtotal productos  (no toca mensajero)
Gestor             →  su monto independiente                    (no toca mensajero)
Mensajero          →  su monto independiente                    (no toca comisión ni gestor)
```

Los tres son completamente paralelos — ninguno afecta al otro.

### Cuándo se define

En `procesarVenta()` — porque el cliente paga el total ($610) en ese momento
y hay que declarar que $10 de ese pago corresponden a mensajería antes de registrar los pagos.

### Dos escenarios según el punto de venta

**Punto de venta CON vehículo propio (`mensajero_tipo = 'propio'`):**
```
Cliente paga $610 ($600 producto + $10 mensajero)
     │
Al aprobarVenta():
     └─ mensajero_monto ($10) se ACREDITA a la cuenta de mensajería del almacén
        (esa cuenta acumula fondos: gasolina, mantenimiento del vehículo, etc.)

Al anularVenta() si era completada:
     └─ mensajero_monto se REVIERTE de la cuenta de mensajería
```

> La cuenta de mensajería es una `Cuenta` normal del sistema creada por el admin
> y asociada al almacén. No requiere un modelo nuevo.

**Punto de venta SIN vehículo (`mensajero_tipo = 'externo'`):**
```
Cliente paga $610 ($600 producto + $10 mensajero)
     │
Al aprobarVenta():
     └─ mensajero_monto ($10) × mensajero_tasa = X CUP
        se DEBITA de una cuenta CUP del sistema
        (pago en efectivo al mensajero externo)

Al anularVenta() si era completada:
     └─ el monto CUP se RESTAURA a la cuenta CUP
```

### Campos nuevos en la tabla `ventas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `mensajero_monto` | decimal nullable | Monto en USD cobrado por mensajería |
| `mensajero_tipo` | enum nullable | `'propio'` o `'externo'` |
| `mensajero_cuenta_id` | FK nullable | Cuenta destino (propio) o cuenta CUP fuente (externo) |
| `mensajero_tasa` | decimal nullable | Tasa de cambio para conversión a CUP (solo externo) |

### Impacto en `aprobarVenta()` por tipo

| Tipo | Acción en cuenta |
|------|-----------------|
| `propio` | `cuenta_mensajeria.saldo += mensajero_monto` |
| `externo` | `cuenta_cup.saldo -= (mensajero_monto × mensajero_tasa)` |

### Impacto en `anularVenta()` (solo si era completada)

| Tipo | Acción en cuenta |
|------|-----------------|
| `propio` | `cuenta_mensajeria.saldo -= mensajero_monto` |
| `externo` | `cuenta_cup.saldo += (mensajero_monto × mensajero_tasa)` |

---

## Lógica de Comisiones

El sistema calcula la comisión del vendedor según el precio aplicado vs el precio base del almacén:

| Escenario | Comisión resultante |
|-----------|---------------------|
| `precio_venta >= precio_base` | `comision_base + (precio_venta - precio_base)` |
| `precio_venta < precio_base` | `max(0, comision_base - (precio_base - precio_venta))` |
| Venta especial | `0` (siempre) |

Esta lógica es consistente en `procesarVenta()`, `editarVentaPendiente()` y `guardarDestinatario()`.
El mensajero **nunca interfiere** con este cálculo.

---

## Lógica de Monedas y Tasas de Cambio

- `moneda_id` + `tasa_cambio_principal` — moneda principal de la venta (USD normalmente)
- `moneda_cobro_id` + `tasa_aplicada_venta` — moneda en que se cobra (CUP, MLC, etc.)
- `monto_diferencia_cambiaria` — diferencia entre lo cobrado real vs lo esperado a tasa oficial
- `ganancia_perdida_cambiaria` — calculada al aprobar, solo para pagos en CUP
- `ganancia_real_total` = `total_ganancia` + `ganancia_perdida_cambiaria`

---

## Impacto financiero por estado (completo)

| Acción | Stock | Saldo Cuentas | Deuda Cliente | Gestor | Mensajero |
|--------|-------|---------------|---------------|--------|-----------|
| `procesarVenta` | ✅ descuenta | ❌ | ❌ | ❌ | ❌ |
| `aprobarVenta` | ❌ (ya descontado) | ✅ incrementa | ✅ incrementa | ✅ descuenta | ✅ aplica |
| `anularVenta` (pendiente) | ✅ revierte | ❌ | ❌ | ❌ | ❌ |
| `anularVenta` (completada) | ✅ revierte | ✅ revierte | ✅ revierte | ✅ restaura | ✅ revierte |
| `rechazarSolicitudEspecial` | ✅ revierte | ❌ | ❌ | ❌ | ❌ |
