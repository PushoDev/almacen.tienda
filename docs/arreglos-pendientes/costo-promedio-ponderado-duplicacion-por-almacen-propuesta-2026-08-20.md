# Propuesta v3: duplicación de producto por precio + Distribución de Costos

**Estado: Fase 1 (Compras) IMPLEMENTADA y probada 2026-08-20. Fases 2-5 sin empezar.** Reemplaza el enfoque de `costo-promedio-ponderado-por-almacen-propuesta-2026-08-15.md` (v1, ver nota de reemplazo al inicio de ese doc). Este doc es v3 de la misma conversación del 2026-08-20 — v2 proponía que el disparador de duplicación fuera el almacén; en la misma sesión, el cliente lo corrigió: **el disparador real es el precio**, no el almacén. Este doc reemplaza el razonamiento de v2 con el modelo correcto y agrega el plan de fases y las vistas nuevas.

## El problema de fondo (recap, sigue siendo el mismo diagnóstico de v1)

El costo (`productos.precio_compra_producto`) es un solo campo global por producto, no por almacén ni por lote/compra. Cuando el mismo producto entra al inventario más de una vez a precios distintos — por fluctuación de precio, por prorrateo de transporte, por comprar de más para llenar un contenedor — el sistema hoy **sobreescribe** ese único campo cada vez, perdiendo el costo real de las unidades que ya estaban en stock a otro precio. El cliente hoy lo resuelve a mano: busca "duplicados" idénticos y promedia.

## El flujo real del negocio (explicado por el cliente, 2026-08-20)

1. El cliente compra productos en el extranjero (Panamá, China, donde sea) — puede comprar el mismo producto varias veces **dentro de la misma compra/contenedor**, incluso a propósito para llenar el contenedor, cada vez a un precio distinto.
2. La mercancía llega físicamente a un punto de tránsito (el Mariel) antes de mandarse a su almacén final.
3. Ahí, o al hacer el `movimiento` que traslada la mercancía al almacén final, se aplica el prorrateo de costos (transporte, aduana) — puede aplicarse a **un movimiento individual**, o a **un lote de varias compras juntas** (agrupación nueva, no existe hoy en el sistema).
4. Cuando el producto llega a su almacén de destino con su costo ya prorrateado, o cuando se compró de entrada a un precio distinto dentro del mismo contenedor — en ambos casos, **si el precio es distinto, es legalmente otro producto**, no una actualización del que ya existía.

## La regla de identidad, corregida (esto es lo que cambia respecto a v2)

**v2 decía:** el match de "es el mismo producto" en `CompraController::store()` debía considerar el almacén de destino.

**Corregido por el cliente:** el disparador real es el **precio**, no el almacén. Aplica igual dentro de la misma compra, entre compras distintas, o al recibir un movimiento — donde sea que el precio no coincida con el de la ficha existente, se crea una ficha nueva. El almacén sigue siendo relevante para el stock (vía `AlmacenProducto`, sin cambios ahí), pero **no es el criterio que decide si es "el mismo producto"** — el precio sí.

Match de identidad hoy: `nombre_producto` + `categoria_id` + `marca_producto` + `modelo_producto` + `capacidad_producto` (sin precio). Match propuesto: los mismos campos, **más el precio** (con un margen de tolerancia — a definir, ej. solo se considera "otro producto" si el precio difiere más de X% o X$, para no generar una ficha nueva por una fluctuación mínima de tasa de cambio o redondeo).

## El autocompletado de productos existentes — se mantiene, se vuelve más importante

El autocompletado que ya existe en `Comprar/Index.tsx` (busca coincidencias por nombre/marca/modelo, muestra el costo actual) **se mantiene tal cual** — con la regla de precio-como-disparador se vuelve la pieza que le explica al usuario, antes de guardar, que va a crear una ficha nueva porque el precio que está escribiendo es distinto al ya registrado. Agregar un mensaje corto cuando eso pase: *"Este producto ya existe a $X — como el precio es distinto, se registrará como un producto nuevo."*

## Plan de fases, confirmado — se arranca por la Fase 1

**Fase 1 — Compras (cimiento, primero). ✅ IMPLEMENTADA 2026-08-20.** Cambiar el match de identidad en `CompraController::store()` para que compare también el precio. Tolerancia confirmada por el cliente: **comparación exacta, sin margen** — cualquier diferencia de precio, por mínima que sea, crea una ficha nueva. Aplica igual dentro de una misma compra (llenar contenedor a precios distintos) que entre compras separadas, sin importar el proveedor (local o del extranjero) — es el mismo `store()` para cualquier origen.

Implementado: `$searchAttributes` (nombre+categoría+marca+modelo+capacidad) ganó `->where('precio_compra_producto', $item['precio'])` en la búsqueda de "¿ya existe?". Si no hay match exacto (incluyendo precio), se crea una ficha nueva — mismo camino que ya existía para productos totalmente nuevos, sin código adicional. El bloque de auditoría a `historial_precio_costos` que existía para "producto existente cambia de costo" se **eliminó** (junto al import ya no usado de `HistorialPrecioCosto`) — con el precio como parte del match, ese camino ya no puede ejecutarse: si el `Producto` se encuentra, su precio ya es idéntico al de la compra, así que no hay "cambio" que auditar ahí. `Comprar/Index.tsx`: el panel de aviso del autocompletado (que ya mostraba el costo actual) se corrigió — antes decía textualmente que el precio nuevo "va a reemplazar" el costo para todos los almacenes, lo cual ya no es cierto; ahora compara el precio escrito contra el del producto encontrado y muestra "se va a registrar como un producto nuevo" cuando difieren, o el costo actual sin más cuando coinciden.

Tests: 2 tests preexistentes reescritos para reflejar el comportamiento nuevo (uno asumía que comprar a otro precio pisaba el costo y dejaba rastro en `historial_precio_costos` — ya no aplica; otro asumía que el mismo producto en dos almacenes a precios distintos, dentro de una compra, compartía una sola ficha — ahora son 2 fichas separadas), + 2 tests nuevos (compra a precio distinto crea ficha nueva sin tocar la existente; dos líneas de la misma compra a precios distintos crean 2 fichas). Suite completa: 172/172 verde. eslint sin errores nuevos.

**Fase 2 — Lotes de compras (opcional, encima de la Fase 1).** Agrupar varias compras bajo un `lote_id` para prorratear costos de transporte/aduana entre todas a la vez, en vez de una por una. Concepto nuevo, no existe hoy nada parecido en el sistema (confirmado por grep, cero referencias a "lote").

**Fase 3 — Distribución de Costos (rediseño del prorrateo actual).** El cliente confirmó que la lógica actual de `distribuirCostosManual()`/`gastoTransportacion()` **se va a cambiar**, no se mantiene tal cual — se construye sobre la Fase 1, porque recién ahí existen fichas separadas por precio a las que un prorrateo puede apuntar de forma específica. Necesita un **estado explícito de idempotencia** (pendiente / parcial / completo) — hoy ninguno de los dos mecanismos existentes marca si ya se corrió, lo cual el cliente identificó como fuente de confusión para el usuario.

**Fase 4 — Movimientos (misma regla en la recepción).** En `MovimientosController::recibir()` (línea 308, confirmado que hoy no toca costo para nada — `movimiento_detalles.costo_unitario` sigue muerto), aplicar la misma regla de duplicación por precio cuando algo llega con costo prorrateado distinto al que ya existe en el almacén destino.

**Fase 5 — Visibilidad (sidebar + dashboard).** Una vez que existe el estado de la Fase 3 para mostrar:
- Nueva sección en el sidebar, **"Distribución de Costos"** (hoy "Transacciones" — donde vive este prorrateo — ni siquiera aparece en el sidebar, confirmado en `app-sidebar.tsx`; solo se llega desde un botón dentro de una compra puntual). Vista índice con todas las compras/lotes y su estado.
- Widget chico en el dashboard, tipo "N compras sin prorratear costos" con link directo — aviso complementario, no sustituto del índice.

## Fusión/unificación manual — confirmado fuera de alcance por ahora

La idea de v2 de una operación "Unificar productos" en Movimientos (juntar 2+ fichas duplicadas del mismo almacén a mano) **queda fuera de esta ronda de trabajo — es opcional y para después, en otro lugar**. El cliente sí respondió las preguntas abiertas de v2 para cuando se retome, quedan documentadas aquí:

1. **Historial de compras:** al fusionar, se crea una ficha **nueva** y **se mantienen las viejas** ("por si acaso") — no se borran ni se re-apuntan.
2. **Código de barra:** no se resolvió explícitamente, pero al no borrarse las fichas viejas (punto 1), no hay urgencia de decidir esto ahora.
3. **Precio de venta por vendedor:** sigue ingresándose manualmente como está hoy — la fusión no lo toca ni lo migra automáticamente.
4. **Historial de costo:** la fusión queda registrada como un evento (mismo patrón que ya usa `historial_precio_costos`).
5. **¿Quién puede unificar?** Solo admin — pero esto **no se construye en Compras**, es un módulo aparte (Movimientos), fuera del alcance de este plan de fases.
6. **¿Manual o sugerido?** Ambas formas — el sistema puede sugerir duplicados detectados, y el usuario también puede buscarlos manualmente.
7. ~~Ventas/movimientos ya apuntando a la ficha retirada~~ — no aplica: dado que las fichas viejas se mantienen (punto 1), nada queda huérfano.

## Próximo paso

Fase 1 cerrada. Las fases 2-5 no se tocan todavía — quedan pendientes de que el cliente pida seguir. El código de Fase 1 está sin commitear, a la espera de revisión del cliente (mismo patrón que otras rondas de trabajo de este proyecto).
