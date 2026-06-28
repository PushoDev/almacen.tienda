# Flujos de Venta — Contexto y Diseño

**Última actualización:** 2026-06-28

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

## Comisiones: vendedor O gestor, nunca ambos (XOR)

La comisión de los productos va siempre a UNO solo — decisión excluyente:

```
Si hay gestor    → la comisión completa va al gestor
Si no hay gestor → la comisión completa va al vendedor (punto de venta)
```

Esta regla se llama XOR: activar uno desactiva el otro automáticamente.
La UI debe reflejar esto con un selector visible (ver sección "Distribución").

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
| Mensajero | Checkbox opcional → selector de moneda (cualquiera del sistema) + monto |
| Resumen | Subtotal productos / + Mensajería (con equivalente USD si no es USD) / Total |
| Pagos | PaymentForm: múltiples métodos y monedas hasta cubrir el total completo |

**El mensajero en el POS es solo el monto que paga el cliente por el envío.**
No define quién lo recibe ni cómo se transfiere. Eso se configura en Show.tsx.

**Multi-moneda en mensajero (implementado 2026-06-25):**
- El usuario selecciona la moneda en que el cliente paga el mensajero (USD, CUP, CUF, etc.)
- Si no es USD: ingresa o edita la tasa de conversión → el sistema calcula el equivalente USD
- El equivalente USD se suma al total del carrito
- Se guardan tres campos nuevos: `mensajero_moneda_id`, `mensajero_monto_original`, `mensajero_tasa_entrada`
- `mensajero_monto` siempre se almacena como USD (para movimientos de cuentas y reportes)

### Show.tsx — Panel "Distribución de la Venta"

Aparece solo en ventas `pendiente`. Se gestiona ANTES de aprobar.

| Sección | Contenido |
|---|---|
| Resumen de cobro | Productos / Mensajería / Total cliente / Pagos recibidos desglosados |
| Mensajero | Configura tipo (propio/externo) + cuenta CUP + **monto final CUP editable** (permite premio/sanción) |
| Comisión | Selector XOR: **Punto de Venta** O **Gestor** (nunca ambos) |

**Comisión — diseño propuesto (pendiente de implementar):**
El panel de distribución debe mostrar un selector explícito con dos botones:

```
[● Punto de Venta]  [○ Gestor]
```

- Al seleccionar **Punto de Venta**: muestra form cuenta CUP + tasa
- Al seleccionar **Gestor**: muestra info del gestor configurado, o botón para configurarlo
- Cambiar de modo → dialog de confirmación → limpia campos del modo anterior en backend

Actualmente el modo se infiere implícitamente de si existe `gestor` en la venta,
lo que genera confusión y riesgo de tener ambos configurados en DB simultáneamente.

**El mensajero siempre se paga en CUP:**
- **Propio:** `monto_final_cup` se acredita en la cuenta CUP (entra dinero)
- **Externo:** `monto_final_cup` se debita de la cuenta CUP (sale dinero para pagar al mensajero)

**Monto final CUP editable (implementado 2026-06-28):**
- `monto_original` del POS es la referencia inmutable — lo que el cliente pagó
- `monto_final_cup` en Show es el monto real que se mueve en la cuenta — editable
- Si `monto_final_cup > monto_original` → premio al mensajero (verde en UI)
- Si `monto_final_cup < monto_original` → sanción al mensajero (amarillo en UI)
- Si no se edita → backend usa `monto_original` como fallback
- La tasa ya no dicta el monto final — es solo referencia informativa

### Show.tsx — Otras secciones

- **Editar precios/pagos:** ajuste de precio por ítem con comisión recalculada en tiempo real
- **Destinatario / Gestor:** modal con tabs — Receptor (datos físicos) + Gestor (switch + config)
- **Aprobar:** activo cuando hay destinatario y fondos suficientes
- **Anular:** disponible con motivo

---

## Flujos completos

### Flujo A — Venta simple
```
POS:   productos → pago USD → crear venta
Show:  (opcional) ajustar precio → configurar comisión [PV] cuenta CUP + tasa → aprobar
```

### Flujo B — Venta con mensajero propio
```
POS:   productos ($100) + mensajero 5000 CUP (tasa 500 = $10 USD) = total cliente $110
       cliente paga $110 completo
       → mensajero_monto = $10 USD, mensajero_monto_original = 5000 CUP

Show:  mensajero: tipo=propio
       monto_final_cup = 5000 CUP (o ajustado: 5500 = premio, 4500 = sanción)
       cuenta CUP del vehículo/negocio → se acreditan los CUP
       comisión [PV]: cuenta CUP, tasa → X CUP debitados
       aprobar
```

### Flujo C — Venta con mensajero externo
```
POS:   productos + mensajero 8000 CUP = total cliente
       cliente paga todo

Show:  mensajero: tipo=externo
       monto_final_cup = 8000 CUP (editable — permite premio o sanción)
       cuenta CUP de la empresa → 8000 CUP salen (se le pagan en mano al mensajero)
       comisión → [PV] o [Gestor]
       aprobar
```

### Flujo D — Venta con gestor
```
POS:   productos → pago → crear venta

Show:  modal destinatario → tab Gestor → switch ON → configurar monto, cuenta, tasa
       comisión selector: cambiar a [Gestor]
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

## Campos clave en tabla `ventas`

| Campo | Descripción |
|---|---|
| `mensajero_monto` | Monto mensajero en USD (siempre) |
| `mensajero_tipo` | `propio` / `externo` |
| `mensajero_cuenta_id` | Cuenta que recibe/paga el mensajero |
| `mensajero_tasa` | Tasa CUP/USD para el movimiento de cuenta (se pone en Show.tsx) |
| `mensajero_moneda_id` | Moneda original del cliente (CUP, CUF, USD, etc.) |
| `mensajero_monto_original` | Monto en la moneda original del cliente |
| `mensajero_tasa_entrada` | Tasa usada en el POS para convertir a USD |
| `comision_cuenta_id` | Cuenta CUP donde va la comisión del vendedor |
| `comision_tasa` | Tasa CUP/USD para la comisión del vendedor |
| `es_venta_gestor` | Boolean — XOR flag: true = comisión va al gestor |
| `gestor_cuenta_id` | Cuenta del gestor |
| `gestor_monto` | Monto en moneda local a descontar al gestor |
| `tasa_aplicada_gestor` | Tasa para calcular monto_usd del gestor |

---

## Endpoints clave

| Ruta | Método | Descripción |
|---|---|---|
| `/ventas/procesar` | POST | Crear venta — recibe items, total, pagos, mensajero multi-moneda |
| `/ventas/{venta}/distribucion` | POST | Guardar mensajero (tipo/cuenta/tasa) y/o comisión vendedor |
| `/ventas/{venta}/destinatario` | POST | Guardar destinatario y/o gestor |
| `/ventas/{venta}/aprobar` | POST | Aprobar venta pendiente — ejecuta todos los movimientos |
| `/ventas/{venta}/editar-pendiente` | POST | Editar precios/pagos de venta pendiente |
| `/ventas/{venta}/anular` | POST | Anular venta con motivo (revierte movimientos si completada) |

---

## Estado actual (2026-06-25)

### Implementado y funcional

- **POS:** mensajero multi-moneda — selector de moneda + monto + tasa editable → equivalente USD se suma al total
- **POS:** desglose en resumen: `CUP5000 ≈ $10.00` cuando no es USD
- **POS:** campos `mensajero_moneda_id`, `mensajero_monto_original`, `mensajero_tasa_entrada` enviados al backend
- **Backend:** migración con 3 nuevos campos en `ventas`
- **Backend:** modelo `Venta` — fillable + casts + relación `mensajeroMoneda()`
- **Backend:** `procesarVenta` — valida y guarda los 3 nuevos campos
- **Backend:** `show()` — devuelve `moneda_codigo`, `moneda_id`, `monto_original`, `tasa_entrada` en mensajero
- **Backend:** `aprobarVenta` — lógica smart: usa `monto_original` si moneda no es USD, si no convierte via tasa
- **Backend:** `anularVenta` — misma lógica smart para reversión
- **Backend:** `guardarDistribucion` — fix bug: `mensajeroEnUSD` siempre se incluye si `monto > 0`
- **POS:** UI mensajero separada en filas (no cramped), selector + monto + tasa en bloques
- **Show:** comisión vendedor O gestor (XOR visual — gestor oculta el form de vendedor)
- **Show:** panel de distribución unificado con resumen de cobro + mensajero + comisión
- **Show:** validación de saldo antes de aprobar (gestor y comisión PV)

### Pendiente / En progreso

#### Bugs críticos (VentaController)

| # | Bug | Ubicación | Descripción |
|---|---|---|---|
| B1 | `saldo_actual` vs `saldo_cuenta` | `guardarDistribucion` ~L1759 | Devuelve `saldo_actual` en `comision_pago.cuenta` pero el campo real es `saldo_cuenta` |
| B2 | Sin guardia XOR en aprobación | `aprobarVenta` + `anularVenta` | Falta `&& !$venta->es_venta_gestor` en el bloque de comisión vendedor → podría debitar ambas cuentas |
| B3 | `foreach` en null | `procesarVenta` ~L803 | `foreach ($validatedData['pagos'] as $pago)` sin `?? []` — crashea si pagos es null |

#### Features pendientes (Show.tsx)

| # | Feature | Descripción |
|---|---|---|
| F1 | Selector XOR comisión | Reemplazar lógica implícita por botones `[Punto de Venta] / [Gestor]` visibles en el panel de distribución |
| F2 | Display mensajero multi-moneda | Actualizar interface TypeScript y display: `moneda` puede ser CUF u otra, no solo USD/CUP |
| F3 | Form edición mensajero en Show.tsx | Actualmente solo ofrece USD/CUP — debe soportar cualquier moneda del sistema |

#### Pendientes generales

- Separar `ganancia_real_total` del cálculo (actualmente muestra 0 en algunos casos)
- Mover configuración de cuenta mensajero del almacén de Almacenes/Edit a Empleados/Edit
- Filtrar cuentas CUP-only en `AlmacenController@edit`
- Cierre de caja: problemas 2, 3, 4 (ver `pendiente-cierre-caja.md`)
