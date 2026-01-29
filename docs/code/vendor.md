Claro, aquí tienes un *prompt* claro y conciso que puedes usar para pedirle a OpenCode (o cualquier otra IA de código) que implemente la funcionalidad deseada en tu archivo `Index.tsx`.

---

**Prompt para OpenCode:**

Hola, necesito modificar mi componente de punto de venta en `Index.tsx` para que el campo "Monto a Pagar" en el modal de procesamiento de venta se llene automáticamente con el saldo restante de la venta en la moneda seleccionada.

**Estado Actual:**

*   Tengo un estado `currentPayment` que gestiona los datos del pago en curso, incluyendo `method`, `moneda_id`, `amount`, `exchangeRate`, `cuenta_id`, `cliente_id`.
*   Existe un estado `remainingInUsd` calculado como `calcularTotal - totalPaid`.
*   Existe un array `currencies` obtenido de `meta.monedas`, que contiene objetos con `{ id, code, name, symbol, exchangeRate }`.
*   Hay una función `handleMonedaChange(monedaId: string)` que se ejecuta cuando el usuario selecciona una moneda en el Select correspondiente.
*   Hay un Select para "Destino del Pago" que actualiza `cuenta_id` o `cliente_id` en `currentPayment`.
*   El Input del "Monto a Pagar" es de tipo `number`, su `value` es `currentPayment.amount`, y tiene un `onChange` para permitir edición manual.
*   Existe un `useEffect` que calcula `conversionCalculada` cuando cambia el monto, la moneda o la tasa.

**Requerimiento:**

Quiero que el campo "Monto a Pagar" (`currentPayment.amount`) se actualice automáticamente con el siguiente valor cada vez que ocurra uno de estos eventos:

1.  **Al seleccionar una moneda:** En la función `handleMonedaChange(monedaId: string)`, después de actualizar `moneda_id` y `exchangeRate`, calcular el monto en la moneda local equivalente al `remainingInUsd` y asignarlo a `currentPayment.amount`.
2.  **Al seleccionar un destino de pago:** En el `onValueChange` del Select de "Destino del Pago", *después* de actualizar `cuenta_id` o `cliente_id` en `currentPayment`, si `currentPayment.moneda_id` ya está seleccionado, recalcular y asignar el monto automático a `currentPayment.amount`.

**Lógica de Cálculo Automático:**

*   Obtener la moneda seleccionada actual de `currencies` usando `currentPayment.moneda_id`.
*   Verificar que `remainingInUsd > 0` y que la moneda exista.
*   Multiplicar `remainingInUsd` por la `exchangeRate` de la moneda seleccionada.
*   Asignar el resultado (formateado a 2 decimales y como string) a `currentPayment.amount`.
*   El cálculo debe ocurrir solo si hay un saldo restante positivo.
*   La edición manual del campo debe seguir funcionando normalmente y sobrescribir cualquier valor automático.

**Instrucciones:**

Por favor, proporciona el código modificado para:

1.  La función `handleMonedaChange`.
2.  El `onValueChange` del Select de "Destino del Pago".
3.  Opcionalmente, una función auxiliar si la usas para encapsular la lógica del cálculo.

Asegúrate de que el flujo de trabajo sea: Selecciono moneda (o destino) -> El monto se rellena automáticamente -> El usuario puede editarlo si lo desea.

Gracias.
