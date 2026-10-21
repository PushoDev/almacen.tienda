# Plan: Casillero de Compras

> Plan para el cliente · escrito el 2026-10-19 · **Las Fases 1 (Casillero) y 2 (Contenedores) están construidas desde el 2026-10-20 (backend, pantallas y tests); el resto sigue siendo plan.** Se avanza con calma, una fase a la vez.
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

---

## 4. Cómo se construirá: poco a poco

Cada fase se entrega y se prueba antes de empezar la siguiente. El cliente decide cuándo pasar a la siguiente.

| Fase | Qué incluye | Qué se puede hacer al terminar |
|---|---|---|
| **1. Casillero** ✅ *hecha 2026-10-20* | Compras que quedan sin stock; fecha de llegada a Panamá; cargos a mano sobre una o varias compras | Registrar compras y la estadía, sin que toquen el inventario |
| **2. Contenedores** ✅ *hecha 2026-10-20* | Crear un contenedor, asignarle parte de las compras del casillero, agregarle cargos | Armar el contenedor y ver qué queda en Panamá |
| **2.5. Incidencias** 💡 *idea, por confirmar* | Reportar y resolver lo que pasa en el camino (Amazon, Panamá, contenedor): reembolso, reposición, devolución o pérdida. Ver "Incidencias en el camino" abajo | Saber qué pasó con cada unidad afectada y dónde está el dinero |
| **3. Llegada al almacén** | Tramo terrestre, comparación enviado/recibido, faltantes de los dos tipos | Recibir un contenedor completo o con diferencias |
| **4. Entrada al stock** | Reparto de cargos entre los productos, costo final, lotes de stock | La mercancía suma al almacén con su costo real |
| **5. Dinero de faltantes y cierre** | Devolver dinero a la cuenta o al proveedor; reportes y Rastreo; retirar el "suma stock al aprobar" de Compras | El flujo viejo desaparece y todo pasa por el casillero |

Lo que **no** se toca mientras tanto: las compras ya hechas (siguen como están, con su stock).

### Incidencias en el camino (idea del 2026-10-20, por confirmar con calma)

**De dónde sale:** muchas compras se hacen en Amazon y van directo al casillero de Panamá. En el camino pueden surgir inconvenientes (cancelaciones, paquetes que no llegan, equivocados o dañados, devoluciones, faltantes en el contenedor) y el cliente quiere que el sistema sepa reflejarlos y ayudarle a resolverlos. **Es el recorrido cotidiano del negocio:** se hace sin prisa y confirmando el flujo completo antes de construir.

**Lo que se sabe de Amazon (general, a confirmar con pedidos reales; las reglas cambian según el vendedor):**
- Una cancelación o devolución suele reembolsarse al método de pago original, a veces de forma parcial (sin el envío) y con días de espera.
- La frontera es la entrega en Panamá: para Amazon el pedido queda cumplido al entregarlo en el casillero; lo que ocurra después (en Panamá o en el contenedor) no lo reembolsa Amazon, salvo seguro.
- Muchas de las cuentas del negocio son tarjetas de crédito con saldo negativo (la deuda): un reembolso a una tarjeta es sumarle saldo, es decir, bajarle la deuda.

**Qué puede pasar, por tramo:** (1) Amazon → Panamá: cancelado, no llega, llega equivocado, dañado o incompleto, o se devuelve. (2) En el casillero: golpeado, mal contado o retenido. (3) Contenedor → Mariel: faltante (error de conteo o pérdida), dañado o sobrante.

**Idea: una sola "Incidencia"** sobre unidades de una línea de compra, válida en cualquier tramo. Guarda cuántas unidades, dónde ocurrió, qué pasó, el número de caso de Amazon y cómo se resuelve:

| Resolución | Qué hace |
|---|---|
| **Reembolso** (total o parcial) | El dinero vuelve a una cuenta (por defecto la que pagó) como un ingreso ligado a la compra; puede quedar "por recibir" hasta que el usuario lo escribe |
| **Devolución en curso** | Estado intermedio hasta que llega el reembolso |
| **Reposición** | El proveedor manda otra unidad: sin dinero; se cierra cuando llega |
| **Pérdida asumida** | Sin reembolso: las unidades se dan de baja y la pérdida queda registrada |

**Efectos sobre lo ya construido:** las unidades afectadas dejan de estar disponibles para contenedores y el valor del casillero baja; los cargos (estadía, marítimo) se reparten solo entre las unidades que sí llegan (la regla que ya existe); **la Fase 3 reutiliza la incidencia**: el faltante «se perdió» del conteo es una incidencia de pérdida y el «error de conteo» vuelve al casillero, así no se construye dos veces. Datos extra baratos: número de pedido de Amazon y tracking en la compra, para poder reclamar. Los montos de reembolso los escribe el usuario; nada se calcula solo.

**Orden propuesto:** Incidencias antes de la Fase 3 (como Fase 2.5), backend primero y luego pantalla: botón «Reportar incidencia» en cada línea del casillero y del contenedor, y una sección «Incidencias abiertas» con los reembolsos por recibir.

**Preguntas abiertas** (con la recomendación entre paréntesis; ver también la sección 5, preguntas 10 a 14):
reembolso a la tarjeta que pagó (sí, editable), pérdida sin reembolso (registrarla aparte en vez de sumarla al costo de las demás unidades), reembolso por recibir (no cuenta al capital hasta que entra), envío de devolución (cargo de la incidencia) y dos o tres casos reales que ya hayan pasado.

---

## 5. Por confirmar con el cliente

1. **Reparto de los cargos entre productos.** Cuando un contenedor lleva varios productos (X, Y, Z), ¿los cargos se reparten **por valor** de cada producto o **por cantidad de unidades**? Propuesta: por valor, igual que ya hace Distribución de Costos.
2. ~~Revisión de faltantes~~ **Confirmado (2026-10-19):** se cuenta una sola vez, cuando llega el camión al almacén y antes de sumar al stock.
2b. **Sobrantes.** Si en el conteo hay más unidades de las anotadas, ¿qué pasó normalmente? Por ejemplo: eran unidades que estaban en Panamá y se mandaron por error sin anotar, o es mercancía que no se había pagado. Según eso se decide si el sobrante se descuenta del casillero, se compra aparte o se registra como diferencia.
3. ~~Moneda de los cargos~~ **Confirmado (2026-10-19):** en Panamá los cargos son en USD; en Cuba el transporte es en CUP, con tasa de cambio editable (se conviene con el chofer), como en el resto del sistema. Se guarda el monto original, la tasa usada y el equivalente en USD.
4. **Importación de Excel.** Hoy crea inventario directamente. ¿Se queda como carga directa de inventario o también pasa por el casillero? **Supuesto de trabajo (2026-10-20, a confirmar):** se queda como carga directa; se revisa en la Fase 5.
5. **Compras pendientes de hoy.** Las que estén pendientes de aprobar cuando se active el cambio: ¿se aprueban antes o pasan al casillero? **Supuesto de trabajo (2026-10-20, a confirmar):** se aprueban antes del cambio.
6. ~~Quién usa el casillero~~ **Decidido (2026-10-19):** solo el administrador. El moderador y el vendedor no lo ven.
7. **Cómo se paga cada cargo.** ¿Cada cargo sale de una cuenta en el momento de anotarlo (como un gasto), o se anota primero y se paga después? Si sale de una cuenta, ¿de cuál y en qué moneda? **Supuesto de trabajo (2026-10-20, a confirmar):** sale de una cuenta en el momento de anotarlo, como un Gasto; en Panamá, de una cuenta USD. Así quedó construido en la Fase 1.
8. **Capital.** El dinero pagado por una compra que aún no está en stock sale de la cuenta y no figura en el inventario: el capital bajaría hasta que llegue. **Propuesta (2026-10-20, a confirmar):** la mercancía en el casillero y en contenedor suma al capital a costo, con la nota "incluye X en tránsito" (igual que el efectivo en tránsito, ADR 009). Se decide antes de la Fase 4.
9. **Quién registra la compra.** Hoy Compras está abierto al moderador. **Construido en la Fase 1:** registrar una compra en el flujo casillero es solo del administrador; el registro clásico sigue como estaba.
10. **Incidencias — destino del reembolso.** ¿Vuelve siempre a la cuenta (tarjeta) que pagó la compra? **Recomendación:** sí por defecto, editable.
11. **Incidencias — pérdida sin reembolso.** ¿Se suma al costo de las demás unidades de la compra o se registra como pérdida aparte? **Recomendación:** aparte (el costo de lo que llega se mantiene real y la pérdida queda visible).
12. **Incidencias — reembolso por recibir.** ¿Cuenta al capital mientras llega? **Recomendación:** no; se muestra aparte como "por recibir" hasta que entra a la cuenta.
13. **Incidencias — envío de devolución.** Si se paga el envío de vuelta, ¿se anota como cargo de la incidencia? **Recomendación:** sí.
14. **Incidencias — casos reales.** Dos o tres casos que ya hayan pasado (qué se hizo y cómo terminó), para calibrar el diseño. Pendiente del cliente.

---

## 6. Para el desarrollo (no es necesario para el cliente)

Lo que hoy depende de que una compra aprobada sume al stock y habrá que revisar:

- `CompraController` (`store`, `aprobar`, `anular`, `actualizar`): hoy crea fichas, lotes y stock al aprobar; ese paso pasa a la entrada final al almacén (Fase 4).
- Importación de Excel de productos: crea lotes `IMP-` con stock.
- Distribución de Costos: el reparto de cargos debe reutilizar su fórmula, no duplicarla.
- Reportes de compras y Rastreo de Operaciones: hoy una compra aprobada equivale a inventario; habrá que distinguir "en casillero", "en tránsito" y "recibida".
- Reglas de trabajo del proyecto: un ítem a la vez, sin tocar Compras ni sus reportes hasta empezar la fase correspondiente, y con migraciones nuevas solo aprobadas por el cliente.

### Análisis de impacto (2026-10-20)

Las Compras cambian de forma radical, así que **no se escriben tests que fijen el comportamiento actual de lo que se va a rehacer**: cada fase trae los suyos.

| Grupo | Piezas |
|---|---|
| **Se rehace** | `CompraController` (`store`, `aprobar`, `anular`, `actualizar`); `Comprar/Index` y `Show` con sus 14 componentes en `components/compras/`; la edición de una compra pendiente y `compra_ediciones`; la anulación (reversión o fondo a favor) |
| **Se reutiliza** | Pagos al proveedor (`procesarPagos`: pago en efectivo, deuda parcial, deuda del cliente-proveedor); la fórmula de Distribución de Costos; la creación de lotes, códigos y stock de `aprobar()` (pasa a la entrada final); la tasa editable por operación |
| **Se ve afectado** | Distribución de Costos (74 menciones a compras); reportes y KPIs de compras (hoy **no filtran por estado**: cuentan pendientes y anuladas, y no tienen tests); Rastreo (58); Cuentas, Clientes y Proveedores `Show`; la cola de "prorrateo requerido"; `FusionLotesService`; comandos de backfill |
| **No se ve afectado** | El valor del inventario sale de los lotes (`ValorInventarioService`); `precio_compra_producto` es el costo de la ficha, no la entidad Compra |

Hallazgos que condicionan el diseño:

1. **Distribución de Costos hace hoy lo mismo que los cargos del casillero** (reparte transporte y otros gastos sobre compras aprobadas). Para las compras nuevas lo reemplazan los cargos manuales; el módulo queda para las compras viejas y para los movimientos entre almacenes.
2. **El capital** suma saldos, clientes e inventario y el efectivo en tránsito: pagar una compra que aún no está en stock lo bajaría (pregunta 8).
3. **Las fichas del catálogo se crean al comprar** (la línea necesita `producto_id`): con el casillero habrá fichas sin stock durante semanas.
4. **Las líneas se parten:** un contenedor lleva solo parte de una compra, así que hay que seguir las unidades por línea (en casillero, enviadas, recibidas) y no solo el estado de la compra.

### Diseño de datos (Fase 1, construido el 2026-10-20)

- **`compras`** gana `flujo` (`clasico` por defecto o `casillero`), `etapa` (`casillero`; `contenedor` y `recibida` en las fases siguientes) y `llegada_panama_at`. **No se toca el enum `estado`**: una compra del casillero es `pendiente` y pasa a `aprobada` solo cuando el stock entra al almacén (Fase 4); así Distribución de Costos (que exige `aprobada`) y el resto la tratan como "sin stock" sin cambios. Las compras existentes quedan como `clasico`.
- **`casillero_cargos`** (`concepto`, `nota`, `moneda`, `monto`, `tasa_cambio`, `monto_usd`, `cuenta_id`, `movimiento_financiero_id`, `fecha`, `estado` activo/anulado) y el pivote **`casillero_cargo_compra`** (un cargo cubre una o varias compras).
- **`App\Services\CasilleroService`:** `registrarCargo()` (valida que las compras estén en el casillero y que la cuenta sea USD con saldo suficiente; descuenta con un Gasto), `anularCargo()` (devuelve el dinero y cancela el Gasto, solo mientras todas sus compras sigan en el casillero) y `marcarLlegadaPanama()`.
- **`CasilleroController`** (solo admin, rutas `casillero.*`): listado, cargos y llegada a Panamá. **`CompraController`:** `store()` acepta `flujo=casillero` (solo admin, almacén de cada línea opcional); `aprobar()` y `actualizar()` rechazan las compras del casillero; `anular()` las rechaza mientras tengan cargos activos.
- **Fase 1, frontend (2026-10-20):** `Casillero/Index` (widgets, tabla con filas expandibles y los diálogos de cargo, anular cargo y llegada a Panamá), el interruptor «Enviar al casillero (Panamá)» en `Comprar/Index` (solo admin; sin almacén en las líneas) y el banner de estado en el detalle de la compra. Tests: `CasilleroTest` (19).

### Fase 2: contenedores (backend construido el 2026-10-20)

- **`contenedores`** (`nombre`, `notas`, `fecha_salida`, `estado` abierto/cancelado) y **`contenedor_lineas`** (`contenedor_id`, `compra_producto_id`, `cantidad`; una fila por contenedor y línea): cuántas unidades de cada línea de compra suben a cada contenedor. Lo que no sube sigue esperando en Panamá.
- **`casillero_cargos.contenedor_id`** (nullable): un cargo es de compras del casillero (pivote, p. ej. la estadía) o de un contenedor (transporte marítimo y otros). Se paga igual: Gasto desde una cuenta USD.
- **Etapa de la compra:** `casillero` mientras le quede alguna unidad sin contenedor; pasa a `contenedor` cuando **todas** están asignadas y vuelve a `casillero` si se le devuelven. Una compra con unidades en un contenedor no se anula.
- **`ContenedorService`:** `crear`, `actualizar`, `asignarUnidades` (reemplaza la cantidad del contenedor; 0 saca la línea; no se pasa de lo disponible contando los demás contenedores) y `cancelar` (no con cargos activos; devuelve las unidades al casillero). `CasilleroService` suma `registrarCargoContenedor` y `anularCargo` sirve para los dos tipos de cargo.
- **`ContenedorController`** (solo admin, `casillero.contenedores.*`). Tests: `ContenedorTest` (19).
- **Frontend (2026-10-20):** `Casillero/Contenedores` con widgets, una tarjeta por contenedor (lo que lleva, sus cargos y las acciones), y los diálogos de nuevo/editar contenedor, unidades (cantidad por línea con máximo, «Nada»/«Todo» y resumen), cargo y cancelar. `Casillero/Index` muestra ahora las unidades que aún esperan ("7 de 12") y enlaza a Contenedores. El diálogo de cargo se generalizó (sirve a compras y a contenedores) y los diálogos de cargo y anulación se limpian al abrirse.
- **Regla que condiciona la Fase 4 (recordatorio del cliente, 2026-10-20): un cargo es una suma que se reparte entre los productos.** No se reparte al anotarlo, sino al entrar al stock, y **solo entre las unidades que de verdad llegaron**. Propuesta (pregunta 1, por confirmar): por valor, con la fórmula de Distribución de Costos (`peso = costo × cantidad / total`). Un cargo de contenedor se reparte entre las líneas de ese contenedor; uno de compras (estadía) entre las unidades de esas compras. Por eso `contenedor_lineas` y el pivote guardan línea y cantidad: con eso se calcula el valor de cada producto. Fase 3 sumará la cantidad recibida a `contenedor_lineas`.
