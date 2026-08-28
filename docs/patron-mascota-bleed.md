# Patrón: Mascota con efecto "bleed" (sobresale del contenedor)

> Origen: `Vendor/Imprimir.tsx` (2026-08-27, marca de agua de la mascota en el ticket impreso) y `dashboard.tsx` (mismo día, reemplazo del ícono decorativo del banner "Opciones Generales del Sistema" por la mascota, parada sobre el borde superior). Asset fuente: `public/projects/mascota/mascota.webp` (1302×1208px, alta resolución — no usar `/imgs/logo.png`, que es un recorte de 235×222px pensado para el logo chico del sidebar/tickets, no para este efecto).

**Nombre del efecto, para pedirlo directo:** *bleed* / *breakout* — un elemento (acá, la mascota) que sobresale intencionalmente del borde de su contenedor en vez de quedar recortado adentro. En diseño editorial se le dice "sangrado". Frase de referencia: *"poné la mascota con efecto bleed/breakout en [tal card], que sobresalga por [arriba/abajo]"*.

## Dos variantes — no son intercambiables

Hay dos usos de la mascota como elemento decorativo en el proyecto, con receta e intención distintas. No mezclar una con otra.

### Variante A — Bleed opaco, "parada sobre el borde" (dashboard.tsx)

La mascota se ve completa (sin transparencia), anclada por abajo dentro del contenedor, pero lo suficientemente grande como para que la cabeza/torso sobresalgan por encima del borde superior del contenedor.

```tsx
{/* El contenedor NO debe tener overflow-hidden — si lo tiene, corta la parte que sobresale */}
<div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 rounded-2xl border border-dashed p-4">
    <HeadingSmall title="..." description="..." />
    <img
        src="/projects/mascota/mascota.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-24 bottom-0 h-32 w-32 select-none"
    />
</div>
```

Puntos clave:
- **`overflow-hidden` fuera del contenedor** — es lo primero que hay que quitar; si el banner lo trae (el patrón base de `docs/header-structure.md` sí lo usa), la parte de arriba de la mascota queda invisible.
- **`bottom-0`, sin `top`** — la ancla es el borde inferior del contenedor; el tamaño (`h-32`/`w-32` u otro) es lo que controla cuánto sobresale por arriba, no un offset manual (`-top-N`). Si el contenedor mide ~88px de alto y la imagen es más alta que eso, la diferencia sobresale sola.
- **Sin `opacity-*` ni `animate-pulse`** — a diferencia del ícono decorativo estándar (`docs/header-structure.md`, `opacity-40 animate-pulse`), esta variante se ve al 100%, estática. Es la mascota "protagonista", no un adorno de fondo.
- **Cuidado con la barra superior fija del layout** (breadcrumbs + íconos de luna/notificaciones): mide el hueco real antes de fijar el `right-N` — en `dashboard.tsx` el hueco entre el banner y esa barra es de apenas ~16px, así que si la mascota queda muy grande o muy pegada a la derecha, choca visualmente con esos íconos. Se resolvió corriéndola a la izquierda (`right-24` en vez de `right-2`) y midiendo con `getBoundingClientRect()` en el navegador antes de dar por bueno el resultado — no confiar en el ojo únicamente, medir.

### Variante B — Marca de agua transparente, contenida (Vendor/Imprimir.tsx)

La mascota queda **detrás** del contenido real (precios, texto), semitransparente, sin salirse del contenedor — es una marca de agua de fondo, no un elemento que sobresale.

```tsx
<div className="relative ...">
    {/* La marca de agua va PRIMERO en el DOM, sin z-index propio */}
    <img
        src="/projects/mascota/mascota.webp"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-2 bottom-2 h-48 w-48 opacity-25 select-none"
    />
    {/* El contenido real va envuelto en su propio `relative` para pintar POR DELANTE */}
    <div className="relative">
        {/* ...precios, tabla, texto... */}
    </div>
</div>
```

**Bug real encontrado y ya corregido (2026-08-27):** un elemento `position: absolute` se pinta siempre por encima del contenido `position: static` de su mismo contenedor, sin importar el orden en el DOM — así estuviera la imagen primero en el código, tapaba los números. La solución es envolver el contenido real (no la marca de agua) en su propio `<div className="relative">`, para que también sea un elemento posicionado y gane por orden de DOM (el que va después, pinta encima).

Dónde se usa hoy:
- `Vendor/Imprimir.tsx`, Página 1 (Factura): `h-48 w-48 opacity-25`, esquina inferior derecha de la columna Factura.
- `Vendor/Imprimir.tsx`, Página 2 (garantía): `h-80 w-80 opacity-10`, centrada (`top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`) detrás de las 31 cláusulas — más grande y más tenue porque el texto legal es denso y a 7px, necesita más contraste para seguir siendo legible.

## Cuándo usar cada una

- **Variante A (bleed opaco)**: cuando la mascota es protagonista del elemento — el banner de identidad de una página, un empty-state, un "héroe" visual. Requiere espacio libre real por encima/al costado del contenedor; medir antes de agrandar.
- **Variante B (marca de agua)**: cuando la mascota es un detalle de marca de fondo sobre contenido que ya tiene su propia jerarquía (precios, texto, tablas) — nunca debe competir con la legibilidad del contenido real.

## Dónde ya se aplicó

- `resources/js/pages/dashboard.tsx` — banner "Opciones Generales del Sistema" (Variante A, reemplaza al `ComputerIcon` que traía el patrón base).
- `resources/js/pages/Vendor/Imprimir.tsx` — Página 1 (Factura) y Página 2 (garantía) del ticket impreso (Variante B).
- `resources/js/pages/Cuentas/Index.tsx` — banner "Gestión de Cuentas" (Variante A, con `public/projects/tarjetas.webp` en vez de la mascota — ver nota abajo sobre imágenes panorámicas).

### Nota: el patrón no es exclusivo de la mascota

El asset no tiene que ser `mascota.webp` — el mismo mecanismo (Variante A) sirve para cualquier imagen recortada/protagonista. Probado 2026-08-28 con `tarjetas.webp` (719×213px, panorámica — un abanico de tarjetas bancarias), en `Cuentas/Index.tsx`:

```tsx
<img
    src="/projects/tarjetas.webp"
    alt=""
    aria-hidden="true"
    className="pointer-events-none absolute right-4 bottom-0 h-28 w-auto select-none"
/>
```

Diferencia real con la mascota (que es ~cuadrada): con una imagen panorámica, un intento inicial de que **sobresaliera por el lado derecho** (en vez de por arriba) se descartó — el cliente lo probó y no le gustó, prefirió la Variante A de siempre (asomando por el borde superior). No asumir que una imagen ancha necesita una variante nueva — probar primero la Variante A tal cual, con `w-auto` para respetar su proporción real (no forzar `w-28` cuadrado como con la mascota).

## Dónde falta aplicarlo

No pedido todavía en ningún otro banner/página — no asumir que el resto de los banners del proyecto (ver tabla en `docs/header-structure.md`) deben migrar a este efecto sin que el cliente lo pida explícitamente para esa pantalla puntual (mismo criterio que ya aplica `docs/header-structure.md` para no "arreglar" el banner sin pedido explícito).
