# Plan: Casillero de Compras

> Plan para el cliente · escrito el 2026-10-19 · **solo documento, nada de esto está construido todavía.**
> Describe cómo cambiará el recorrido de una compra, qué se hará en cada etapa y en qué orden se construirá, poco a poco.
> Sirve para que el cliente lo revise y confirme antes de empezar. Lo marcado como **Por confirmar** necesita su respuesta.

---

## 1. Por qué cambia el flujo

Hoy, al aprobar una compra, los productos **se suman de inmediato al stock de un almacén**. Pero en la realidad las compras al proveedor (Milexus, Royal, Ekko…) esperan en Panamá, viajan en un contenedor al Mariel y recién después llegan al almacén. Mientras tanto no son inventario y no se pueden vender ni mover.

También pasan cosas que hoy el sistema no puede reflejar:

- Se paga **estadía** mientras la mercancía espera en Panamá.
- Se pagan **transporte marítimo**, **transporte terrestre** y otros cargos.
- Llegan **menos unidades** de las que se dijo que salían, y hay que saber si fue un error de conteo o si algo se perdió.

El **Casillero de Compras** (ya está en el menú lateral, solo para administrador) será el lugar donde vive todo ese recorrido.

> **Regla que cambia:** una compra **ya no suma al stock** al aprobarse. El stock se suma **una sola vez, al final**, cuando la mercancía llega completa al almacén.

---

## 2. El recorrido, paso a paso

```
Compra al proveedor ──► CASILLERO (Panamá) ──► CONTENEDOR ──► Tramo terrestre ──► ALMACÉN
   (se paga)              sin stock              al Mariel                        (suma al stock)
```

### Etapa 1 · Casillero (en Panamá)

- Cada compra al proveedor queda registrada y pagada, con sus productos, cantidades y costo.
- **No entra a ningún almacén ni al stock.**
- Se puede tener **varias compras abiertas al mismo tiempo**.
- Se pueden agregar **cargos a mano** (por ejemplo, la estadía en Panamá, que se anota en **USD**): se eligen **una o varias compras** y se anota el concepto y el monto del cargo. Los montos nunca se calculan solos: los escribe el usuario.

### Etapa 2 · Contenedor al Mariel

- Se crea un contenedor y se le asigna **una parte** de lo que hay en el casillero: por ejemplo, 12 de X, 30 de Y y 5 de Z.
- Lo que **no** sube al contenedor se queda en el casillero para el siguiente.
- Al contenedor se le agregan **cargos a mano**: transporte marítimo y otros.

### Etapa 3 · Tramo terrestre y llegada al almacén

- Se elige el almacén de destino y se agregan los cargos a mano del transporte terrestre. En Cuba el transporte se paga en **CUP**: se escribe el monto en CUP con su **tasa de cambio**, que el sistema propone con la oficial pero se puede **editar** porque suele convenirse con el chofer. El costo en USD sale de ese monto dividido entre la tasa. Es el mismo manejo de tasa que ya usan el resto de las operaciones.
- Cuando llega el camión con el contenedor, se **cuentan los productos antes de bajarlos al almacén**. Ese conteo es la única revisión: se compara lo que salió con lo que llegó, y recién después se suma al stock.

### Etapa 4 · Si el conteo no cuadra

Si en el contenedor se dijo que iban 12 y llegaron 10, se edita la cantidad recibida. El sistema pregunta, **por cada faltante**, qué pasó:

| Qué pasó | Dónde quedan las unidades | El dinero |
|---|---|---|
| **Error de conteo:** nunca salieron de Panamá | **Vuelven solas al casillero**, listas para el próximo contenedor | No se mueve |
| **Se perdieron o no llegaron** | Se dan de baja | Vuelve a la **cuenta** de donde se pagó, **o** queda con el **proveedor (cliente)** como saldo a favor o para saldar una deuda. Se elige en cada caso |

Si en el conteo hay **más** unidades de las anotadas (**sobrante**), también se registra qué pasó. **Por confirmar** (ver más abajo).

Los cargos del contenedor se reparten **solo entre lo que de verdad llegó**. Las unidades que volvieron al casillero no cargan con ese flete: lo pagarán en su propio contenedor.

### Etapa 5 · Entrada al stock

- Cuando la mercancía llega **completa** (o con los faltantes ya resueltos), recién ahí **se suma al stock del almacén**.
- Cada producto entra con su **costo final**: lo que costó la compra más la parte que le toca de estadía, transporte marítimo, transporte terrestre y otros cargos.
- Desde ahí todo sigue como hoy: movimientos entre almacenes, ventas, costo por lote.

---

## 3. Ejemplo con números

Compra a Milexus: **12 unidades de X a $10** = $120. Estadía en Panamá: **$12** (entre las 12 unidades son $1 por unidad). Se arma un contenedor con las 12.

| | |
|---|---|
| Transporte marítimo y otros cargos del contenedor | $50 |
| Llegan al almacén | 10 unidades (las otras 2 fueron un error de conteo) |
| Las 2 que faltan | **vuelven al casillero** |

Los $50 del contenedor se reparten solo entre las **10 que llegaron**: $5 por unidad. La estadía cuenta $1 por cada unidad.

Costo final de cada unidad que entra al stock: **$10 de compra + $5 de contenedor + $1 de estadía = $16** (con un solo producto el reparto es directo; con varios productos, ver **Por confirmar**).

Las 2 unidades que volvieron al casillero siguen costando $10 cada una más su estadía, y recibirán los cargos de su próximo contenedor.

---|---|
| Transporte marítimo y otros cargos del contenedor | $50 |
| Llegan al almacén | 10 unidades (las otras 2 fueron un error de conteo) |
| Las 2 que faltan | **vuelven al casillero** |

Cargos que se reparten entre las **10 que llegaron**: $50 del contenedor, más los $10 de estadía de esa compra que corresponden a ellas.

Costo final de cada unidad que entra al stock: **$10 de compra + $6 de cargos = $16** (con un solo producto el reparto es directo; con varios productos, ver **Por confirmar**).

Las 2 unidades que volvieron al casillero siguen costando $10 cada una más lo que acumulen de estadía, y recibirán los cargos de su próximo contenedor.

---

## 4. Cómo se construirá: poco a poco

Cada fase se entrega y se prueba antes de empezar la siguiente. El cliente decide cuándo pasar a la siguiente.

| Fase | Qué incluye | Qué se puede hacer al terminar |
|---|---|---|
| **1. Casillero** | Compras que quedan sin stock; fecha de llegada a Panamá; cargos a mano sobre una o varias compras | Registrar compras y la estadía, sin que toquen el inventario |
| **2. Contenedores** | Crear un contenedor, asignarle parte de las compras del casillero, agregarle cargos | Armar el contenedor y ver qué queda en Panamá |
| **3. Llegada al almacén** | Tramo terrestre, comparación enviado/recibido, faltantes de los dos tipos | Recibir un contenedor completo o con diferencias |
| **4. Entrada al stock** | Reparto de cargos entre los productos, costo final, lotes de stock | La mercancía suma al almacén con su costo real |
| **5. Dinero de faltantes y cierre** | Devolver dinero a la cuenta o al proveedor; reportes y Rastreo; retirar el "suma stock al aprobar" de Compras | El flujo viejo desaparece y todo pasa por el casillero |

Lo que **no** se toca mientras tanto: las compras ya hechas (siguen como están, con su stock).

---

## 5. Por confirmar con el cliente

1. **Reparto de los cargos entre productos.** Cuando un contenedor lleva varios productos (X, Y, Z), ¿los cargos se reparten **por valor** de cada producto o **por cantidad de unidades**? Propuesta: por valor, igual que ya hace Distribución de Costos.
2. ~~Revisión de faltantes~~ **Confirmado (2026-10-19):** se cuenta una sola vez, cuando llega el camión al almacén y antes de sumar al stock.
2b. **Sobrantes.** Si en el conteo hay más unidades de las anotadas, ¿qué pasó normalmente? Por ejemplo: eran unidades que estaban en Panamá y se mandaron por error sin anotar, o es mercancía que no se había pagado. Según eso se decide si el sobrante se descuenta del casillero, se compra aparte o se registra como diferencia.
3. ~~Moneda de los cargos~~ **Confirmado (2026-10-19):** en Panamá los cargos son en USD; en Cuba el transporte es en CUP, con tasa de cambio editable (se conviene con el chofer), como en el resto del sistema. Se guarda el monto original, la tasa usada y el equivalente en USD.
4. **Importación de Excel.** Hoy crea inventario directamente. ¿Se queda como carga directa de inventario o también pasa por el casillero?
5. **Compras pendientes de hoy.** Las que estén pendientes de aprobar cuando se active el cambio: ¿se aprueban antes o pasan al casillero?
6. ~~Quién usa el casillero~~ **Decidido (2026-10-19):** solo el administrador. El moderador y el vendedor no lo ven.
7. **Cómo se paga cada cargo.** ¿Cada cargo sale de una cuenta en el momento de anotarlo (como un gasto), o se anota primero y se paga después? Si sale de una cuenta, ¿de cuál y en qué moneda?

---

## 6. Para el desarrollo (no es necesario para el cliente)

Lo que hoy depende de que una compra aprobada sume al stock y habrá que revisar:

- `CompraController` (`store`, `aprobar`, `anular`, `actualizar`): hoy crea fichas, lotes y stock al aprobar; ese paso pasa a la entrada final al almacén (Fase 4).
- Importación de Excel de productos: crea lotes `IMP-` con stock.
- Distribución de Costos: el reparto de cargos debe reutilizar su fórmula, no duplicarla.
- Reportes de compras y Rastreo de Operaciones: hoy una compra aprobada equivale a inventario; habrá que distinguir "en casillero", "en tránsito" y "recibida".
- Reglas de trabajo del proyecto: un ítem a la vez, sin tocar Compras ni sus reportes hasta empezar la fase correspondiente, y con migraciones nuevas solo aprobadas por el cliente.
