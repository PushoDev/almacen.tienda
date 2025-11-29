# Ejemplo Detallado de Venta con Ganancias/Pérdidas Cambiarias

## Escenario Base
- Producto cuesta: 120 USD (costo real)
- Precio de venta: 110 USD (vendido a menor precio por descuento)
- Moneda principal: USD (tasa base 1.000000)
- Tasa de cambio: 1 USD = 365 CUP
- Pago: 10 USD + resto en CUP (100 USD equivalentes en CUP)

## Cálculos Detallados

### Monto en CUP para el pago:
- 100 USD × 365 = 36,500 CUP

## Escenario 1: Tasa SUBE a 400 CUP/USD
- 36,500 CUP ÷ 400 = 91.25 USD
- Total recibido: 10 USD + 91.25 USD = 101.25 USD
- Ganancia real: 101.25 USD - 120 USD (costo) = -18.75 USD (pérdida)
- Ganancia operacional: 110 USD - 120 USD = -10 USD
- Ganancia/pérdida cambiaria: -18.75 - (-10) = -8.75 USD (pérdida cambiaria)

## Escenario 2: Tasa BAJA a 300 CUP/USD
- 36,500 CUP ÷ 300 = 121.67 USD
- Total recibido: 10 USD + 121.67 USD = 131.67 USD
- Ganancia real: 131.67 USD - 120 USD = 11.67 USD (ganancia)
- Ganancia operacional: 110 USD - 120 USD = -10 USD
- Ganancia/pérdida cambiaria: 11.67 - (-10) = 21.67 USD (ganancia cambiaria)

## Punto de Equilibrio
- Para recibir exactamente 110 USD (precio de venta): 36,500 CUP ÷ 110 USD = 331.82 CUP/USD
- Si la tasa es mayor a 331.82, recibes menos de 110 USD (pérdida cambiaria)
- Si la tasa es menor a 331.82, recibes más de 110 USD (ganancia cambiaria)

## Resumen Visual:

| Tasa CUP/USD | Pago en CUP | Valor en USD | Total Recibido (USD) | Ganancia Real (USD) | Ganancia Operacional (USD) | Ganancia/Pérdida Cambiaria (USD) |
| :----------- | :---------- | :----------- | :------------------- | :------------------ | :------------------------- | :------------------------------- |
| **300**      | 36,500      | 121.67       | 131.67               | 11.67               | -10                        | 21.67                            |
| **365**      | 36,500      | 100.00       | 110.00               | -10.00              | -10                        | 0.00                             |
| **400**      | 36,500      | 91.25        | 101.25               | -18.75              | -10                        | -8.75                            |

## Cálculos en el Sistema
El sistema debe calcular:
1. Ganancia Operacional = Precio Venta - Costo Producto
2. Ganancia Real Total = Valor Total Recibido - Costo Producto
3. Ganancia/Pérdida Cambiaria = Ganancia Real Total - Ganancia Operacional