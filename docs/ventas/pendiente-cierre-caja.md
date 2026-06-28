# Cierre de Caja — Pendientes y Análisis

**Creado:** 2026-06-24
**Última actualización:** 2026-06-28
**Estado:** Problemas principales resueltos el 2026-06-28.

---

## Contexto

El sistema de ventas fue refactorizado en 2026-06-24. Los cambios clave que afectan
al cierre de caja son:

1. `venta.total` ahora incluye `mensajero_monto` (antes era solo productos)
2. La comisión va a vendedor (`comision_cuenta_id`) O a gestor (`gestor_cuenta_id`), nunca ambos
3. El gestor se activa en Show.tsx via el modal de destinatario (switch "es gestor")
4. La distribución (mensajero tipo/cuenta/monto_final_cup + comisión cuenta) se guarda antes de aprobar
5. Mensajero ahora usa `mensajero_monto_final_cup` como monto real pagado (añadido 2026-06-28)

Ver contexto completo en: `docs/ventas/contexto-actual.md`

---

## Problemas identificados

### ✅ Problema 1 — `es_venta_gestor` no estaba sincronizado (RESUELTO)

El cierre usa este campo para separar comisión PV de comisión gestor.
**Verificado:** el campo se actualiza correctamente en `guardarDestinatario` cuando
el vendedor activa el switch gestor. No requiere acción.

---

### ✅ Problema 2 — Mensajero no separado del saldo esperado (RESUELTO 2026-06-28)

**Antes:** `saldo_esperado_global` quedaba inflado porque incluía el mensajero cobrado
al cliente como si fuera ingreso del vendedor.

**Solución aplicada:**
- Se acumulan todas las ventas completadas del turno con `mensajero_monto > 0`
- Se calcula `mensajero_total_usd` y `mensajero_total_cup` (usando `monto_final_cup ?? monto_original`)
- Se resta `mensajero_total_usd` del `saldo_esperado_global`
- Se añaden tres nuevos campos al payload: `mensajero_total_usd`, `mensajero_total_cup`, `mensajero_count`
- Se muestra en `Cierres/Create.tsx` y `Cierres/Show.tsx` como tarjeta azul "Mensajería del Turno"
  con nota "Ya descontado del saldo esperado (pass-through)"

**Archivos modificados:**
- `app/Http/Controllers/CierreCajaController.php` — `obtenerDetallesCierre()` y `show()`
- `resources/js/pages/Cierres/Create.tsx` — interfaz + tarjeta visual
- `resources/js/pages/Cierres/Show.tsx` — interfaz + tarjeta visual

---

### ✅ Problema 3 — Total de ventas anuladas incluía mensajero (RESUELTO 2026-06-28)

**Antes:**
```php
$ventasAnuladasTotalUSD = round($ventasAnuladas->sum(fn($v) => (float) $v->total), 2);
// venta.total = productos + mensajero → cifra inflada
```

**Solución aplicada:**
```php
$ventasAnuladas->load('detalles'); // o ->with('detalles') en la query
$ventasAnuladasTotalUSD = round($ventasAnuladas->sum(fn($v) => (float) $v->detalles->sum('subtotal')), 2);
```

Aplica tanto en `obtenerDetallesCierre()` (Create) como en `show()` (Show del cierre guardado).

---

### 🔵 Problema 4 — Comisión no vinculada a cuenta en el cierre (Pendiente / Baja prioridad)

El cierre muestra `comision_pv_total` en USD pero no indica:
- En qué cuenta CUP se va a debitar la comisión
- A qué tasa se convierte
- Si la cuenta tiene saldo suficiente

Esto es informativo — al aprobar la venta ya se validó el saldo. Podría mostrarse
como resumen de comisiones por cuenta para que el vendedor confirme antes de cerrar.

**No implementado — baja prioridad.**

---

## Estado actual de los archivos del cierre

| Archivo | Estado |
|---|---|
| `app/Http/Controllers/CierreCajaController.php` | ✅ Actualizado — mensajero separado, anuladas corregidas |
| `resources/js/pages/Cierres/Create.tsx` | ✅ Actualizado — tarjeta mensajería, interfaces actualizadas |
| `resources/js/pages/Cierres/Show.tsx` | ✅ Actualizado — tarjeta mensajería, props actualizados |

---

## Notas adicionales

- El cierre NO mueve dinero — solo es un snapshot + registro.
  Los movimientos reales ocurren al aprobar cada venta. No hay riesgo de
  corromper datos financieros, solo de mostrar cifras incorrectas en el resumen.
- El `saldo_esperado_global` ahora refleja solo los ingresos por productos (sin mensajero).
- El mensajero aparece como línea separada informativa en el resumen del cierre.
- Las ventas anuladas muestran solo el valor de los productos (sin mensajero).
