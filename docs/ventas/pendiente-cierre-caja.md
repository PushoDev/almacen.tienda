# Cierre de Caja — Pendientes y Análisis

**Creado:** 2026-06-24
**Última actualización:** 2026-06-25
**Estado:** Diferido — trabajar después de resolver bugs de VentaController y Show.tsx

---

## Contexto

El sistema de ventas fue refactorizado en 2026-06-24. Los cambios clave que afectan
al cierre de caja son:

1. `venta.total` ahora incluye `mensajero_monto` (antes era solo productos)
2. La comisión va a vendedor (`comision_cuenta_id`) O a gestor (`gestor_cuenta_id`), nunca ambos
3. El gestor se activa en Show.tsx via el modal de destinatario (switch "es gestor")
4. La distribución (mensajero tipo/cuenta/tasa + comisión cuenta) se guarda antes de aprobar
5. Mensajero ahora es multi-moneda: `mensajero_moneda_id`, `mensajero_monto_original`, `mensajero_tasa_entrada`

Ver contexto completo en: `docs/ventas/flujos-venta.md`

---

## Problemas identificados

### ✅ Problema 1 — `es_venta_gestor` no estaba sincronizado (RESUELTO)

El cierre usa este campo para separar comisión PV de comisión gestor.
**Verificado:** el campo se actualiza correctamente en `guardarDestinatario` cuando
el vendedor activa el switch gestor. No requiere acción.

---

### 🟡 Problema 2 — Mensajero no separado del saldo esperado (Media)

`obtenerDetallesCierre` suma todos los pagos de ventas completadas al `saldo_calculado`.
Ahora que el cliente paga productos + mensajero en un solo total, el cierre ve:

```
Pago cliente: $110 → suma $110 al saldo del vendedor
Pero: $10 son mensajero (pass-through, van a cuenta mensajero al aprobar)
```

El `saldo_esperado_global` queda inflado por el mensajero de todas las ventas del turno.

**Lo que debería pasar:**
- El cierre debería mostrar mensajero como línea separada informativa
- El `saldo_esperado` debería excluir el mensajero (o al menos aclararlo)
- Sumar `mensajero_monto` de todas las ventas del turno y mostrar el desglose

**Datos disponibles:**
- `venta.mensajero_monto` — monto del mensajero en USD
- `venta.mensajero_tasa` — tasa para conversión CUP (la de Show.tsx, no la de entrada del POS)
- `venta.mensajeroCuenta` — cuenta que recibe el mensajero

---

### 🟡 Problema 3 — Total de ventas anuladas incluye mensajero (Baja)

```php
// Línea ~1031
$ventasAnuladasTotalUSD = round($ventasAnuladas->sum(fn($v) => (float) $v->total), 2);
```

`venta.total` ahora = productos + mensajero. Una venta anulada de $48 productos
+ $10 mensajero muestra $58 como impacto. El impacto real en productos era $48.

**Solución simple:**
```php
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

## Plan de trabajo (diferido)

### Paso 1 — ✅ Verificar `es_venta_gestor` (COMPLETADO)
Verificado: el campo se sincroniza en `guardarDestinatario`. No requiere cambio.

### Paso 2 — Separar mensajero en `obtenerDetallesCierre`
1. En el loop de pagos, obtener `venta.mensajero_monto` de cada venta
2. Acumular total mensajero del turno
3. Mostrar en el payload como `mensajero_total_usd` separado
4. Decidir: ¿restar del saldo_esperado o solo mostrarlo informativo?
5. Considerar `mensajero_monto_original` por moneda para desglose multi-moneda

### Paso 3 — Corregir total ventas anuladas
1. Cargar detalles de ventas anuladas con `->with('detalles')`
2. Usar `sum('subtotal')` de detalles en vez de `venta.total`

### Paso 4 — (Opcional) Resumen comisiones por cuenta en cierre
1. Agrupar ventas del turno por `comision_cuenta_id`
2. Mostrar: cuenta CUP, tasa, monto total a debitar
3. Mostrar: cuenta gestor, monto por gestor

---

## Prioridad respecto a otros pendientes

Antes de tocar el cierre de caja, resolver en orden:
1. **Bug B2** (XOR guard en `aprobarVenta`) — riesgo de doble débito activo
2. **Bug B1** (`saldo_actual` vs `saldo_cuenta`) — dato incorrecto en UI
3. **Bug B3** (foreach null) — crash potencial
4. **Feature F1** (selector XOR comisión en Show.tsx) — UX crítico
5. **Feature F2/F3** (display y edición multi-moneda mensajero en Show.tsx)
6. Recién entonces: cierre de caja (Problemas 2, 3, 4)

---

## Archivos a tocar (cuando llegue el momento)

| Archivo | Cambio |
|---|---|
| `app/Http/Controllers/CierreCajaController.php` | `obtenerDetallesCierre`, fix total anuladas |
| `resources/js/pages/Vendor/Cierre.tsx` | Mostrar línea de mensajero en el resumen |
| `resources/js/pages/Vendor/DetalleCierre.tsx` | Ídem para vista de cierre guardado |

---

## Notas adicionales

- El cierre actualmente NO mueve dinero — solo es un snapshot + registro.
  Los movimientos reales ocurren al aprobar cada venta. No hay riesgo de
  corromper datos financieros, solo de mostrar cifras incorrectas en el resumen.
- Prioridad real: Bug B2 (XOR guard) es el único que puede generar doble débito real.
  Los problemas del cierre son cosméticos/informativos.
