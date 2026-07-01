# Cierre de Caja — Pendientes y Análisis

**Creado:** 2026-06-24
**Última actualización:** 2026-07-01
**Estado:** Problemas principales resueltos. Features de desglose financiero añadidos 2026-07-01.

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

### ✅ Problema 4 — Comisión no vinculada a cuenta en el cierre (RESUELTO 2026-07-01)

Implementado como desglose per-venta en widgets de Comisión PV y Comisión Gestor.
Ver sección "Features añadidos 2026-07-01" más abajo.

---

## Features añadidos 2026-07-01

### Snapshot de mensajero en `cierre_cajas`

**Motivación:** El cierre es un documento histórico — igual que `snapshot_cuentas` y
`snapshot_clientes`, el mensajero debe guardarse al momento del cierre, no recalcularse.

**Migración:** `2026_07_01_000001_add_mensajero_snapshot_to_cierre_cajas.php`
Añade 4 columnas a `cierre_cajas`:
- `mensajero_total_usd` (decimal)
- `mensajero_total_cup` (decimal)
- `mensajero_count` (unsignedInteger)
- `mensajero_detalles` (json, nullable) — array con `{venta_id, monto_usd, monto_cup, tipo}`

**`CierreCaja.php`:** Añadidos a `$fillable` y `$casts`.

**`store()`:** Extrae los 4 campos del `$calculos` y los guarda con `CierreCaja::create()`.

**`show()`:** Snapshot-first — si `mensajero_detalles !== null` usa el snapshot;
si no (cierres legacy sin snapshot), recalcula desde DB como fallback.

---

### Resumen Financiero del Turno (tarjeta verde)

Aparece arriba de la tarjeta de Mensajería en Create y Show. Muestra:
- **Ventas brutas** (USD) — suma de `total_esperado_usd` de ventas completadas del turno
- **Comisiones (PV)** (negativo CUP) — `SUM(total_comision * comision_tasa)` per venta
- **Mensajería** (negativo CUP) — `mensajero_total_cup`
- **Ganancia neta agencia** (USD) — `ventas_brutas - mensajero_total_usd`

Campos nuevos en payload `create()` y `show()`:
`ventas_brutas_usd`, `comisiones_pv_cup`, `comisiones_gestor_cup`, `comisiones_total_cup`

---

### Desglose per-venta en widgets de Comisión PV y Comisión Gestor

Cada widget muestra:
- Monto total USD (ya existía)
- Monto total CUP (nuevo) en color azul/morado
- Botón "Ver detalles" → dialog con tabla `Venta | USD | CUP | Fecha`

**Comisión PV:** `comision_cup = total_comision * comision_tasa` por venta.
**Comisión Gestor:** filtra cuentas gestor con moneda CUP usando `whereHas`.

Campos nuevos: `comisiones_pv_detalles` (array), `comisiones_gestor_detalles` (ya existía).

---

### Mensajero en modal "Detalles de Venta" (Por dónde entraron)

Al expandir una fila en "Por dónde entraron" y presionar el eye icon se abre el
modal de detalle de la venta. Si esa venta tuvo mensajero, ahora aparece una
sección azul "MENSAJERÍA" con el monto CUP y su equivalente USD, colocada
**antes** del bloque "Total Venta".

Aplica tanto en Create.tsx como en Show.tsx.

---

### Fix: `calculos` referenciado antes de inicialización en Show.tsx

`getOperacionesPorVenta` usaba `calculos.detalles` pero `calculos` se define más
abajo con `useMemo`. Corregido usando `cierre.detalles` directamente (misma data).

---

## Estado actual de los archivos del cierre

| Archivo | Estado |
|---|---|
| `app/Http/Controllers/CierreCajaController.php` | ✅ Snapshot mensajero, resumen financiero, desglose comisiones PV/Gestor |
| `app/Models/CierreCaja.php` | ✅ `$fillable` y `$casts` actualizados con campos mensajero |
| `database/migrations/2026_07_01_000001_*` | ✅ Migración aplicada — 4 columnas mensajero en `cierre_cajas` |
| `resources/js/pages/Cierres/Create.tsx` | ✅ Resumen financiero, desglose comisiones, mensajero en modal |
| `resources/js/pages/Cierres/Show.tsx` | ✅ Mismo que Create + fix `calculos` antes de inicialización |

---

## Notas adicionales

- El cierre NO mueve dinero — solo es un snapshot + registro.
  Los movimientos reales ocurren al aprobar cada venta. No hay riesgo de
  corromper datos financieros, solo de mostrar cifras incorrectas en el resumen.
- El `saldo_esperado_global` ahora refleja solo los ingresos por productos (sin mensajero).
- El mensajero aparece como línea separada informativa en el resumen del cierre.
- Las ventas anuladas muestran solo el valor de los productos (sin mensajero).
