# Flujo de lotes — cómo funcionan en Inventario Disponible y en el Punto de Venta

> Guía para el cliente · actualizada el 2026-09-26.
> Explica de dónde salen los lotes, qué se puede hacer con ellos y cómo se ven al vender.

---

## 1. ¿Qué es un lote?

Un **lote** es una tanda de unidades de un producto que está en un almacén y que llegó **junta y a un mismo costo**.

Ejemplo: la CAFETERA EKO en Bejucal Almacén tiene 139 unidades, pero en realidad son dos tandas:

| Lote | Unidades | Costo | Cómo llegó |
|---|---|---|---|
| `AJUSTE-LEGADO-49-4` | 137 | $21,34 | Stock que ya estaba antes de que existieran los lotes |
| `LOTE-MOV-250-001` | 2 | $21,34 | Llegó por el movimiento #250 |

Un producto puede tener un solo lote (lo más común) o varios. **Lo que ve el usuario en el almacén es la suma de todos sus lotes.**

Cada lote guarda:

- su **costo** (el vendedor no lo ve; solo administrador y moderador),
- cuántas unidades **le quedan**,
- opcionalmente un **precio de venta propio**,
- opcionalmente una **comisión propia**.

## 2. ¿De dónde nacen los lotes?

El código del lote dice de dónde viene:

| Código | Origen |
|---|---|
| `LOTE-{compra}-{línea}` | Una **compra aprobada** |
| `LOTE-MOV-{movimiento}-{línea}` | Un **movimiento** entre almacenes que se recibió |
| `AJUSTE-LEGADO-{producto}-{almacén}` | Stock anterior a la llegada de los lotes (se creó una sola vez) |
| `AJUSTE-{producto}-{almacén}` | Cuando un administrador **corrige el costo** de un producto en un almacén |
| `IMP-{producto}-{almacén}-{n}` | Una **importación de Excel** (un lote por cada fila con unidades) |
| `DEV-{venta}-{línea}` | Una **devolución** cuyas unidades no tienen lote de origen |
| `FUSION-{producto}-{almacén}-{n}` | Lotes que se **fusionaron** a mano |

## 3. El prorrateo pendiente

Cuando llegan unidades por un traslado o una compra, su costo puede cambiar por gastos de envío, etc. A eso se le llama **prorrateo** (módulo *Distribución de Costos*).

- Un traslado **queda con prorrateo pendiente** si lo crea un administrador o moderador, o si lo crea un vendedor hacia un almacén que no es suyo.
- Una compra aprobada también queda pendiente hasta que se decida.
- **El prorrateo es opcional.** Mientras esté pendiente, sus unidades quedan en **un lote aparte**, para que el costo pueda cambiar sin tocar el stock viejo.

### ¿Qué se puede hacer con un prorrateo pendiente?

| Opción | Qué pasa |
|---|---|
| **Distribuir costos** (aplicar el prorrateo) | Cambia el costo del lote. Los lotes **siguen separados**. |
| **Eliminar de la lista** | Se decide **no prorratear**. Las unidades se **suman automáticamente al lote idéntico** del almacén y pasan a ser **un solo lote**. El movimiento o la compra no se borra: sigue en el historial. |
| **Fusionar lotes a mano** (en Inventario Disponible) | Une los lotes que elijas en uno. Ojo: si después se prorratea, **el prorrateo ya no llega a las unidades fusionadas** (el sistema lo avisa). |

**¿Cuándo un lote es "idéntico" y se puede sumar solo?** Cuando tiene el **mismo costo**, **no tiene precio propio ni comisión propia**, y no viene de otro prorrateo pendiente. Si no hay un lote así, el lote se queda como está.

> Los lotes que ya existían antes de esta función **no se juntaron solos**: se unen a mano con *Fusionar lotes*.

## 4. Inventario Disponible (`/disponibles`)

Cuando un producto tiene **2 o más lotes con unidades**, en su fila aparece una insignia **"N lotes"**. Al abrirla se ve cada lote con:

- código, unidades, costo (solo administrador/moderador),
- **precio de venta** — *Propio* (puesto a mano) o *Heredado* (el del producto en el almacén),
- **comisión** — *Propia* o *Heredada*,
- margen = precio − comisión − costo del lote.

Se marcan uno o varios lotes y se puede:

| Acción | Quién puede |
|---|---|
| **Poner precio propio** / **Vender al precio del producto** | Cualquier usuario con acceso al almacén (por ahora; pendiente de decidir por roles) |
| **Poner comisión** / **Quitar comisión propia** | Solo administrador y moderador |
| **Fusionar lotes** (2 o más marcados, o el botón global del almacén) | Solo administrador y moderador |

Al fusionar, el lote resultante suma las unidades, toma el **costo promedio** (el valor del inventario no cambia) y conserva la **antigüedad del lote más viejo**. Si algún lote tenía comisión propia, el resultante hereda la del más viejo que la tenga. Los lotes originales no se borran: quedan en 0 para conservar el historial.

## 5. Punto de Venta (`/punto-venta`)

### El selector "Vender de este lote"

- Aparece en la tarjeta del producto (y en su vista rápida) **cuando el producto tiene 2 o más lotes**, aunque sean idénticos, con un **borde azul** y la insignia **"N lotes"**.
- **Viene elegido el lote más antiguo** (el que sale primero). Elegir otro es **opcional**.
- Cada opción muestra el código, las unidades y, si son distintos a los del producto, su precio y su comisión.
- **Desaparece solo** cuando queda un único lote (por ejemplo, al eliminar el prorrateo de la lista o al fusionar).

### Qué cambia al elegir un lote

- El **precio** de la tarjeta y del carrito es el del lote (el propio, o el del producto si no tiene).
- La **comisión** es la del lote (ver sección 6).
- **Escanear** un código agrega el producto con el lote que esté seleccionado (por defecto el más antiguo) y el aviso dice cuál.
- En el carrito, cada línea muestra **de qué lote** se vende (`Lote: …`).

### ¿Y si piden más unidades de las que tiene el lote?

**No hay límite por lote.** El lote elegido sale primero y, si no alcanza, la venta **sigue con el siguiente lote más antiguo**. El costo de la línea es el promedio ponderado de lo que salió, y la ganancia se calcula con ese costo real.

## 6. Reglas de precio y comisión

**Precio base de una línea:** el precio del lote elegido. Un precio propio de lote **es el nuevo precio base** y **no cambia la comisión**.

**Comisión de una línea** (toda la línea usa la del lote elegido, aunque la venta cruce dos lotes):

1. la **comisión propia del lote elegido**;
2. si no tiene, la del **primer lote (el más antiguo) que sí tenga comisión propia**;
3. si ninguno tiene, la **comisión del producto** en el almacén.

### Ejemplo

Producto a **$30**, comisión del producto **$2**. Lote A (más antiguo) sin nada propio. Lote B con **precio propio $33** y **comisión propia $4**.

| Se vende del… | Precio | Comisión |
|---|---|---|
| Lote B | $33 | $4 |
| Lote A | $30 | $4 (A no tiene; toma la del primer lote que sí la tiene) |
| Si nadie tuviera comisión propia | — | $2 (la del producto) |

### Si el vendedor cambia el precio en el carrito

Se calcula contra el **precio base y la comisión del lote**:

- **Igual al precio base:** cobra la comisión completa.
- **Por debajo del precio base:** el descuento **se descuenta de la comisión** hasta llegar a 0.
- **Por debajo de "precio base − comisión":** ya no se puede como venta normal. Pasa a **venta especial** (necesita motivo y aprobación).
- **Por encima del precio base:** el excedente **se suma a la comisión** del vendedor.
- **Por debajo del costo real:** venta **bajo costo** (solo la aprueba un administrador).

Ejemplo con el lote B (base $33, comisión $4): vender a $32 deja la comisión en $3; vender a $28 ya es venta especial.

### Editar una venta pendiente

La venta guarda el **precio base y la comisión con los que se vendió**. Si se edita el precio de una venta pendiente, se recalcula con esos valores, aunque después se haya cambiado el lote. Las ventas anteriores a esta función se siguen calculando con el precio y la comisión del almacén.

## 7. Anular, devolver o rechazar una venta

Las unidades **vuelven al lote del que salieron**. Si ese lote se fusionó después, vuelven al lote resultante. Si no tenían lote de origen, entran a un lote nuevo `DEV-…` al costo al que se vendieron.

## 8. Qué se guarda de cada venta

Cada línea recuerda **de qué lote(s) salió, cuántas unidades y a qué costo**. Por eso la ganancia real de la venta es exacta aunque el producto tenga lotes a costos distintos.

## 9. Cosas que todavía funcionan así (a tener en cuenta)

- El aviso de **"venta bajo costo"** del POS compara el precio con el **costo promedio** del producto; el servidor compara con el costo del lote realmente vendido. Solo se nota si los lotes tienen costos distintos.
- Cada producto con el mismo código de barras ocupa **una sola línea** en el carrito. Si agregas dos lotes distintos con el mismo código, el segundo suma a la primera línea y conserva su lote.
- Una **Distribución de Costos posterior** a una fusión no llega a las unidades fusionadas.
- El **precio propio** de un lote todavía lo puede poner cualquier usuario con acceso al almacén; la **comisión propia** ya es solo de administrador/moderador.

## 10. Resumen rápido

1. Cada producto se guarda por **lotes**; el almacén muestra la suma.
2. Un traslado o compra **pendiente de prorrateo** vive en un lote aparte.
3. Se **elimina de la lista** (se suma solo al lote idéntico) o se **prorratea** (cambia el costo) o se **fusiona a mano**.
4. En el POS, con **2 o más lotes** aparece el selector; **el más antiguo viene elegido**.
5. **Precio y comisión** siguen al lote elegido; un precio propio no cambia la comisión.
6. **Sin límites:** si faltan unidades, sigue con el siguiente lote más antiguo.
