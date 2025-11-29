Eres un senior Laravel developer especializado en contabilidad multicurrency y riesgo cambiario.

Tengo un sistema de ventas en Laravel donde:

- Los productos se venden en CUP (moneda local).
- Todos los costos son en USD.
- El precio de venta en CUP se calcula usando una tasa de cambio "planeada" (la que el vendedor decide al momento de la venta).
- Al recibir el pago (en CUP o cualquier moneda), se convierte a USD usando la tasa REAL del momento del cobro (mercado informal).

El objetivo contable es:

1. Ganancia Operacional = (Precio venta CUP - Costo USD convertido) × cantidad → esto ya lo tengo en total_ganancia
2. Ganancia/Pérdida Cambiaria = Ingreso real recibido en USD - Ingreso esperado en USD (calculado con la tasa planeada)
3. Ganancia Real Total = Ganancia Operacional + Ganancia/Pérdida Cambiaria

Actualmente tengo estos campos en la tabla ventas:

- total (en CUP)
- total_ganancia (ganancia operacional en USD)
- tasa_cambio_principal (la tasa planeada CUP/USD, ej: 356)
- ganancia_perdida_cambiaria (actualmente mal calculado)
- ganancia_real_total

El error actual está en el método aprobarVenta():
$gananciaPerdidaCambiaria = $totalPagadoEquivalente - $venta->total; ← ESTO ESTÁ MAL porque resta USD con CUP.

Adjunto el controlador completo: [pega aquí todo el contenido de VentaController.php que me diste]

TAREA EXACTA QUE DEBES HACER (sin explicaciones largas, solo código limpio y funcional):

1. Crea la migración para añadir el campo:
   nullable decimal total_esperado_usd (15,4) a la tabla ventas

2. Modifica el modelo Venta con fillable y cast correspondiente

3. En el método procesarVenta(), justo después de crear la venta y antes del commit:

    - Calcula y guarda en la venta: total_esperado_usd = $venta->total / $venta->tasa_cambio_principal

4. En el método aprobarVenta():

    - Calcula correctamente:
      $ingreso_real_usd = $venta->pagos->sum('monto_equivalente');
     $ingreso_esperado_usd = $venta->total / $venta->tasa_cambio_principal; // o usar el campo nuevo
     $ganancia_perdida_cambiaria = $ingreso_real_usd - $ingreso_esperado_usd;
     $ganancia_real_total = $venta->total_ganancia + $ganancia_perdida_cambiaria;
    - Actualiza la venta con estos valores

5. Bonus (opcional pero ideal): modifica el método show() y listadoVentas() para usar el nuevo campo total_esperado_usd si existe, y mantener compatibilidad hacia atrás.

Devuélveme SOLO:

- La migración completa
- Los cambios exactos en el modelo Venta
- Los fragmentos de código exactos a reemplazar/modificar en VentaController (con comentarios // CAMBIO AQUÍ)
- Nada más. Sin introducciones, sin "como IA", sin markdown innecesario.

¡Ejecuta ya!
