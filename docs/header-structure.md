# Header Structure

## Patrón de Header para todas las páginas

Cada página renderiza un header con la siguiente estructura dentro del contenedor principal con clases `animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 rounded-xl p-6`:

```tsx
<div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
    <HeadingSmall title="Título de la Página" description="Descripción breve del propósito." />
    <IconComponent
        size={70}
        color="#d6d3d1"
        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
    />
</div>
```

## Componentes

### `HeadingSmall`

Archivo: `resources/js/components/heading-small.tsx`

```tsx
export default function HeadingSmall({ title, description }: { title: string; description?: string }) {
    return (
        <header>
            <h3 className="text-sidebar-accent mb-0.5 font-medium">{title}</h3>
            {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </header>
    );
}
```

Props:
- `title`: string (requerido) — Título principal del header
- `description`: string (opcional) — Subtítulo o descripción breve

### Contenedor

Clases fijas del div contenedor:

| Clase | Propósito |
|---|---|
| `bg-sidebar` | Fondo basado en el color del sidebar |
| `border-sidebar-accent` | Borde con color de acento del sidebar |
| `relative` | Posicionamiento relativo para el icono decorativo |
| `col-span-4` | Ocupa todo el ancho del grid |
| `space-y-1` | Espaciado vertical entre título y descripción |
| `overflow-hidden` | Oculta desbordamiento del icono |
| `rounded-2xl` | Bordes redondeados grandes |
| `border border-dashed` | Borde punteado |
| `p-4` | Padding por defecto (algunas páginas usan `p-6`) |

### Icono decorativo (opcional)

Lucide React icon posicionado en la esquina inferior derecha:

```tsx
<IconComponent
    size={70}
    color="#d6d3d1"             // gris claro
    className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
/>
```

Propiedades clave:
- `pointer-events-none` — No interfiere con clicks
- `absolute right-2 bottom-0` — Esquina inferior derecha
- `translate-y-[-5]` — Pequeño ajuste vertical
- `animate-pulse` — Animación de pulso suave
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
| Cierres/Index | Cierres de Caja | — | — |

Algunas páginas (como Empleados, Cierres) no usan el icono decorativo. Otras personalizan el color del icono.

## Reglas

1. Siempre usar `HeadingSmall` con `title` descriptivo y `description` opcional
2. El icono decorativo es opcional pero consistente cuando se usa
3. No cambiar las clases del contenedor (son fijas para todas las páginas)
4. El `p-4` es el padding estándar; `p-6` se usa excepcionalmente en páginas densas (Cierres)
