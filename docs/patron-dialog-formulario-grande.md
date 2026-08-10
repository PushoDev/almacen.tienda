# Patrón: Diálogo grande de dos paneles (formulario + resumen)

> Origen: `Comprar/Index.tsx`, diálogo "Editar Producto" (dentro de la tabla de "Lista de los Productos a Comprar"). Identificado el 2026-08-10 como un patrón que vale la pena reutilizar — el resto del proyecto usa versiones más simples para diálogos grandes de una sola columna (ver "Variantes más simples, ya existentes" al final, con los candidatos pendientes de aplicar después).

## Cuándo usar este patrón

Cuando un `AlertDialog`/`Dialog` necesita mostrar un formulario con **varios campos agrupados en secciones**, más **datos de contexto/resumen que conviene tener siempre a la vista** (un subtotal, un total, un estado) mientras se edita — no para confirmaciones simples ni formularios de 2-3 campos, esos deben quedarse con el tamaño chico por defecto (`sm:max-w-lg`, sin tocar nada).

Ejemplo real: editar un producto del carrito de Compras — a la izquierda los datos del producto en dos tarjetas ("Detalles del Producto", "Inventario y Precio"), a la derecha un panel fijo con la organización (almacén, categoría, código) y el subtotal calculado en vivo, siempre visible sin importar cuánto scroll haga la columna izquierda.

## La receta

### 1. El contenedor (`AlertDialogContent` o `DialogContent`)

```tsx
<AlertDialogContent className="flex h-[90vh] w-[95vw] !max-w-none max-w-[1024px] flex-col p-0">
```

Cada clase cumple un propósito específico — no son intercambiables ni decorativas:

| Clase | Por qué |
|---|---|
| `h-[90vh]` | Alto fijo (no `max-h`) — el diálogo ocupa 90% del viewport sin importar cuánto contenido tenga, para que el panel lateral de resumen tenga altura estable y no salte de tamaño. |
| `w-[95vw]` | En pantallas chicas, casi todo el ancho disponible. |
| `!max-w-none` | El componente base (`components/ui/alert-dialog.tsx`) trae `sm:max-w-lg` (~512px) por defecto — sin el `!important` acá, esa clase responsive gana y el diálogo nunca crece más allá de "lg". Es obligatorio, no cosmético. |
| `max-w-[1024px]` | El techo real en pantallas grandes — evita que en un monitor ancho el diálogo se estire de forma absurda. |
| `flex flex-col p-0` | Sin padding propio — cada sección (header/body/footer) controla el suyo, así el header y el footer pueden tener su propio borde de separación pegado al borde del diálogo. |

### 2. Header fijo

```tsx
<AlertDialogHeader className="shrink-0 border-b px-6 py-4">
    <AlertDialogTitle className="flex items-center gap-3 text-xl font-semibold sm:text-2xl">
        <IconoDelDialogo className="h-6 w-6" />
        <span>Título</span>
    </AlertDialogTitle>
    <AlertDialogDescription>Descripción corta de una línea.</AlertDialogDescription>
</AlertDialogHeader>
```

`shrink-0` es la clave: dentro de un contenedor `flex flex-col` con altura fija, sin esto el header se comprimiría si el body pide más espacio.

### 3. Body: grid de dos columnas, cada una con su propio scroll

```tsx
<div className="grid flex-1 overflow-hidden lg:grid-cols-[1fr_380px]">
    {/* Columna principal — el formulario */}
    <div className="flex flex-col gap-y-8 overflow-y-auto px-6 py-8">
        {/* secciones del formulario, cada una en su propia tarjeta */}
        <div className="space-y-6 rounded-lg border p-6">
            <h3 className="text-lg font-semibold">Nombre de la sección</h3>
            {/* campos */}
        </div>
    </div>

    {/* Columna lateral — contexto/resumen, ancho fijo */}
    <div className="flex flex-col border-l bg-slate-50/50 p-6 dark:bg-slate-800/20">
        <div className="space-y-6">{/* campos de contexto */}</div>
        <div className="mt-auto rounded-xl border-2 p-4">
            {/* resumen/total, empujado al fondo con mt-auto */}
        </div>
    </div>
</div>
```

Puntos que no son opcionales:
- `flex-1 overflow-hidden` en el grid — reparte el espacio vertical restante entre header/footer, y evita que el grid mismo scrollee (el scroll pasa a las columnas hijas).
- `overflow-y-auto` en **cada columna por separado** — así la columna del formulario (probablemente larga) scrollea sin arrastrar el panel lateral, que se queda fijo.
- `lg:grid-cols-[1fr_380px]` — en mobile/tablet colapsa a una columna (el grid sin el prefijo `lg:` es de una sola columna por defecto); el panel lateral pasa a apilarse debajo. Ancho fijo en píxeles para el panel lateral, no fracción — así no se angosta si el formulario principal crece.
- `mt-auto` en el bloque de resumen dentro del panel lateral — lo pega al fondo del panel en vez de quedar pegado justo debajo de los campos.

### 4. Footer fijo

```tsx
<AlertDialogFooter className="shrink-0 flex-row justify-end space-x-4 border-t px-6 py-4">
    <AlertDialogCancel asChild>
        <Button variant="ghost">Cancelar</Button>
    </AlertDialogCancel>
    <Button className="bg-blue-600 text-white hover:bg-blue-700">
        <IconoGuardar className="mr-2 h-4 w-4" />
        Guardar Cambios
    </Button>
</AlertDialogFooter>
```

Mismo `shrink-0` que el header, y `border-t` en vez de `border-b` para separar del body.

## Gotcha: `Combobox` dentro de este diálogo

Si alguno de los campos usa `Combobox` (`@base-ui/react`, `components/ui/combobox.tsx`), **necesita el fix de `container`** desde el primer momento — ver `docs/pendiente-combobox-reemplazo.md`, sección "Combobox dentro de un Dialog o AlertDialog". Sin eso, el click con mouse en las opciones no selecciona nada (bug real, ya encontrado y arreglado en este mismo diálogo el 2026-08-10).

Si el diálogo grande vive dentro de un `.map()` (una fila de tabla, por ejemplo — no se puede usar `useRef` ahí adentro por las reglas de hooks), resolver el container con un ref-callback a nivel de componente en vez de `useRef` + `useEffect`:

```tsx
const [dialogContainer, setDialogContainer] = useState<HTMLElement | undefined>(undefined);
const resolveDialogContainer = (node: HTMLElement | null) => {
    const container = node?.closest('[data-slot="alert-dialog-content"]'); // o [data-slot="dialog-content"] si es Dialog
    if (container instanceof HTMLElement) setDialogContainer(container);
};

// en el JSX, en cualquier nodo hijo del AlertDialogContent:
<div ref={resolveDialogContainer}>
    <ComboboxContent container={dialogContainer}>...
```

Ejemplo real de esto último: `resources/js/pages/Comprar/Index.tsx`, diálogo "Editar Producto" (~línea 2086 en adelante).

## Variantes más simples, ya existentes — no confundir

Analizadas el 2026-08-10. El resto del proyecto usa diálogos grandes de **una sola columna** (sin panel lateral), pero en realidad son **dos variantes distintas**, no una — más una tercera cosa que no es un `Dialog` de verdad y no debería copiarse.

### Variante A — header fijo, solo el body scrollea

`Productos/Vendor/Index.tsx` (modal de Historial de Precios):

```tsx
<AlertDialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-4xl">
```

Mismo espíritu que el patrón de dos paneles de este documento pero en una sola columna: `flex flex-col overflow-hidden p-0` separa header/body/footer, el header queda pinneado (con su propio fondo degradado en este caso) y solo el body hace `overflow-y-auto`. Usar esta variante cuando el header es largo o tiene elementos visuales (íconos, degradados) que conviene mantener siempre visibles mientras el body scrollea.

### Variante B — todo scrollea junto (la más simple)

`Vendor/Show.tsx` (modal de Editar Venta Pendiente):

```tsx
<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
```

Sin `flex flex-col p-0` ni separación de secciones — el `DialogContent` entero (header incluido) es el contenedor de scroll. Más simple de escribir, pero el título se pierde de vista si el usuario scrollea mucho. Usar solo cuando el contenido no es tan largo como para que perder el header de vista moleste, o cuando no hace falta que el header quede fijo.

En ambas variantes A y B, `max-w-4xl`/`max-w-3xl` ya son más anchos que el `sm:max-w-lg` por defecto del componente base, así que no hace falta el `!max-w-none` que sí es obligatorio en el patrón de dos paneles (que usa un `max-w-[1024px]` arbitrario, no una escala de Tailwind).

### Lo que NO hay que copiar

`Proveedores/Show.tsx` (`DetallesCompraModal`) — **no usa el componente `Dialog`/`AlertDialog` del proyecto en absoluto**. Es un `<div>` con posición fija hecho a mano (`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50`, más un `<div className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-lg bg-white ...">` adentro). Visualmente similar a la Variante B, pero sin focus-trap, sin cierre con Escape, sin las animaciones de entrada/salida, y con colores hardcodeados (`bg-white`/`dark:bg-gray-800`) en vez de los tokens del tema (`bg-background`). Es deuda técnica preexistente, no un patrón a imitar — si se toca ese archivo alguna vez, migrarlo a `Dialog`/`DialogContent` de verdad es lo que corresponde, no replicar su enfoque en otro lado.

**Por qué:** antes de este documento, había cuatro implementaciones distintas de "diálogo grande" en el proyecto (dos paneles, Variante A, Variante B, y el `div` a mano de Proveedores), cada una reinventada por separado, sin que quedara claro cuál copiar para un caso nuevo.
**Cómo aplicar:** al construir un diálogo grande nuevo, elegir según necesidad — panel lateral fijo con resumen/contexto → patrón de dos paneles (arriba); una sola columna con header que debe quedar fijo → Variante A; una sola columna simple sin necesidad de fijar el header → Variante B. Nunca el enfoque de Proveedores/Show.tsx. Copiar la receta de clases tal cual, no aproximarla de memoria.

## Candidatos para aplicar más adelante (sin implementar todavía)

- **`Movimientos/Index.tsx`, diálogo "Detalles del Producto"** (`showDialogs.producto`, ~línea 1020): hoy es un `DialogContent className="sm:max-w-md"` — tamaño chico por defecto, con una imagen y una grilla de 2 columnas apretando Marca/Modelo/Capacidad/Color/Stock Disponible. Candidato claro para la Variante B (una sola columna, `max-h-[90vh] overflow-y-auto sm:max-w-3xl` o similar) — el contenido ya es una sola columna vertical, no necesita panel lateral. No se tocó todavía; queda anotado para cuando se llegue a este tipo de mejoras puntuales, después de cerrar la cola de Compras en curso.
