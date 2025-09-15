Lo que hemos desarrollado se llama **Distribución de Costos Adicionales** o **prorrateo de costos**. Este proceso técnico consiste en asignar un gasto indirecto, como el transporte, a los productos que se benefician de él. En contabilidad, esto se hace para obtener un costo de inversión más preciso de cada producto.

A continuación, te resumo los pasos que hemos seguido para que puedas recordarlos y utilizarlos en el futuro.

***

### 1. Migraciones (Estructura de la Base de Datos)

Para registrar la operación, creamos dos tablas nuevas:

* **`cost_distributions`**: Esta tabla almacena los detalles principales de cada operación.
    * **purchase_id**: La compra a la que se le asignan los costos.
    * **amount_cup**: El monto original que el usuario introdujo.
    * **amount_usd**: El monto convertido a USD.
    * **exchange_rate**: La tasa de cambio que se usó en la conversión.
    * **account_id**: La cuenta de donde se "extrae" el monto.
    * **details**: Un campo de texto para notas adicionales.

* **`cost_distribution_items`**: Esta tabla almacena cuánto de ese costo adicional se asignó a cada producto específico de la compra.
    * **cost_distribution_id**: Relación con la operación principal.
    * **product_id**: El producto que recibió el costo.
    * **distributed_amount_usd**: La parte del costo total que se le asignó a este producto.
    * **old_cost_usd**: El precio de costo del producto antes de la operación.
    * **new_cost_usd**: El precio de costo actualizado.

### 2. Lógica del Backend (Controlador y Rutas)

Creamos un **`TransaccionController`** con la siguiente lógica:

* **Método `index()`**: Este método se encarga de preparar los datos para la vista principal. Busca las compras recientes y las cuentas que no sean deudas. Además, obtiene la tasa de cambio actual.
* **Método `distribuirCostos()`**: Esta es la lógica central. Recibe los datos del formulario (monto, cuenta, compra).
    1.  Verifica que la cuenta seleccionada sea de tipo `permanentes` o `temporales`.
    2.  Convierte el monto de CUP a USD usando la tasa de cambio.
    3.  Calcula el costo total de la compra para determinar qué proporción de la nueva inversión le toca a cada producto.
    4.  Crea un registro en la tabla `cost_distributions` y uno en `cost_distribution_items` por cada producto.
    5.  Actualiza el precio de costo de cada producto en su tabla principal.
    6.  Todo el proceso se realiza dentro de una **transacción de base de datos** para asegurar que si algo falla, no se guarden datos incompletos.

---

### 3. Frontend (Interfaz de Usuario)

En los componentes de React, modificamos el `Index.tsx` para pasar los datos que el controlador envía a un nuevo componente llamado **`CostosAdicionales.tsx`**.

En el componente `CostosAdicionales`, creamos una interfaz con estos elementos:

* **Tabla de Compras**: Muestra un listado de las compras recientes.
* **Modal**: Al hacer clic en una compra, se abre una ventana emergente.
* **Formulario**: Dentro del modal, un formulario permite al usuario:
    * Ingresar el monto en CUP.
    * Seleccionar la cuenta de origen.
    * Ver la tasa de cambio por defecto o cambiarla.
    * Añadir un campo para detalles.

Este formulario usa `useForm` de Inertia para manejar el estado y enviar los datos a la ruta `POST` que creamos en el controlador, completando así la operación.

***

Si en el futuro necesitas realizarle ajustes o mejoras a este proceso, puedes referirte a estos puntos. ¿Hay algo más que te gustaría que revisáramos o aclaráramos sobre este tema?
