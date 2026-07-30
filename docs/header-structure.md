# Header Structure

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

Algunas páginas (como Empleados) no usan el icono decorativo. Otras personalizan el color del icono.

## Reglas

1. Siempre usar `HeadingSmall` con `title` descriptivo y `description` opcional
2. El icono decorativo es opcional pero consistente cuando se usa
3. Usar componentes `Card` de shadcn/ui para agrupar secciones de contenido
4. Breadcrumbs deben definirse por página usando el helper del layout
