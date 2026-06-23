# Flujos Financieros: Comisión, Mensajero y Agencia

**Fecha:** 2026-06-23

---

## Principio fundamental

El total cobrado al cliente **entra completo al sistema**. Las salidas de comisión y mensajero son movimientos independientes en cuentas CUP — no reducen ni interceptan el pago del cliente.

---

## Ejemplo concreto

| Concepto | Monto |
|---|---|
| Productos | 600 USD |
| Mensajero (externo) | 20 USD |
| **Total cobrado al cliente** | **620 USD** |
| Comisión vendedor (p.ej.) | 10 USD → equivalente CUP |

### Movimientos al aprobar la venta

```
ENTRADA
  +620 USD  → cuentas de cobro (efectivo, transferencia, etc.)

SALIDAS PARALELAS (en CUP, cuentas separadas)
  -10 × tasa CUP  → cuenta comisión vendedor
  -20 × tasa CUP  → cuenta mensajero (si externo)
             o
  +20 × tasa CUP  → cuenta del almacén (si propio/vehículo)
```

Los tres movimientos son **completamente independientes entre sí**. Ninguno afecta al otro.

---

## Vista contable (lo que muestra el sistema)

El sistema presenta la distribución como:

```
620 USD total
  ├─ 590 USD → Ganancia agencia  (total - comisión - mensajero*)
  ├─  10 USD → Comisión vendedor
  └─  20 USD → Mensajero
```

> *Nota: en el cálculo real `ganancia_agencia = total_ganancia - total_comision`, donde `total_ganancia` es el margen sobre el costo de los productos. El mensajero se contabiliza por separado. La tabla anterior es una simplificación de la distribución de ingresos.

Esta vista es solo para **control y reporte** — no altera el flujo de dinero descrito arriba.

---

## Los tres flujos son independientes

| Flujo | Cuándo se ejecuta | En qué moneda | Quién configura la cuenta |
|---|---|---|---|
| **Comisión vendedor** | Al aprobar la venta | CUP (debita cuenta del vendedor) | El vendedor al crear la venta |
| **Comisión gestor** | Al aprobar la venta | Moneda de la cuenta del gestor | El admin al configurar la venta |
| **Mensajero externo** | Al aprobar la venta | CUP (debita cuenta del almacén) | El vendedor al crear la venta |
| **Mensajero propio** | Al aprobar la venta | CUP (acredita cuenta del almacén) | Configurado en el almacén |

Cambiar uno no rompe los otros. Son bloques aditivos sobre la misma venta.

---

## Lo que NO ocurre (aclaraciones)

- La comisión del vendedor **NO se descuenta del pago del cliente**. El cliente paga el precio completo.
- El mensajero **NO reduce el saldo de los pagos recibidos**. Es un débito/crédito CUP aparte.
- La "ganancia agencia" en los widgets es **contable/informativa** — el dinero ya está en las cuentas de cobro.
- Anular una venta **completada** revierte los tres flujos de CUP automáticamente.
