Eres un experto Laravel 12 + Inertia + React/TypeScript que conoce perfectamente mi proyecto.

Mi proyecto tiene estos modelos relevantes:

- app/Models/Venta.php
- app/Models/PagoVenta.php
- app/Models/Moneda.php
- app/Models/VentaDetalle.php
- app/Models/Producto.php

El controlador principal es: app/Http/Controllers/VentaController.php

Necesito implementar el cálculo exacto de ganancia/pérdida cambiaria por tasa aplicada vs tasa oficial, permitiendo valores positivos y negativos.

REQUISITERO: SÍ debe permitir valores negativos (pérdida) cuando el vendedor cobra por debajo de la tasa oficial.

Datos que ya llegan del frontend en el request de crear venta:

- tasa_aplicada_venta (decimal, ejemplo: 500)
- moneda_cobro_id (id de la moneda en que se aplicó esa tasa, ejemplo: CUP)
- pagos[] → array con todos los pagos (pueden ser en varias monedas)
- items[] → productos vendidos
- total → total en la moneda de cobro (ej: 75000 CUP)

Objetivo final:
Calcular y guardar en la tabla ventas:
→ monto_diferencia_cambiaria (decimal 16,2) → puede ser positivo, negativo o cero

Fórmula exacta que debe usar:

1. USD objetivo real = suma de (costo_unitario \* cantidad) + ganancia_total_productos
   (esto ya lo tienes como $total_esperado_usd o puedes recalcularlo)

2. Si existe moneda_cobro_id y tasa_aplicada_venta:

    - tasa_oficial = Moneda::find(moneda_cobro_id)->tasa_cambio
    - monto_esperado_oficial = USD_objetivo \* tasa_oficial
    - monto_real_cobrado = suma de pagos donde moneda_id == moneda_cobro_id
    - monto_diferencia_cambiaria = monto_real_cobrado - monto_esperado_oficial

3. Si no hay moneda_cobro_id → monto_diferencia_cambiaria = 0

Tareas concretas que quiero que me entregues (código listo para copiar-pegar):

1. Migración Laravel completa para añadir a la tabla ventas:

    - tasa_aplicada_venta (decimal 12,4 nullable)
    - moneda_cobro_id (unsignedBigInteger nullable + foreign key a monedas.id)
    - monto_diferencia_cambiaria (decimal 16,2 default 0)

2. Relación en el modelo Venta.php:
   public function monedaCobro() { return $this->belongsTo(Moneda::class, 'moneda_cobro_id'); }

3. En VentaController@procesarVenta:

    - Validación de los dos campos nuevos
    - Cálculo exacto del monto_diferencia_cambiaria (permitiendo negativos)
    - Guardado correcto en la creación y actualización de la venta

4. En los métodos listadoVentas() y show():

    - Cargar la relación ->with('monedaCobro')
    - Devolver en el array:
      'tasa_aplicada_venta'
      'moneda_cobro' => $venta->monedaCobro ? [...codigo, simbolo...] : null
      'monto_diferencia_cambiaria'

5. Ejemplo visual para frontend (React/Inertia):
   Cómo mostrar en Show.tsx y Listado.tsx el monto_diferencia_cambiaria con:
    - Verde y "+" si > 0
    - Rojo y "-" si < 0
    - Gris y "0.00" si = 0
    - Con el símbolo de la moneda de cobro

Ejemplos que debe manejar correctamente:

- Venta 150 USD objetivo, tasa oficial CUP 430 → debe pagar 64,500 CUP
  → Cobra a 500 → paga 75,000 → +10,500 (ganancia cambiaria)
  → Cobra a 400 → paga 60,000 → -4,500 (pérdida cambiaria)
  → Cobra a 430 → paga 64,500 → 0.00

Entrega todo el código listo para copiar-pegar, sin explicaciones largas, en español cubano directo, con comentarios claros tipo “// Aquí se calcula la diferencia real, puede ser negativa”.

¡Este es el prompt definitivo para que cualquier IA me lo haga perfecto en mi proyecto real! o sea Listaos, fuera, Empieza!
