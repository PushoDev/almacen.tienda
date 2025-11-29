# Información detallada sobre las ventas y ganancias/pérdidas

## Estructura actual del sistema de ventas

### Controlador: `app/Http/Controllers/VentaController.php`

El controlador maneja las siguientes funcionalidades clave:

1. **Procesamiento de ventas con tasas de cambio editables por operación**
2. **Cálculo de ganancias/pérdidas cambiarias**
3. **Visualización de detalles de ventas**

### Campos importantes en la vista de detalle de venta:

- `total_ganancia`: Ganancia operacional calculada como la diferencia entre el precio de venta y el costo de compra de los productos
- `ganancia_perdida_cambiaria`: Diferencia entre el total pagado en USD y el total de la venta original
- `ganancia_real_total`: Suma de la ganancia operacional y la ganancia/pérdida cambiaria
- `tasa_cambio_principal`: Tasa de cambio principal utilizada en la venta

### Funcionalidad de tasas de cambio editables

En la vista de punto de venta (`/resources/js/pages/Vendor/Index.tsx`), los vendedores pueden:

1. Editar la tasa de cambio para cada pago individual
2. Ver cálculos en tiempo real de la conversión
3. Verificar cómo afecta la tasa de cambio al total en USD

### Visualización en la vista de detalle (`/resources/js/pages/Vendor/Show.tsx`)

La vista de detalle de venta ya muestra:

1. **Resumen de Ganancias** - Sección con 4 bloques:
   - Ganancia Operacional
   - Ganancia/Pérdida Cambiaria
   - Ganancia Real Total
   - Tasa Cambio Principal

2. **Detalles de Pago** - Con información sobre:
   - Moneda de cada pago
   - Monto original
   - Equivalente en USD
   - Tasa de cambio aplicada
   - Cuenta destino

## Mejoras sugeridas para visualización clara de ganancias/pérdidas

### 1. En la vista de detalle de venta (Show.tsx)

Ya está bien implementado con secciones claras, pero se podría mejorar con:

- Cálculos más detallados mostrando cómo se obtuvieron las ganancias
- Gráficos o indicadores visuales para ganancias/pérdidas
- Desglose por producto de las ganancias individuales

### 2. En la vista de punto de venta (Index.tsx)

- Mostrar un resumen de ganancias potenciales antes de finalizar la venta
- Indicar cómo afecta cada cambio de tasa de cambio a la ganancia total

### 3. Cálculo de ganancia/pérdida cambiaria

En el controlador `VentaController.php`, en el método `aprobarVenta`:

```php
// AÑADIDO: Calcular ganancia/pérdida cambiaria
$gananciaPerdidaCambiaria = $totalPagadoEquivalente - $venta->total;
$gananciaRealTotal = $venta->total_ganancia + $gananciaPerdidaCambiaria;

// Actualizar estado de la venta y añadir nuevos cálculos
$venta->update([
    'estado' => 'completada',
    'ganancia_perdida_cambiaria' => $gananciaPerdidaCambiaria,
    'ganancia_real_total' => $gananciaRealTotal,
]);
```

## Resumen de ganancias/pérdidas

### Ganancia Operacional
- Cálculo: (Precio de venta - Costo de compra) × Cantidad para cada producto
- Representa la ganancia real del negocio por la diferencia entre costos y precios

### Ganancia/Pérdida Cambiaria
- Cálculo: Total pagado en USD - Total de la venta original
- Representa la ganancia o pérdida debida a fluctuaciones en las tasas de cambio
- Puede ser positiva (ganancia) o negativa (pérdida)

### Ganancia Real Total
- Cálculo: Ganancia Operacional + Ganancia/Pérdida Cambiaria
- Representa la ganancia total real del negocio considerando todas las variables

## Funcionalidad de tasa de cambio editable

Los vendedores pueden editar temporalmente la tasa de cambio durante una venta específica:

1. En el formulario de pago, hay un campo para ingresar la tasa de cambio
2. El sistema calcula automáticamente el equivalente en USD
3. Al aprobar la venta, se registran los efectos de esta tasa temporal
4. La ganancia/pérdida cambiaria refleja el impacto de usar tasas diferentes a las oficiales

Esta funcionalidad permite a los vendedores adaptarse a condiciones del mercado en tiempo real y se refleja claramente en los cálculos finales de ganancias/pérdidas.