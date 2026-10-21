# Diferencia restante entre el Excel y el sistema: 60,85 USD

Fecha: 2026-10-21 · Para: el cliente · Continúa `conciliacion-excel-vs-sistema-2026-10-21.md`

**Después de aprobar la compra #31, el capital del sistema queda a 60,85 USD (0,005 %) del Excel.** Esa diferencia no viene de un solo error: es el resultado neto de unas 25 diferencias pequeñas que se compensan entre sí. No se puede cerrar una por una, pero se sabe dónde están y qué las causa.

## 1. Cifras finales

| Cifra | Excel | Sistema | Diferencia |
|---|---:|---:|---:|
| Capital | 1.295.079,37 | 1.295.018,52 | 60,85 |
| Crecimiento del mes (capital − cierre de septiembre) | 42.075,37 | 42.063,39 | 11,98 |
| Inventario | 1.050.175,96 | 1.050.116,24 | 59,72 |

La compra #31 (3 antenas grandes, 3.000 USD) se aprobó hoy y explica los 3.000 USD que faltaban en el inventario. La deuda con ANDY ya se había registrado al crear la compra y se pagó dos minutos después con la transferencia #1851; por eso, al aprobar, el inventario subió 3.000 y el capital subió 3.000.

Los 60,85 USD se reparten así:

| Parte | USD |
|---|---:|
| Inventario | 59,72 |
| Otros (saldos de LINYI y de cuentas, que casi se anulan entre sí) | 1,13 |
| **Total** | **60,85** |

## 2. Causas que se descartaron

- **Operaciones posteriores al último registro del Excel:** hay 4 transferencias de ALBERTO a cuentas (750, 400, 620 y 63.538,17 USD). Son entre cliente y cuenta y no cambian el capital.
- **Distribución de costos:** solo se ha hecho 2 veces en toda la historia (neveras y colchón) y explica apenas 2,66 USD del colchón.
- **Ajustes manuales de saldo:** no hay ninguno en octubre.

## 3. Los 59,72 USD del inventario

Se compararon los 504 productos del Excel con el sistema: **438 coinciden exactamente** en cantidad y costo. La diferencia está en el resto y tiene dos partes.

### 3.1 Unidades que están en un lado y no en el otro: −42,01 USD

| Producto | Qué pasa | USD (Excel − sistema) |
|---|---|---:|
| Escritorio | 2 unidades solo en el Excel (stock de abril a junio) | +172,00 |
| Juguete MLC 36 | 1 unidad solo en el Excel (desde marzo) | +45,00 |
| Cocina | 1 unidad más en el Excel | +20,29 |
| Turbina autosebante | 1 unidad más en el sistema | −40,94 |
| Celular | 1 unidad más en el sistema | −154,00 |
| Petróleo | 45 litros más en el sistema | −84,15 |

**Petróleo, el caso mejor explicado.** El 13-oct el Excel registra dos ventas que el sistema no tiene: 10 litros por 19 USD a REINALDITO y 35 litros a costo (65,45 USD) a BEJUCAL_TIENDA. Los ajustes «PETROLEO_AJUSTE» del Excel (−65,45 y −28,05) son su contrapartida. El efecto en el capital es casi nulo: el inventario baja 84,15 pero las cuentas del Excel suben unos 84,45 (por ejemplo, REINALDITO tiene 19 USD más en el Excel).

### 3.2 Las mismas unidades con otro costo: +101,73 USD

| Producto | Diferencia (USD) | Detalle |
|---|---:|---|
| Olla Reina | +234,24 | 31 unidades más en el lote de 43,92 en el Excel y en el de 36,11 en el sistema |
| Inversor | −136,08 | 7,08 USD de diferencia por unidad |
| Ventilador | −87,41 | costos por lote distintos |
| Lavadora | +47,77 | |
| Batería | +29,76 | 14,88 USD de diferencia por unidad |
| Estación | −29,59 | |

La causa no está confirmada. La hipótesis más probable es que el Excel separa las líneas «[POR AJUSTAR]» y reparte el costo entre lotes de otra manera que el sistema.

## 4. Los 1,13 USD restantes

Es el neto de tres partidas que casi se compensan: LINYI (+1.437,96), las cuentas en USD (−1.405,03) y las cuentas en CUP (−31,80). No se ubicó qué cuentas lo componen; haría falta una lista de equivalencias entre las cuentas del Excel y las del sistema.

## 5. Limitaciones

- El cruce de productos se hizo por nombre y es aproximado, porque el Excel y el sistema nombran distinto algunos productos.
- La causa de las diferencias de costo es una hipótesis.

## 6. Si se quiere cerrar la diferencia

Perseguir los 60,85 USD restantes cuesta más de lo que vale. Si el cliente lo prefiere, estos son los tres puntos concretos:

- [ ] Registrar en el sistema las dos ventas de petróleo del 13-oct (10 L a REINALDITO y 35 L a BEJUCAL_TIENDA), o confirmar que no se hicieron.
- [ ] Ajustar los 2 escritorios y el juguete MLC 36 que solo están en el Excel.
- [ ] Revisar a qué lote de costo pertenecen las 31 ollas Reina de 6 L.
