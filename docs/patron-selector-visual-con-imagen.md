# Patrón: selector visual con imagen (banco, insignia, moneda…)

> Origen: antes de este documento había **tres implementaciones distintas** del mismo problema —
> "elegir una opción de un conjunto chico, cada una identificada por un logo/imagen" — cada una
> reinventada por separado: `SelectorBancoTarjeta`/`SelectorImagenEfectivo` (Dialog + grilla),
> `components/cuentas/opciones-en-tarjeta.tsx` (tarjetas con ícono, Cuentas Ámbito/Titular) y el
> selector "Moneda del Gestor" de `Vendor/Show.tsx` (badges inline con logo). Las tres siguen
> vigentes — no hay que migrar una a la otra — pero a partir de ahora, antes de construir un
> selector nuevo, se elige una de las tres de esta lista en vez de inventar una cuarta.
> **Antes de tocar cualquier UI nueva de selección con imagen/ícono, leer este documento primero.**

## Cuándo usar cada variante

| Variante | Cuántas opciones | Necesita Dialog | Ejemplo real |
|---|---|---|---|
| **A — Dialog + grilla** | Catálogo grande (10+), posiblemente agrupado en pestañas | Sí | Banco/tarjeta de una Cuenta (40+ bancos, Internas/Externas) |
| **B — Tarjetas con ícono inline** | 2-4 opciones fijas, sin imagen real (solo ícono Lucide) | No | Ámbito y Tipo Titular de una Cuenta (Nacional/Internacional, Externa/Personal) |
| **C — Badges con imagen inline** | 2-6 opciones, cada una con un logo real (no un ícono genérico) y un dato numérico asociado (tasa, saldo) | No | Moneda del Gestor (`Vendor/Show.tsx`) |

Si el catálogo es grande o crece con el tiempo (bancos, insignias) → Variante A. Si es un conjunto fijo y pequeño sin imagen real → Variante B. Si es un conjunto fijo y pequeño **con logo real** → Variante C.

---

## Variante A — Dialog + grilla (catálogo grande)

Archivos: `resources/js/components/SelectorBancoTarjeta.tsx`, `SelectorImagenEfectivo.tsx`.

```tsx
// Trigger — botón compacto, mismo alto que un <Input>
<button
    type="button"
    onClick={() => setAbierto(true)}
    className="border-input bg-background flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm shadow-xs hover:bg-accent hover:text-accent-foreground"
>
    {seleccionado ? (
        <>
            <img src={seleccionado.imagen_url} alt="" className="h-5 w-8 object-contain" />
            <span className="truncate">{seleccionado.nombre}</span>
        </>
    ) : (
        <>
            <IconoGenerico className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground">Sin asignar (genérico)</span>
        </>
    )}
</button>

// Dialog — grilla de 2-3 columnas, imagen más grande (h-12), check en la esquina
<Dialog open={abierto} onOpenChange={setAbierto}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
            <DialogTitle>Elegir banco / diseño de tarjeta</DialogTitle>
        </DialogHeader>
        {/* opción "Sin asignar" primero, mismo trato que las demás */}
        <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-3">
            {catalogo.map((item) => (
                <button
                    key={item.slug}
                    onClick={() => elegir(item.slug)}
                    className={cn(
                        'relative flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors',
                        activo ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent',
                    )}
                >
                    {activo && (
                        <span className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full">
                            <Check className="h-3 w-3" />
                        </span>
                    )}
                    <img src={item.imagen_url} alt={item.nombre} className="h-12 w-full object-contain" />
                    <span className="text-xs font-medium">{item.nombre}</span>
                </button>
            ))}
        </div>
    </DialogContent>
</Dialog>
```

Puntos clave:
- El trigger SIEMPRE tiene un estado "sin asignar" con ícono genérico — nunca se fuerza a elegir.
- Dentro del Dialog, "Sin asignar" es una opción más de la lista (mismo trato visual), no un botón aparte.
- Check de selección: círculo `bg-primary` en la esquina superior derecha, no un borde de color distinto por opción — todas comparten el mismo color (`border-primary`/`bg-primary/5`) porque no hay "color propio" por opción (un banco no tiene un color identitario en este sistema).
- Si el catálogo tiene subgrupos (Internas/Externas) usar `Tabs` adentro del `Dialog`, cada una con su propia grilla.

## Variante B — Tarjetas con ícono inline (conjunto fijo, sin imagen)

Archivo: `resources/js/components/cuentas/opciones-en-tarjeta.tsx`.

```tsx
<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {opciones.map((opcion) => {
        const activa = valor === opcion.valor;
        const Icono = opcion.icono;
        return (
            <button
                key={opcion.valor}
                onClick={() => onChange(activa ? '' : opcion.valor)}
                className={cn(
                    'relative flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors',
                    activa ? 'border-indigo-500 bg-indigo-500/10' : 'border-input hover:bg-accent',
                )}
            >
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', activa ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground')}>
                    <Icono className="h-5 w-5" />
                </span>
                <span className="space-y-0.5">
                    <span className="block text-sm font-medium">{opcion.nombre}</span>
                    <span className="text-muted-foreground block text-xs">{opcion.descripcion}</span>
                </span>
                {activa && (
                    <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white">
                        <Check className="h-3.5 w-3.5" />
                    </span>
                )}
            </button>
        );
    })}
</div>
```

Usar cuando **no hay un logo real** por opción — solo un ícono Lucide genérico que representa el concepto (un mapa para "Nacional", un globo para "Internacional"). Incluye `nombre` + `descripcion` de una línea porque el ícono solo no basta para identificar la opción — a diferencia de la Variante C, donde el logo ya es inequívoco. Volver a tocar la opción activa la deselecciona (campo opcional en el servidor) — confirmar que aplica antes de copiarlo a un campo obligatorio.

## Variante C — Badges con imagen inline (conjunto fijo, con logo real)

Origen: selector "Moneda del Gestor", `Vendor/Show.tsx`.

```tsx
<div className="flex flex-wrap gap-3">
    {opciones.map((m) => {
        const activa = seleccionada?.id === m.id;
        const color = COLOR_POR_CLAVE[m.codigo] ?? colorPorDefecto;
        return (
            <button
                key={m.id}
                type="button"
                aria-label={`${m.nombre} (${m.codigo}), valor ${m.valor}`}
                onClick={() => elegir(m)}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-2.5 shadow-sm transition-all ${
                    activa
                        ? `${color.activo} text-white shadow-md ring-4 ${color.anillo}`
                        : 'border-input bg-background text-foreground hover:bg-muted hover:shadow-md'
                }`}
            >
                <img src={m.imagen_url} alt="" aria-hidden="true" className="h-11 w-auto shrink-0 object-contain drop-shadow-sm" />
                {/* El logo ya identifica la opción — no repetir el código/nombre como texto al lado.
                    Lo que se muestra en texto es el DATO (tasa, saldo), con jerarquía de H2. */}
                <span className="text-2xl font-bold">{m.valor}</span>
            </button>
        );
    })}
</div>
```

Reglas de esta variante (las dos que se corrigieron en vivo el 2026-10-01, no repetir):

1. **La imagen reemplaza al texto del código/nombre, no lo acompaña.** Si el logo ya es inequívoco (un usuario que conoce el sistema reconoce la bandera/ícono de su moneda), poner el código al lado es ruido redundante. El nombre completo va en `aria-label` para accesibilidad, no en pantalla.
2. **El dato numérico asociado (tasa, saldo) es el protagonista visual** — tamaño de encabezado (`text-2xl font-bold`, equivalente a un H2), no una etiqueta chica gris. Es lo único que el usuario necesita leer rápido para decidir.
3. **`h-11` como mínimo para el logo** — `h-5`/`h-6` (el tamaño usado en selects de texto, ej. el combo de Moneda en `Cuentas/Create.tsx`) se ve "achicado" cuando el botón entero es protagonista de la sección, no un campo de formulario de una sola línea.
4. **Color por clave con clases completas, nunca armadas por partes** (Tailwind no detecta clases construidas dinámicamente, ej. `` `bg-${color}-600` `` nunca compila). Mapa fijo:

```tsx
const COLOR_POR_CLAVE: Record<string, { activo: string; anillo: string }> = {
    USD: { activo: 'border-emerald-600 bg-emerald-600', anillo: 'ring-emerald-400/50' },
    CUP: { activo: 'border-sky-600 bg-sky-600', anillo: 'ring-sky-400/50' },
    EUR: { activo: 'border-violet-600 bg-violet-600', anillo: 'ring-violet-400/50' },
};
const colorPorDefecto = { activo: 'border-indigo-600 bg-indigo-600', anillo: 'ring-indigo-400/50' };
```

   Mismo mecanismo que `COLORES_HISTORIAL` en `Cuentas/Show.tsx` (headers de las 4 tablas de historial) — si hace falta un tercer lugar que necesite "color por clave", generalizar a un helper compartido en vez de copiar el objeto una tercera vez.
5. **Sin logo (`imagen_url` null), no se deja el botón sin ícono** — usar un ícono genérico de respaldo (ej. `Coins`) del mismo tamaño aproximado, nunca un hueco vacío.

---

## Antes de escribir un selector nuevo

1. ¿Cuántas opciones son y crecen con el tiempo? → Variante A.
2. ¿Son pocas y fijas, sin logo real? → Variante B.
3. ¿Son pocas y fijas, con logo real? → Variante C.
4. Si ninguna de las tres encaja, preguntar antes de inventar una cuarta — y si se aprueba una de verdad nueva, volver a este documento a agregarla.

## Dónde ya se aplicó

- **Variante A**: `Cuentas/Create.tsx`/`Edit.tsx` (Banco/Diseño de tarjeta), `Cuentas` tipo=efectivo (Insignia de Moneda).
- **Variante B**: `Cuentas/Create.tsx`/`Edit.tsx` (Ámbito, Tipo Titular).
- **Variante C**: `Vendor/Show.tsx`, selector "Moneda del Gestor" (2026-10-01).

## Candidatos pendientes (no tocar sin que el cliente lo pida)

- El selector "Tasa CUP/USD" de **Comisión Punto de Venta** (`Vendor/Show.tsx`) hoy es un `<Input>` simple sin badges de moneda (solo aplica a CUP/USD, nunca mostró más de una moneda a la vez) — no es candidato real a ninguna variante mientras siga siendo binario.
- Revisar si el selector de Moneda en `Cuentas/Create.tsx`/`Edit.tsx` (hoy un `<Select>` con logo chico `h-5`) debería migrar a Variante A si el catálogo de monedas crece mucho — hoy son 3-4, no amerita el cambio todavía.
