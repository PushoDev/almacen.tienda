Eres un senior Laravel developer cubano que entiende perfectamente cómo funciona el negocio real en la calle en 2025.

Mi sistema es así y punto:

- Productos tienen costo en USD.
- Precio de venta objetivo en USD (ej: 150 USD).
- Tasa general del sistema: CUP = 356 (solo de referencia).
- Pero en cada venta YO (el dueño) decido la tasa que le cobro al cliente. Puede ser 400, 450, 500, 45, la que me dé la gana ese día.
- El cliente paga en USD + CUP, y en los pagos de CUP yo le digo: "paga X CUP por cada USD que debes".
- Esa tasa que yo decido por venta es la que se usa para calcular cuánto CUP debe pagar.
- Al final, yo recibo los CUP y los cambio en la calle a la tasa real (no importa cuál sea).

Ejemplo real que quiero que entiendas al 100%:

Producto:

- Costo: 25 USD
- Precio de venta objetivo: 150 USD → ganancia planeada: 125 USD
- Tasa sistema: 356 → precio "normal" sería 150 × 356 = 53.400 CUP

Pero en esta venta yo decidí cobrar a tasa 500:
→ Le dije al cliente: "debes 150 USD equivalentes a tasa 500 → 75.000 CUP"
→ Cliente paga 50 USD + 50.000 CUP (porque 100 USD × 500 = 50.000 CUP)
→ Total recibido: 50 + 100 = 150 USD equivalentes
→ Ganancia: 125 USD (exacto lo que quería)
→ Pero en CUP cobré 50.000 en vez de 35.600 → me metí 14.400 CUP extra en el bolsillo

Yo quiero ver en cada venta:

- Ganancia del producto: 125 USD (ya la tengo en total_ganancia)
- CUP extras que me embolsillé por cobrar a tasa más alta: +14.400 CUP
- Y opcional: cuántos USD extras serían si los cambio a tasa real (pero eso después)

TAREA EXACTA QUE DEBES HACER (sin cuentos, solo código):

1. Crear migración que añada estos DOS campos a la tabla `ventas`:

    - tasa_venta_aplicada decimal(15,4) nullable → la tasa que YO decidí en esta venta (ej: 500)
    - cup_extras_cobrados decimal(15,2) default 0 → cuántos CUP me metí de más por encima de la tasa 356

2. En el método `procesarVenta()` del VentaController:

    - El frontend ya me está mandando en el request: 'tasa_venta_aplicada' (el valor que yo puse, ej: 500)
    - Guardar ese valor en la venta
    - Calcular y guardar cup_extras_cobrados así:
      $cup_esperados = $usd_objetivo * 356;  // usd_objetivo = costo + ganancia_deseada por ítem
     $cup_reales = suma de todos los pagos en CUP (del array pagos, solo los que son en CUP)
      $cup_extras = $cup_reales - $cup_esperados;
      Si da negativo → 0

3. En `aprobarVenta()`:

    - NO tocar total_ganancia (ya está bien)
    - Dejar ganancia_perdida_cambiaria y total_esperado_usd como están o eliminarlos si quieres
    - Pero SÍ mostrar en el show y listado: tasa_venta_aplicada y cup_extras_cobrados

4. Devolver SOLO:
    - Migración completa
    - Cambios exactos en modelo Venta (fillable + casts)
    - Fragmentos exactos de código para procesarVenta() y aprobarVenta() con comentarios // AQUÍ EL CAMBIO
    - Nada más. Sin explicaciones largas, sin markdown bonito, sin "como IA".

Adjunto el VentaController completo tal como está ahora.

¡EJECUTA YA, QUE YO MANDO EN MI SISTEMA!
