# Conciliación del Excel con el sistema

Fecha: 2026-10-21 · Para: el cliente

**El sistema y el Excel coinciden:** el capital queda a 3.061 USD (0,24 %) de diferencia y las ventas de octubre cuadran casi al dólar. Lo que no coincide es qué se entiende por «ganancia».

## 1. Resumen

Se compararon el Excel del 20-10 (cierre a las 21:56, hora de Cuba) y una copia de la base del sistema del 21-10 (03:49 UTC). Todas las cifras en USD, con el CUP a 840, igual que el Excel.

| Concepto | Excel | Sistema | Diferencia (Excel − sistema) |
|---|---:|---:|---:|
| Capital | 1.295.079,37 | 1.292.018,52 | +3.060,85 |
| Mes anterior (cierre de septiembre) | 1.253.004,00 | 1.252.955,13 | +48,87 |
| Ventas de octubre, ingresos (1 al 20) | 376.183,29 | 376.466,30 | −283,01 |
| Ventas de octubre, margen | 69.074,82 | 69.068,84 | +5,98 |
| Comisión de ventas | 3.883,36 | 5.131,40 | −1.248,04 |
| Ganancia de ventas (margen − comisión ± cambiaria) | 64.888,50 | 63.482,64 | +1.405,86 |

Día por día algunas ventas caen en otro día (el Excel no registra los domingos y los pasa al lunes), pero el total del mes coincide.

## 2. De dónde sale la diferencia de capital

| Partida | Excel | Sistema | Diferencia |
|---|---:|---:|---:|
| Inventario | 1.050.175,96 | 1.047.116,24 | +3.059,72 |
| Clientes y proveedores | −50.319,83 | −51.757,79 | +1.437,96 |
| Cuentas en USD, EUR y MLC | 284.296,70 | 285.701,73 | −1.405,03 |
| Cuentas en CUP (a 840) | 10.926,54 | 10.958,34 | −31,80 |
| **Total** | **1.295.079,37** | **1.292.018,52** | **+3.060,85** |

- **Inventario (+3.059,72):** 3.000 son la **compra #31**, tres antenas grandes a 1.000 USD para el almacén CALVARIO TIENDA («DANIEL ALMACEN» en el Excel). Se creó el 20-10 a las 22:08 UTC y sigue **pendiente de aprobar**: el sistema solo suma la mercancía al stock al aprobar la compra, y el Excel ya la contaba. Los 60 USD restantes son diferencias menores de unidades y costos. De 504 productos, 437 coinciden exactamente en cantidad y costo.
- **Clientes y proveedores (+1.437,96):** corresponde a LINYI, que el Excel lleva con +1.437,80 como proveedor y que en el sistema no tiene saldo.
- **Cuentas (−1.405,03 en USD y −26.710 CUP, unos −32 USD):** **sin ubicar todavía.** Los nombres de las cuentas del Excel y del sistema no coinciden y no se puede cruzar con seguridad; hace falta una lista de equivalencias.

## 3. Por qué la «ganancia» no coincide

Son dos medidas distintas:

- **«Acumulado actual» del Excel (42.075,37)** es el capital de hoy menos el del mes anterior: el **crecimiento del capital**, que ya incluye gastos e ingresos.
- **«Ganancia Neta del Mes» del Dashboard (63.042,90)** suma solo la ganancia de ventas y de transferencias; **no resta gastos ni suma ingresos**.

| Puente (octubre) | USD |
|---|---:|
| Ganancia neta del Dashboard (ventas + transferencias) | 63.042,90 |
| Menos gastos reales | −41.552,79 |
| Más ingresos reales | +21.485,08 |
| **Resultado** | **42.975,19** |
| Acumulado actual del Excel | 42.075,37 |

El puente llega a unos 900 USD del Excel. El crecimiento del capital calculado dentro del sistema es de 39.000 a 40.300 según la tasa del CUP que se use para septiembre, a unos 2.000–3.000 del Excel (la misma diferencia del capital).

**Dos errores del 16-10 inflan los totales de gastos e ingresos** (no cambian el capital porque se anulan entre sí): el ingreso #1692 de 250.000 USD («ERROR AL MONTAR») y el gasto #1693 de 205.000.000 CUP. Se excluyeron de la tabla de arriba; con ellos, los gastos de octubre serían 291.553 en vez de 41.553.

## 4. Qué hay que decidir o confirmar

- [ ] **Tarjeta «Ganancia Neta del Mes» del Dashboard:** ¿que muestre el crecimiento del capital (como el Excel), la ganancia neta menos gastos, o que solo cambie de nombre?
- [ ] **Compra #31** (3 antenas, 3.000 USD): ¿se aprueba o se descarta? Está registrada como compra a crédito con ANDY; al aprobarla el inventario sube 3.000 y la deuda con ANDY aumenta lo mismo, así que el capital no cambia. ¿Cómo se pagó en realidad?
- [ ] **LINYI:** ¿el saldo de +1.437,80 es real? Si lo es, hay que registrarlo en el sistema.
- [ ] **Cuentas:** una lista de equivalencias entre las cuentas del Excel y las del sistema, para cerrar los 1.405 USD sin ubicar.
- [ ] **Comisión:** el Excel registra 3.883 y el sistema 5.131 en octubre. ¿Cuándo anota el Excel la comisión: al vender o al pagarla?
- [ ] **Errores del 16-10** (#1692 y #1693): ¿se corrigen o se dejan?

## 5. Solución propuesta

Nada de esto se ha aplicado todavía; cada punto espera la respuesta del cliente de la sección 4.

| Tema | Solución | Efecto |
|---|---|---|
| Ganancia en el Dashboard | Mostrar como cifra principal el **crecimiento del capital del mes** (capital actual − cierre del mes anterior), que es lo que el Excel llama «Acumulado actual», y renombrar la tarjeta actual a «Ganancia de ventas y transferencias» para que no se lea como ganancia final. Opcionalmente, una línea «menos gastos» para llegar al mismo número | Las dos cifras dejan de contradecirse: cada una dice lo que mide |
| Mes anterior | Usar siempre el cierre guardado por el sistema y no un número escrito a mano en el Excel | El «Mes anterior» y el acumulado salen siempre de la misma fuente |
| Compra #31 | Aprobarla (o anularla si no se hizo). Para que no vuelva a pasar, mostrar en el Dashboard una línea «Inventario pendiente de aprobar» | El inventario del sistema sube 3.000 y coincide con el Excel; el capital no cambia (queda como deuda con ANDY) |
| LINYI | Si el saldo de +1.437,80 es real, registrarlo como saldo del cliente LINYI | Cierra 1.438 USD de la diferencia de capital |
| Cuentas | Con la lista de equivalencias, comparar cuenta por cuenta y corregir las que difieran | Cierra los 1.405 USD sin ubicar |
| Comisión | Cuando se sepa si el Excel la anota al vender o al pagar, alinear el criterio o mostrar ambas cifras | Explica los 1.248 USD de diferencia |
| Errores del 16-10 | Anular el ingreso #1692 y el gasto #1693 | Los totales de gastos e ingresos de octubre dejan de estar inflados; el capital no cambia |
| Control mensual | Repetir esta conciliación al cerrar cada mes, con el capital del sistema contra el del Excel | Las diferencias se ven en días y no en semanas |

Con estos puntos aplicados, la diferencia de capital debería quedar por debajo de 100 USD.

## 6. Cómo se hizo la comparación

- El Excel se leyó completo: la hoja `INICIO` (capital), `CUENTAS`, `PRODUCTOS`, `ALMACEN` y `REGISTRO` (41.704 operaciones).
- En `REGISTRO` las fechas con día 12 o menos están guardadas con **mes y día invertidos** (el 01/04 aparece como 4 de enero). Se corrigieron antes de sumar y se validaron con los códigos de operación (6.158 de 6.158 coinciden).
- La última operación del Excel (transferencia de 620 USD entre ALBERTO e ISLAMIA) no genera ganancia ni gasto y no altera la comparación.
- No se modificó ningún dato del sistema.
