# Flujos de Venta — Contexto y Diseño

**Fecha:** 2026-06-24
**Estado:** Análisis completo — pendiente implementación

---

## Actor principal: El Vendedor

El vendedor es quien gestiona el ciclo completo de una venta normal de principio a fin.
El admin solo interviene en ventas especiales.

```
VENDEDOR hace todo en ciclo normal:
  POS (Index)  → productos, mensajero, pagos
  Show         → ajuste de precio, comisiones, gestor, aprobación

ADMIN solo interviene en:
  → Ventas especiales (precio bajo el mínimo permitido)
  → Supervisión general
```

---

## Los tres flujos de dinero en una venta

Toda venta tiene tres flujos distintos que deben tratarse por separado:

```
CLIENTE PAGA: $115 (ejemplo)
     │
     ├─── $105 → FLUJO PRODUCTOS
     │           ├─ costo              → lo que costó el producto
     │           ├─ comisión vendedor  → su ganancia por la venta
     │           └─ ganancia agencia   → margen de la tienda
     │
     └─── $10  → FLUJO MENSAJERO (pass-through)
                 → va directo a la cuenta del mensajero
                 → NO es ingreso de la agencia
                 → NO entra en cálculo de comisiones
                 → NO entra en cálculo cambiario
```

**El problema actual:** `venta.total` mezcla productos + mensajero, contaminando
el cálculo de `monto_diferencia_cambiaria`.

---

## Estructura de datos correcta

```
venta.total_productos     = suma de items                   → $105
venta.mensajero_monto     = monto del servicio              → $10
venta.total_cliente       = total_productos + mensajero     → $115
                            (este es el que cubren los pagos)
```

Los pagos del cliente cubren `total_cliente`. Pueden ser en múltiples monedas
y métodos. El sistema no necesita saber qué porción de cada pago "es del mensajero"
porque `mensajero_monto` ya está separado como campo.

---

## Cálculo cambiario correcto (excluye mensajero)

```php
// Convertir mensajero a la moneda de cobro
if (mensajero_tasa > 0) {
    // mensajero era USD → convertir a CUP
    mensajero_en_moneda_cobro = mensajero_monto × mensajero_tasa;
} else {
    // mensajero ya era CUP directo
    mensajero_en_moneda_cobro = mensajero_monto;
}

usd_objetivo               = costo_productos + ganancia_productos  // solo productos
monto_esperado_oficial     = usd_objetivo × tasa_oficial
monto_real_cobrado         = sum(pagos en moneda_cobro)
monto_real_productos       = monto_real_cobrado - mensajero_en_moneda_cobro
monto_diferencia_cambiaria = monto_real_productos - monto_esperado_oficial
```

---

## Estructura de comisiones por ítem

```
precio_compra_producto   → costo (suelo absoluto)
producto_vendedors.precio_venta  → precio_base (precio estándar asignado)
producto_vendedors.comision      → comision_base (ganancia estándar del vendedor)
precio_minimo = precio_base - comision_base  → suelo sin venta especial
```

### Reglas de comisión según precio aplicado

| Situación | Comisión del vendedor | Ganancia agencia |
|---|---|---|
| `precio = precio_base` | `comision_base` | constante |
| `precio > precio_base` | `comision_base + (precio - precio_base)` | constante |
| `precio_minimo ≤ precio < precio_base` | `max(0, comision_base - descuento)` | constante |
| `precio < precio_minimo` | `0` — requiere venta especial | puede ser pérdida |

La agencia siempre se lleva el mismo margen independientemente del precio que
ponga el vendedor. Todo el markup extra va a la comisión del vendedor.

---

## Flujos de venta posibles

### Flujo A — Venta simple
```
POS: agrega productos → pago en USD → crear venta
Show: revisa → aprueba
```

### Flujo B — Venta con ajuste de precio
```
POS: agrega productos → sube precio ($100 → $105) → pago → crear venta
Show: ve comisión recalculada ($8 en vez de $3) → puede ajustar precio si cambió
     → aprueba
```

### Flujo C — Venta con mensajero
```
POS: agrega productos → activa mensajero ($10, USD/CUP, propio/externo) → pago
     El total que paga el cliente = productos + mensajero
     Puede ser un solo pago que cubra ambos
Show: aprueba → al aprobar se mueve el dinero del mensajero a su cuenta
```

### Flujo D — Venta con gestor
```
POS: agrega productos → pago → crear venta
Show: activa gestor → define monto, cuenta, tasa → aprueba
     Al aprobar se debita de la cuenta del gestor
```

### Flujo E — Combinación compleja (caso real)
```
Producto base $100 → vendedor sube a $105
Mensajero $10 USD
Total cliente: $115

Cliente paga en dos métodos:
  · $50 USD efectivo
  · 32,500 CUP transferencia (= $65 a tasa 500)

Show: vendedor configura gestor si aplica → aprueba

Al aprobar:
  · Cuenta mensajero   + 5,000 CUP  (10 USD × 500)
  · Cuenta vendedor    + 4,000 CUP  (comisión $8 × 500)
  · Diferencia cambiaria: calculada solo sobre $105 sin mensajero
```

### Flujo F — Venta especial (solo admin)
```
POS: vendedor intenta precio bajo el mínimo → sistema activa modo especial
     vendedor escribe justificación → crear solicitud
Show: vendedor ve "esperando admin"
Admin-Show: ve análisis de pérdida → aprueba o rechaza con nota
Sin comisión para el vendedor en este caso
```

---

## Qué se gestiona en cada pantalla

### POS — Index.tsx (vendedor)

| Sección | Contenido | Aparece cuando |
|---|---|---|
| Carrito | Productos, cantidades, precios, comisión estimada en tiempo real | Siempre |
| Extras | Mensajero (monto, moneda, tipo) | Al activarlo |
| Resumen | Subtotal productos / Mensajero / Total cliente — separados | Siempre |
| Pagos | Múltiples métodos/monedas hasta cubrir total cliente | Siempre |

### Show.tsx (vendedor — venta normal pendiente)

| Sección | Contenido |
|---|---|
| Productos | Lista con precio_base, precio_vendido, ajuste de precio si necesita corregir |
| Comisiones | Por ítem, recalculadas según precio final. Cuenta de pago y tasa |
| Mensajero | Info del servicio configurado |
| Gestor | Toggle para activar, monto, cuenta |
| Pagos recibidos | Lo que ya registró el cliente |
| Aprobar | Botón — ejecuta todos los movimientos de cuentas |

### Show.tsx (vendedor — venta especial)

| Sección | Contenido |
|---|---|
| Motivo enviado | La justificación que escribió |
| Estado | "Esperando decisión del admin" |
| Cancelar | Puede cancelar la solicitud si no ha sido decidida |

### Show.tsx (admin — venta especial)

| Sección | Contenido |
|---|---|
| Todo lo del vendedor | + |
| Costos internos | `precio_compra`, pérdida calculada |
| Análisis cambiario | Diferencia real vs tasa oficial |
| Nota para vendedor | Campo opcional al rechazar o aprobar |
| Aprobar / Rechazar | Solo admin puede ejecutar esta acción |

---

## Implementado (2026-06-24)

- `procesarVenta`: `monto_diferencia_cambiaria` excluye mensajero correctamente
- `aprobarVenta`: `ganancia_perdida_cambiaria` usa solo CUP de productos (sin mensajero)
- `editarVentaPendiente`: el `total` al editar mantiene el mensajero en USD
- `Index.tsx`: desglose visual subtotal productos / mensajero / total cliente + comisión estimada
- `Show.tsx Item`: interfaz incluye `precio_base`
- `Show.tsx` modal edición: comisión estimada por ítem en tiempo real al cambiar precio
- `Show.tsx` dialog aprobación: mensajero incluido en el preview "Al aprobar se ejecutará"

---

## Pendiente

### 1. Modelo y migración
- Separar `total_productos` de `total_cliente` en tabla `ventas`
- O mantener `total` = productos y calcular `total_cliente` en runtime

### 2. procesarVenta (backend)
- Recibir `total` = solo productos (sin mensajero)
- Validar pagos contra `total + mensajero_monto`
- Corregir fórmula `monto_diferencia_cambiaria` para excluir mensajero

### 3. aprobarVenta (backend)
- Recalcular comisiones con el precio final que tenga la venta al momento de aprobar
- Ejecutar: mensajero, comisión vendedor, gestor (si existe)

### 4. Index.tsx (POS)
- Desglose visual claro: subtotal productos / mensajero / total cliente
- Comisión estimada del vendedor visible en tiempo real al cambiar precio

### 5. Show.tsx
- Panel de comisiones ajustable por el vendedor (precio editable → comisión recalcula)
- Panel de gestor accesible para el vendedor
- Botón aprobar para el vendedor en ventas normales
- Vista diferente para ventas especiales (solo espera, puede cancelar)
- Vista admin para ventas especiales (aprobar/rechazar con nota)
