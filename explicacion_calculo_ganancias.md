# Explicación del Cálculo de Ganancias y Pérdidas Cambiarias

## Ejemplo práctico: USD y CUP

### Datos del ejemplo:
- Moneda principal: USD (1 USD = 1 USD)
- Tasa de cambio secundaria: 1 USD = 365 CUP
- Producto cuesta 120 USD (costo)
- Producto se vende a 110 USD (precio de venta)
- Forma de pago: 10 USD + el resto en CUP

### Cálculo del monto en CUP:
- Monto restante: 110 USD - 10 USD = 100 USD
- En CUP: 100 USD × 365 = 36,500 CUP
- Total pagado: 10 USD + 36,500 CUP

### Escenario 1: Tasa sube a 1 USD = 400 CUP

**Cálculo de la conversión:**
- Los 36,500 CUP equivalen a: 36,500 ÷ 400 = 91.25 USD
- Total recibido en USD: 10 USD + 91.25 USD = 101.25 USD
- Ganancia operacional: 110 USD (venta) - 120 USD (costo) = -10 USD
- Ganancia/pérdida cambiaria: 101.25 USD (recibido) - 110 USD (esperado) = -8.75 USD
- Ganancia real total: -10 USD + (-8.75 USD) = **-18.75 USD**

**Conclusión:** Pérdida cambiaria porque al subir la tasa, los CUP que recibimos equivalen a menos USD de los esperados.

### Escenario 2: Tasa baja a 1 USD = 300 CUP

**Cálculo de la conversión:**
- Los 36,500 CUP equivalen a: 36,500 ÷ 300 = 121.67 USD
- Total recibido en USD: 10 USD + 121.67 USD = 131.67 USD
- Ganancia operacional: 110 USD (venta) - 120 USD (costo) = -10 USD
- Ganancia/pérdida cambiaria: 131.67 USD (recibido) - 110 USD (esperado) = 21.67 USD
- Ganancia real total: -10 USD + 21.67 USD = **11.67 USD**

**Conclusión:** Ganancia cambiaria porque al bajar la tasa, los CUP que recibimos equivalen a más USD de los esperados.

### Escenario 3: Punto de equilibrio

**Cálculo:**
- Para recibir exactamente 110 USD del pago en CUP: 36,500 CUP ÷ 110 USD = 331.82 CUP/USD
- Esto significa que si la tasa es menor a 331.82, obtenemos ganancia cambiaria
- Si la tasa es mayor a 331.82, obtenemos pérdida cambiaria

## Implementación en el sistema

El sistema calcula la ganancia/pérdida cambiaria como:

```
gananciaPerdidaCambiaria = totalPagadoEquivalente - venta.total
```

Donde:
- `totalPagadoEquivalente` es la suma de todos los pagos convertidos a USD
- `venta.total` es el total de la venta en la moneda principal (USD)

Esta fórmula captura perfectamente el impacto de las diferencias en tasas de cambio entre el momento de fijar el precio y el momento de recibir el pago.

## Visualización en la interfaz

En la vista de detalles de venta, se muestran claramente:
1. Ganancia operacional: Diferencia entre precio de venta y costo del producto
2. Ganancia/pérdida cambiaria: Diferencia entre lo esperado recibir y lo realmente recibido en USD
3. Ganancia real total: Suma de ambas ganancias
4. Tasa de cambio principal: Usada como referencia para la venta

Esto permite al vendedor entender claramente el impacto financiero de las fluctuaciones cambiarias en cada transacción.