<?php

/**
 * Detalle de cálculo de ganancias en el sistema de ventas
 * 
 * Este archivo explica cómo se calculan las ganancias y pérdidas en el sistema
 * y cómo se visualizan en la interfaz de usuario.
 */

// Modelo de ejemplo para explicar los cálculos
class CalculoGananciasDetalle
{
    /**
     * Cálculo de ganancia operacional por producto
     */
    public function calcularGananciaOperacionalPorProducto($precioVenta, $costoCompra, $cantidad)
    {
        $gananciaUnitaria = $precioVenta - $costoCompra;
        $gananciaTotalProducto = $gananciaUnitaria * $cantidad;
        
        return [
            'precio_venta' => $precioVenta,
            'costo_compra' => $costoCompra,
            'cantidad' => $cantidad,
            'ganancia_unitaria' => $gananciaUnitaria,
            'ganancia_total_producto' => $gananciaTotalProducto
        ];
    }
    
    /**
     * Cálculo de ganancia operacional total
     */
    public function calcularGananciaOperacionalTotal($items)
    {
        $totalGanancia = 0;
        
        foreach ($items as $item) {
            $gananciaUnitaria = $item['precio_venta'] - $item['costo_unitario'];
            $gananciaTotalItem = $gananciaUnitaria * $item['cantidad'];
            $totalGanancia += $gananciaTotalItem;
        }
        
        return $totalGanancia;
    }
    
    /**
     * Cálculo de ganancia/pérdida cambiaria
     */
    public function calcularGananciaPerdidaCambiaria($totalPagadoEquivalente, $totalVentaOriginal)
    {
        $gananciaPerdidaCambiaria = $totalPagadoEquivalente - $totalVentaOriginal;
        
        return [
            'total_pagado_equivalente' => $totalPagadoEquivalente,
            'total_venta_original' => $totalVentaOriginal,
            'ganancia_perdida_cambiaria' => $gananciaPerdidaCambiaria,
            'tipo' => $gananciaPerdidaCambiaria >= 0 ? 'GANANCIA' : 'PÉRDIDA'
        ];
    }
    
    /**
     * Cálculo de ganancia real total
     */
    public function calcularGananciaRealTotal($gananciaOperacional, $gananciaPerdidaCambiaria)
    {
        $gananciaRealTotal = $gananciaOperacional + $gananciaPerdidaCambiaria;
        
        return [
            'ganancia_operacional' => $gananciaOperacional,
            'ganancia_perdida_cambiaria' => $gananciaPerdidaCambiaria,
            'ganancia_real_total' => $gananciaRealTotal
        ];
    }
    
    /**
     * Cálculo detallado de una venta completa
     */
    public function calcularVentaCompleta($ventaData)
    {
        // Calcular ganancia operacional
        $gananciaOperacional = $this->calcularGananciaOperacionalTotal($ventaData['items']);
        
        // Calcular ganancia/pérdida cambiaria
        $totalPagadoEquivalente = array_sum(array_column($ventaData['pagos'], 'monto_equivalente'));
        $gananciaPerdidaCambiaria = $this->calcularGananciaPerdidaCambiaria(
            $totalPagadoEquivalente, 
            $ventaData['total']
        );
        
        // Calcular ganancia real total
        $gananciaRealTotal = $this->calcularGananciaRealTotal(
            $gananciaOperacional, 
            $gananciaPerdidaCambiaria['ganancia_perdida_cambiaria']
        );
        
        return [
            'ganancia_operacional' => $gananciaOperacional,
            'ganancia_perdida_cambiaria' => $gananciaPerdidaCambiaria,
            'ganancia_real_total' => $gananciaRealTotal,
            'detalle_items' => array_map(function($item) {
                return $this->calcularGananciaOperacionalPorProducto(
                    $item['precio_venta'],
                    $item['costo_unitario'],
                    $item['cantidad']
                );
            }, $ventaData['items'])
        ];
    }
}

// Ejemplo de uso
$calculadora = new CalculoGananciasDetalle();

// Datos de ejemplo de una venta
$ventaEjemplo = [
    'total' => 100.00,
    'items' => [
        [
            'producto_id' => 1,
            'cantidad' => 2,
            'precio_venta' => 30.00,
            'costo_unitario' => 20.00,
            'subtotal' => 60.00
        ],
        [
            'producto_id' => 2,
            'cantidad' => 1,
            'precio_venta' => 40.00,
            'costo_unitario' => 30.00,
            'subtotal' => 40.00
        ]
    ],
    'pagos' => [
        [
            'monto' => 100.00,
            'moneda_id' => 1,
            'tasa_cambio' => 0.85,
            'monto_equivalente' => 117.65
        ]
    ]
];

$resultado = $calculadora->calcularVentaCompleta($ventaEjemplo);

echo "=== CÁLCULO DETALLADO DE GANANCIAS ===\n\n";

echo "Ganancia Operacional: $" . number_format($resultado['ganancia_operacional'], 2) . "\n";
echo "Ganancia/Pérdida Cambiaria: $" . number_format($resultado['ganancia_perdida_cambiaria']['ganancia_perdida_cambiaria'], 2) . 
     " (Tipo: " . $resultado['ganancia_perdida_cambiaria']['tipo'] . ")\n";
echo "Ganancia Real Total: $" . number_format($resultado['ganancia_real_total']['ganancia_real_total'], 2) . "\n\n";

echo "=== DETALLE POR PRODUCTO ===\n";
foreach ($resultado['detalle_items'] as $index => $detalle) {
    echo "Producto " . ($index + 1) . ":\n";
    echo "  Precio Venta: $" . number_format($detalle['precio_venta'], 2) . "\n";
    echo "  Costo Compra: $" . number_format($detalle['costo_compra'], 2) . "\n";
    echo "  Cantidad: " . $detalle['cantidad'] . "\n";
    echo "  Ganancia Unitaria: $" . number_format($detalle['ganancia_unitaria'], 2) . "\n";
    echo "  Ganancia Total Producto: $" . number_format($detalle['ganancia_total_producto'], 2) . "\n\n";
}

echo "=== EXPLICACIÓN DE LA FUNCIONALIDAD DE TASA DE CAMBIO EDITABLE ===\n\n";

echo "1. Durante el proceso de venta, el vendedor puede editar la tasa de cambio temporalmente\n";
echo "2. Esta tasa temporal se aplica solo a esa venta específica\n";
echo "3. La ganancia/pérdida cambiaria refleja la diferencia entre el valor pagado\n";
echo "   con la tasa temporal y el valor original de la venta\n";
echo "4. Esto permite al vendedor adaptarse a condiciones del mercado en tiempo real\n";
echo "5. Todos estos cálculos se visualizan claramente en la vista de detalle de venta\n\n";

echo "=== CAMPOS MOSTRADOS EN LA VISTA DE DETALLE ===\n\n";

echo "- Ganancia Operacional: Diferencia entre precios de venta y costos de compra\n";
echo "- Ganancia/Pérdida Cambiaria: Diferencia por tasas de cambio aplicadas\n";
echo "- Ganancia Real Total: Suma de ambas ganancias\n";
echo "- Tasa Cambio Principal: Tasa usada como referencia para la venta\n";
echo "- Detalles de Pago: Con moneda, monto, tasa aplicada y cuenta destino\n";