# Patrón: Card con header en degradado de color

> Origen del lenguaje visual: `Comprar/Index.tsx`, los `AlertDialogHeader` de "Procesar Pago"/"Generar Deuda"/"Pagar Ahora" (fondo degradado, ícono en círculo con blur, texto blanco). Adaptado el 2026-08-12 a un `Card` normal (no un diálogo) para las dos tarjetas de resumen de `dashboard.tsx` ("Tabla 1: Resumen Financiero", "Tabla 2: Comparación Mensual"), a pedido explícito del cliente. Quedan otros lugares del proyecto pendientes de recibir el mismo tratamiento — no se tocaron todavía, solo se documenta el patrón para reutilizarlo.

## Cuándo usar este patrón

Cuando una tarjeta de resumen/KPI necesita destacarse visualmente en una pantalla con varias cards — no es el estilo por defecto de toda tarjeta del sistema (la mayoría sigue usando `border-sidebar-border` plano, sin degradado, ver por ejemplo "Información de Monedas" en la misma página). Se usa cuando el cliente pide explícitamente que una card "resalte" o tenga "más color".

## La receta

### 1. El `Card` — cancelar el padding superior por defecto

```tsx
<Card className="h-full overflow-hidden border-{color}-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
```

| Clase | Por qué |
|---|---|
| `pt-0` | **Obligatorio, no cosmético.** El componente base (`components/ui/card.tsx`) trae `py-6` en el `Card` raíz, y `CardHeader` solo tiene `px-6` (sin padding vertical propio) — sin este override queda una franja del color de fondo default de la card (`bg-card`) visible por encima del degradado del header, en vez de que el degradado llegue hasta el borde. Bug real que el cliente encontró en el navegador antes de que se agregara este override. |
| `overflow-hidden` | El `Card` tiene esquinas redondeadas (`rounded-xl`); sin esto, el fondo degradado del header (que es un rectángulo) sobresale por las esquinas superiores en vez de recortarse junto con ellas. |
| `h-full` | Si la card vive dentro de un grid junto a otra card de contenido distinto (como Tabla 1 y Tabla 2 lado a lado), asegura que ambas queden de la misma altura — el grid ya estira los ítems por defecto, pero el `Card` interno necesita `h-full` para aprovechar ese alto. |
| `border-{color}-500/30 border-l-4` | Confirmado explícitamente por el cliente que quería mantenerlo — no lo quites aunque parezca redundante con el header ya coloreado. |

### 2. El `CardHeader` — degradado + ícono en círculo

```tsx
<CardHeader className="border-b bg-gradient-to-r from-{color}-600 to-{color}-700 px-6 py-5 text-white">
    <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <IconoDeLaCard className="h-5 w-5" />
        </div>
        <div>
            <CardTitle className="text-white">Título</CardTitle>
            <CardDescription className="text-{color}-100">Descripción corta</CardDescription>
        </div>
    </div>
</CardHeader>
```

- El ícono va en un círculo `bg-white/20 backdrop-blur-sm`, nunca directo sobre el degradado — mismo criterio que los diálogos de Compras.
- `CardTitle` explícitamente `text-white` y `CardDescription` en el tono claro de la misma familia de color (`text-emerald-100`, `text-blue-100`, etc.) — el texto por defecto de estos componentes usa colores oscuros pensados para fondo plano, se pierden sobre un degradado si no se sobreescriben.

### 3. Si el header tiene un botón/acción (como "Ver Historial" en Tabla 2)

No uses un color sólido (`bg-blue-600`) — se mezcla con el degradado y desaparece. Usa el mismo lenguaje semitransparente que ya usan los chips de los diálogos de Compras:

```tsx
className="bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
```

## Dónde ya se aplicó

- `resources/js/pages/dashboard.tsx` — Tabla 1 (verde/emerald) y Tabla 2 (azul/blue), 2026-08-12.

## Dónde falta aplicarlo (pendiente, no arrancar sin que el cliente lo pida)

Sin especificar todavía — el cliente mencionó que "existen otros lugares donde debemos arreglar eso también" pero no dijo cuáles. Preguntar antes de tocar cualquier otra pantalla.
