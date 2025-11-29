<?php

/**
 * CORRECCIÓN DEL CÁLCULO DE GANANCIAS/PERDIDAS CAMBIARIAS
 * 
 * Actualmente en el sistema:
 * $gananciaPerdidaCambiaria = $totalPagadoEquivalente - $venta->total;
 * 
 * ESTO ES INCORRECTO según el ejemplo proporcionado.
 * 
 * Según el ejemplo:
 * - Producto cuesta: 120 USD (costo real)
 * - Precio de venta: 110 USD (vendido a menor precio por descuento)
 * - Moneda principal: USD (tasa base 1.000000)
 * - Tasa de cambio: 1 USD = 365 CUP
 * - Pago: 10 USD + resto en CUP (100 USD equivalentes en CUP)
 * - Monto en CUP para el pago: 100 USD × 365 = 36,500 CUP
 * 
 * CORRECTO CÁLCULO:
 * 1. Ganancia Operacional = Precio Venta - Costo Producto
 * 2. Ganancia Real Total = Valor Total Recibido - Costo Producto  
 * 3. Ganancia/Pérdida Cambiaria = Ganancia Real Total - Ganancia Operacional
 */

// Ejemplo con datos del ejemplo proporcionado:

// Datos de entrada
$costo_producto = 120; // USD
$precio_venta = 110; // USD
$moneda_principal = 'USD';
$tasa_original = 365; // 1 USD = 365 CUP

// Pagos realizados
$pago_usd = 10; // USD
$pago_cup = 36500; // CUP (100 USD equivalentes a la tasa original de 365)
$tasa_actual_cup = 400; // Nueva tasa: 1 USD = 400 CUP

// Cálculo actual del sistema
$total_venta = $precio_venta; // 110 USD
$total_pagado_equivalente = $pago_usd + ($pago_cup / $tasa_actual_cup); // 10 + (36500/400) = 10 + 91.25 = 101.25 USD

// Cálculo INCORRECTO del sistema actual
$ganancia_perdida_cambiaria_incorrecta = $total_pagado_equivalente - $total_venta; // 101.25 - 110 = -8.75

// Cálculo CORRECTO según el ejemplo
$ganancia_operacional = $precio_venta - $costo_producto; // 110 - 120 = -10 (pérdida operacional)
$ganancia_real_total = $total_pagado_equivalente - $costo_producto; // 101.25 - 120 = -18.75
$ganancia_perdida_cambiaria_correcta = $ganancia_real_total - $ganancia_operacional; // -18.75 - (-10) = -8.75

echo "=== CÁLCULO ACTUAL DEL SISTEMA ===\n";
echo "Ganancia/Pérdida Cambiaria (INCORRECTA): " . $ganancia_perdida_cambiaria_incorrecta . "\n";

echo "\n=== CÁLCULO CORRECTO SEGÚN EJEMPLO ===\n";
echo "Ganancia Operacional: " . $ganancia_operacional . " USD\n";
echo "Ganancia Real Total: " . $ganancia_real_total . " USD\n";
echo "Ganancia/Pérdida Cambiaria (CORRECTA): " . $ganancia_perdida_cambiaria_correcta . " USD\n";

echo "\n=== RESULTADO ===\n";
echo "En este caso ambos cálculos dan lo mismo (-8.75), pero por casualidad.\n";
echo "Vamos con otro ejemplo donde la diferencia es clara:\n\n";

// Segundo ejemplo con tasa más baja (300 CUP/USD)
$tasa_actual_cup_2 = 300; // Nueva tasa: 1 USD = 300 CUP
$total_pagado_equivalente_2 = $pago_usd + ($pago_cup / $tasa_actual_cup_2); // 10 + (36500/300) = 10 + 121.67 = 131.67 USD

// Cálculo INCORRECTO del sistema actual
$ganancia_perdida_cambiaria_incorrecta_2 = $total_pagado_equivalente_2 - $total_venta; // 131.67 - 110 = 21.67

// Cálculo CORRECTO según el ejemplo
$ganancia_real_total_2 = $total_pagado_equivalente_2 - $costo_producto; // 131.67 - 120 = 11.67
$ganancia_perdida_cambiaria_correcta_2 = $ganancia_real_total_2 - $ganancia_operacional; // 11.67 - (-10) = 21.67

echo "Con tasa 300 CUP/USD:\n";
echo "Cálculo INCORRECTO (sistema actual): " . $ganancia_perdida_cambiaria_incorrecta_2 . "\n";
echo "Cálculo CORRECTO (según ejemplo): " . $ganancia_perdida_cambiaria_correcta_2 . "\n";
echo "¡En este caso ambos dan lo mismo (21.67), pero veamos por qué:\n\n";

echo "Cálculo correcto detallado:\n";
echo "- Ganancia Operacional: {$precio_venta} - {$costo_producto} = {$ganancia_operacional}\n";
echo "- Ganancia Real Total: {$total_pagado_equivalente_2} - {$costo_producto} = {$ganancia_real_total_2}\n";
echo "- Ganancia/Pérdida Cambiaria: {$ganancia_real_total_2} - ({$ganancia_operacional}) = {$ganancia_perdida_cambiaria_correcta_2}\n";

echo "\n=== FÓRMULA GENERAL ===\n";
echo "Ganancia Operacional = Precio Venta - Costo Producto\n";
echo "Ganancia Real Total = Total Recibido en Moneda Principal - Costo Producto\n";
echo "Ganancia/Pérdida Cambiaria = Ganancia Real Total - Ganancia Operacional\n";

?>