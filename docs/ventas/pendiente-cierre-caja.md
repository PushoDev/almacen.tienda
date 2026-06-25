# Cierre de Caja — Pendientes y Análisis

**Creado:** 2026-06-24
**Estado:** Pendiente — trabajar mañana paso a paso

---

## Contexto

El sistema de ventas fue refactorizado en 2026-06-24. Los cambios clave que afectan
al cierre de caja son:

1. `venta.total` ahora incluye `mensajero_monto` (antes era solo productos)
2. La comisión va a vendedor (`comision_cuenta_id`) O a gestor (`gestor_cuenta_id`), nunca ambos
3. El gestor se activa en Show.tsx via el modal de destinatario (switch "es gestor")
4. La distribución (mensajero tipo/cuenta/tasa + comisión cuenta) se guarda antes de aprobar

Ver contexto completo en: `docs/ventas/flujos-venta.md`

---

## Problemas identificados

### 🔴 Problema 1 — `es_venta_gestor` puede no estar sincronizado (Alta)

El cierre usa este campo para separar comisión PV de comisión gestor:

```php
// CierreCajaController líneas 1001–1012
->where('es_venta_gestor', false)  // → comision_pv_total
->where('es_venta_gestor', true)   // → comision_gestor_total
```

**Verificar:**
- ¿Existe `es_venta_gestor` en la tabla `ventas` y en `$fillable` del modelo?
- ¿Se actualiza a `true` cuando el vendedor activa el gestor en Show.tsx?
- Si no, las comisiones de ventas con gestor se contabilizan como "punto de venta"
  y el cierre muestra números incorrectos

**Posible solución:**
- Si el campo no se sincroniza, derivarlo en runtime:
  `es_venta_gestor = gestor_cuenta_id IS NOT NULL`
- O actualizar `es_venta_gestor` en `guardarDestinatario` cuando se activa el switch gestor

---

### 🟡 Problema 2 — Mensajero no separado del saldo esperado (Media)

`obtenerDetallesCierre` suma todos los pagos de ventas completadas al `saldo_calculado`.
Ahora que el cliente paga productos + mensajero en un solo total, el cierre ve:

```
Pago cliente: $58 → suma $58 al saldo del vendedor
Pero: $10 son mensajero (pass-through, van a cuenta mensajero al aprobar)
```

El `saldo_esperado_global` queda inflado por el mensajero de todas las ventas del turno.

**Lo que debería pasar:**
- El cierre debería mostrar mensajero como línea separada informativa
- El `saldo_esperado` debería excluir el mensajero (o al menos aclararlo)
- Sumar `mensajero_monto` de todas las ventas del turno y mostrar el desglose

**Datos disponibles:**
- `venta.mensajero_monto` — monto del mensajero en USD
- `venta.mensajero_tasa` — tasa para conversión CUP
- `venta.mensajeroCuenta` — cuenta que recibe el mensajero

---

### 🟡 Problema 3 — Total de ventas anuladas incluye mensajero (Baja)

```php
// Línea 1031
$ventasAnuladasTotalUSD = round($ventasAnuladas->sum(fn($v) => (float) $v->total), 2);
```

`venta.total` ahora = productos + mensajero. Una venta anulada de $48 productos
+ $10 mensajero muestra $58 como impacto. El impacto real en productos era $48.

**Solución simple:**
```php
// Usar sum de detalles en vez de venta.total
$ventasAnuladasTotalUSD = round($ventasAnuladas->sum(fn($v) =>
    $v->detalles->sum('subtotal')
), 2);
```
O añadir campo `total_productos` separado de `total` en la venta.

---

### 🔵 Problema 4 — Comisión no vinculada a cuenta en el cierre (Baja)

El cierre muestra `comision_pv_total` en USD pero no indica:
- En qué cuenta CUP se va a debitar la comisión
- A qué tasa se convierte
- Si la cuenta tiene saldo suficiente

Esto es informativo — al aprobar la venta ya se validó el saldo. Pero el
cierre podría mostrar el resumen de comisiones por cuenta para que el vendedor
confirme antes de cerrar.

---

## Plan de trabajo (para mañana)

### Paso 1 — Verificar `es_venta_gestor`
1. Revisar migración y modelo `Venta.php` — ¿existe el campo?
2. Revisar `guardarDestinatario` en `VentaController` — ¿actualiza `es_venta_gestor`?
3. Si no: corregir para que se sincronice al activar el switch gestor

### Paso 2 — Separar mensajero en `obtenerDetallesCierre`
1. En el loop de pagos, obtener `venta.mensajero_monto` de cada venta
2. Acumular total mensajero del turno por moneda
3. Mostrar en el payload como `mensajero_total_usd` separado
4. Decidir: ¿restar del saldo_esperado o solo mostrarlo informativo?

### Paso 3 — Corregir total ventas anuladas
1. Cargar detalles de ventas anuladas con `->with('detalles')`
2. Usar `sum('subtotal')` de detalles en vez de `venta.total`

### Paso 4 — (Opcional) Resumen comisiones por cuenta en cierre
1. Agrupar ventas del turno por `comision_cuenta_id`
2. Mostrar: cuenta CUP, tasa, monto total a debitar
3. Mostrar: cuenta gestor, monto por gestor

---

## Archivos a tocar

| Archivo | Cambio |
|---|---|
| `app/Http/Controllers/CierreCajaController.php` | `obtenerDetallesCierre`, `show`, posible fix `es_venta_gestor` |
| `app/Http/Controllers/VentaController.php` | `guardarDestinatario` — sync `es_venta_gestor` |
| `resources/js/pages/Vendor/Cierre.tsx` | Mostrar línea de mensajero en el resumen |
| `resources/js/pages/Vendor/DetalleCierre.tsx` | Ídem para vista de cierre guardado |

---

## Notas adicionales

- El cierre actualmente NO mueve dinero — solo es un snapshot + registro.
  Los movimientos reales ocurren al aprobar cada venta. No hay riesgo de
  corromper datos financieros, solo de mostrar cifras incorrectas en el resumen.
- Prioridad real: Paso 1 (gestor) es el único que puede mostrar comisiones
  mal clasificadas. Los demás son cosméticos/informativos.
