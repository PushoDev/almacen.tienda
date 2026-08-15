# Header Structure

> **REGLA CRÍTICA (2026-08-15, confirmada explícitamente por el cliente):** el banner superior de página (ver "Banner superior de página", debajo) es la estructura **identificativa de todo el proyecto** — se repite igual en Dashboard, Compras, y el resto de los módulos. **NUNCA** se le aplica el patrón de degradado de `docs/patron-card-header-degradado.md` (ese es solo para `Card`/`CardHeader`, no para este banner), y no se propone "arreglarlo" ni cambiarle el estilo salvo que el cliente lo pida explícitamente para ESE banner puntual. Ya pasó una vez (intentando "arreglar" un degradado roto en el banner de `Comprar/Show.tsx`) — el cliente lo frenó ahí mismo. No repetir esa confusión entre "banner de página" y "Card".

## Banner superior de página

Casi todas las páginas (Dashboard, Compras, etc.) abren con este bloque, antes de cualquier `Card`:

```tsx
<div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
    <HeadingSmall
        title="Opciones Generales del Sistema"
        description="Descripción breve del módulo"
    />
    <IconoDecorativo
        size={70}
        color="#f59e0b"
        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
    />
</div>
```

Clases fijas que identifican este bloque específico (si un `<div>` tiene esta combinación, es el banner de página, no lo toques como si fuera una Card): `bg-sidebar border-sidebar-accent ... rounded-2xl border border-dashed p-4`.

**Variante opcional, vista en `dashboard.tsx`:** envuelve el mismo bloque en `<CursorProvider><CursorFollow>...</CursorFollow></CursorProvider>` (`resources/js/components/ui/cursor.tsx`, basado en `motion/react`) — agrega un chip flotante que sigue al mouse dentro del área del banner. No está presente en el resto de los módulos (ej. `Comprar/Index.tsx` no lo tiene) — es decorativo y opcional, no parte de la estructura obligatoria.

## Patrón de Header para todas las páginas

Cada página renderiza un header con la siguiente estructura dentro del layout principal `AppSidebarLayout`:

```tsx
<div className="flex flex-col gap-4">
    <HeadingSmall title="Título de la Página" description="Descripción breve del propósito." />
    {/* Breadcrumbs, tabs y contenido adicional aquí */}
</div>
```

El layout `AppSidebarLayout` envuelve toda la página y provee:
- Sidebar de navegación persistente
- Header superior con migas de pan (breadcrumbs)
- Contenido principal con padding y scroll

## Componentes

### `HeadingSmall`

Archivo: `resources/js/components/heading-small.tsx`

```tsx
export default function HeadingSmall({ title, description }: { title: string; description?: string }) {
    return (
        <header>
            <h3 className="mb-0.5 font-medium">{title}</h3>
            {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </header>
    );
}
```

Props:
- `title`: string (requerido) — Título principal del header
- `description`: string (opcional) — Subtítulo o descripción breve

### Contenedor de página

Las páginas usan la estructura `<AppLayout>` → contenido dentro de un `<div>` con clases que varían según la página, usualmente con `flex flex-col gap-4` o similar. No hay un contenedor fijo con clases predefinidas; cada página adapta su layout al contenido (tablas, formularios, cards).

### Cards de contenido

El cuerpo de las páginas usa componentes `<Card>` de shadcn/ui:

```tsx
<Card>
    <CardHeader>
        <CardTitle>Subtítulo</CardTitle>
        <CardDescription>Descripción</CardDescription>
    </CardHeader>
    <CardContent>
        {/* contenido */}
    </CardContent>
</Card>
```

### Icono decorativo (opcional)

Algunas páginas incluyen un icono Lucide React posicionado en la esquina inferior derecha del header:

```tsx
<IconComponent
    size={70}
    color="#d6d3d1"
    className="pointer-events-none absolute right-2 bottom-0 opacity-40"
/>
```

Propiedades clave:
- `pointer-events-none` — No interfiere con clicks
- `absolute right-2 bottom-0` — Esquina inferior derecha
- `opacity-40` — Semitransparente

## Ejemplos por página

| Página | Título | Icono | Color icono |
|---|---|---|---|
| Cuentas/Index | Gestión de Cuentas | `Landmark` | `#d6d3d1` |
| Cuentas/Create | Gestión de Cuentas | `Landmark` | `#d6d3d1` |
| Cuentas/Show | Gestión de Cuentas | `Landmark` | `#d6d3d1` |
| Monedas/Index | Monedas del Sistema | `Coins` | `#d6d3d1` |
| Notifications/Index | Historial de Notificaciones | `Bell` | `#d6d3d1` |
| Reporte VentasPorVendedor | Reporte de Ventas por Vendedor | `User` | `#22d3ee` |
| Empleados/Index | Gestión de Empleados | — | — |
| Cierres/Index | Cierres de Caja | `ComputerIcon` | — |
| dashboard.tsx | Opciones Generales del Sistema | `ComputerIcon` | `#d6d3d1` (tiene además `CursorProvider`/`CursorFollow`) |
| Comprar/Index | Opciones Generales del Sistema | `ShoppingBasket` | `#f59e0b` |

Algunas páginas (como Empleados) no usan el icono decorativo. Otras personalizan el color del icono.

## Reglas

1. Siempre usar `HeadingSmall` con `title` descriptivo y `description` opcional
2. El icono decorativo es opcional pero consistente cuando se usa
3. Usar componentes `Card` de shadcn/ui para agrupar secciones de contenido
4. Breadcrumbs deben definirse por página usando el helper del layout
