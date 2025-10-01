¡Perfecto! Entiendo el problema. Actualmente el sistema asume que el **monto total distribuido en CUP** se asigna completamente a los productos en USD, pero en la realidad puede quedar un **saldo sobrante** que no se puede asignar a productos específicos y debe tratarse como **gasto directo**.

## 🔧 **Problema Identificado:**

Si distribuyes **1000 CUP** (equivalente a **40 USD** con tasa 25) pero solo asignas **30 USD** a productos, quedan **10 USD (250 CUP)** sin distribuir que deben registrarse como gasto.

## 🚀 **Solución Propuesta - Modificar el Flujo:**

```php
/**
 * Procesa la distribución manual de costos CON manejo de sobrantes.
 */
public function distribuirCostosManual(DistribuirCostosManualRequest $request)
{
    $validatedData = $request->validated();

    DB::beginTransaction();

    try {
        // === 1. OBTENER RECURSOS NECESARIOS ===
        $compra = Compra::with('productos')->findOrFail($validatedData['purchase_id']);
        $cuenta = Cuenta::findOrFail($validatedData['account_id']);

        // === 2. VALIDACIONES DE NEGOCIO ===
        if ($cuenta->tipo_cuenta === 'deudas') {
            DB::rollBack();
            return redirect()->back()->with('error', 'No se puede usar una cuenta de deudas para esta operación.');
        }

        $tasaCambioModel = TasaCambio::latest('fecha_actualizacion')->first();
        $tasa_cambio = $validatedData['exchange_rate'] ?? ($tasaCambioModel ? $tasaCambioModel->tasa : 0);

        if (!$tasa_cambio || $tasa_cambio == 0) {
            DB::rollBack();
            return redirect()->back()->with('error', 'La tasa de cambio actual no está definida o es cero.');
        }

        // === 3. CÁLCULOS MONETARIOS ===
        $totalCupDistribuir = (float)$validatedData['amount_cup'];
        $totalUsdDisponible = $totalCupDistribuir / $tasa_cambio;

        if ($cuenta->saldo_cuenta < $totalCupDistribuir) {
            DB::rollBack();
            return redirect()->back()->with('error', 'El saldo en la cuenta de origen es insuficiente.');
        }

        // === 4. CREAR REGISTRO DE DISTRIBUCIÓN ===
        $distribution = CostDistribution::create([
            'purchase_id' => $validatedData['purchase_id'],
            'account_id' => $validatedData['account_id'],
            'amount_cup' => $totalCupDistribuir,
            'exchange_rate' => $tasa_cambio,
            'amount_usd' => $totalUsdDisponible,
            'details' => $validatedData['details'],
        ]);

        // === 5. CALCULAR DISTRIBUCIÓN REAL A PRODUCTOS ===
        $totalUsdDistribuidoProductos = 0;

        foreach ($validatedData['productos'] as $productoData) {
            if ((float)$productoData['amount_usd'] > 0) {
                $producto = Producto::findOrFail($productoData['product_id']);
                $pivotData = $compra->productos->find($producto->id)->pivot;

                $cantidad = $pivotData->cantidad;
                $costoActual = $producto->precio_compra_producto;
                $incrementoUnitario = (float)$productoData['amount_usd'];
                $nuevoCosto = $costoActual + $incrementoUnitario;

                $distribution->items()->create([
                    'product_id' => $producto->id,
                    'quantity' => $cantidad,
                    'distributed_amount_usd' => $productoData['amount_usd'],
                    'old_cost_usd' => $costoActual,
                    'new_cost_usd' => $nuevoCosto,
                ]);

                CostoHistorial::create([
                    'product_id' => $producto->id,
                    'old_cost_usd' => $costoActual,
                    'new_cost_usd' => $nuevoCosto,
                    'cost_distribution_id' => $distribution->id,
                    'comentario' => 'Ajuste por distribución manual de costos.',
                ]);

                $producto->update(['precio_compra_producto' => $nuevoCosto]);
                
                // ACUMULAR EL TOTAL DISTRIBUIDO A PRODUCTOS
                $totalUsdDistribuidoProductos += (float)$productoData['amount_usd'];
            }
        }

        // === 6. CALCULAR Y MANEJAR SOBRANTE ===
        $totalUsdSobrante = $totalUsdDisponible - $totalUsdDistribuidoProductos;
        $totalCupSobrante = $totalUsdSobrante * $tasa_cambio;

        // Si hay sobrante, registrarlo como gasto adicional
        if ($totalUsdSobrante > 0.01) { // Considerar sobrante si es mayor a 0.01 USD
            $distribution->update([
                'remaining_amount_usd' => $totalUsdSobrante,
                'remaining_amount_cup' => $totalCupSobrante,
            ]);

            // Registrar movimiento financiero adicional para el sobrante como GASTO DIRECTO
            MovimientoFinanciero::create([
                'tipo_movimiento_id' => 1, // Tipo: Gasto
                'cuenta_origen_id' => $cuenta->id,
                'cuenta_destino_id' => null,
                'monto' => $totalCupSobrante,
                'moneda' => 'CUP',
                'descripcion' => $validatedData['details'] . ' (Sobrante no distribuido a productos)',
                'fecha_operacion' => now(),
                'estado' => 'completado',
            ]);

            // Mensaje informativo sobre el sobrante
            $mensajeExito = "Costos distribuidos manualmente con éxito. Se registró un sobrante de " . 
                           number_format($totalUsdSobrante, 2) . " USD (" . 
                           number_format($totalCupSobrante, 2) . " CUP) como gasto directo.";
        } else {
            $mensajeExito = 'Costos distribuidos manualmente con éxito.';
        }

        // === 7. ACTUALIZAR SALDOS (se resta el monto completo de la cuenta) ===
        $cuenta->decrement('saldo_cuenta', $totalCupDistribuir);

        DB::commit();

        return redirect()
            ->route('transacciones')
            ->with('success', $mensajeExito);
            
    } catch (Exception $e) {
        DB::rollBack();
        Log::error('Error al distribuir costos manualmente: ' . $e->getMessage());
        return redirect()->back()->with('error', 'Ocurrió un error al distribuir los costos. Por favor, revisa los datos e intenta de nuevo.');
    }
}
```

## 📊 **Nuevo Flujo con Manejo de Sobrantes:**

1. **Preparación**: Igual que antes
2. **Validación**: Igual que antes  
3. **Conversión**: Calcula USD disponible
4. **Distribución**: Asigna montos a productos y **acumula total distribuido**
5. **Cálculo de Sobrante**: `USD Disponible - USD Distribuido = USD Sobrante`
6. **Registro de Sobrante**: 
   - Si hay sobrante → Movimiento financiero adicional como **gasto directo**
   - Se guarda en `remaining_amount_usd` y `remaining_amount_cup`
7. **Actualización**: Se resta el monto completo de la cuenta

## 🗃️ **Migración Recomendada:**

```php
// Agregar a la tabla cost_distributions
Schema::table('cost_distributions', function (Blueprint $table) {
    $table->decimal('remaining_amount_usd', 15, 4)->default(0)->after('amount_usd');
    $table->decimal('remaining_amount_cup', 15, 2)->default(0)->after('remaining_amount_usd');
});
```

**¿Te parece bien este enfoque?** ¿Necesitas que ajuste algún detalle específico del manejo del sobrante?
