import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { HardDrive, Layers, Palette, Tag } from 'lucide-react';

export interface ProductoResumen {
    nombre: string;
    marca?: string | null;
    modelo?: string | null;
    capacidad?: string | null;
    color?: string | null;
}

// Receta "vidrio" de .ai/rules/js.md (como MonedaCard): fondo X-500/10, borde X-400/30, backdrop-blur y
// texto X-700 / X-300 en oscuro. Un color por especificación para que se distingan de un vistazo.
// Clases completas: Tailwind no detecta `bg-${color}-500/10` armado por partes.
const ESPECIFICACIONES = [
    {
        clave: 'marca',
        etiqueta: 'Marca',
        Icono: Tag,
        clases: 'border-violet-400/30 bg-violet-500/10 text-violet-700 shadow-violet-500/20 dark:text-violet-300',
    },
    {
        clave: 'modelo',
        etiqueta: 'Modelo',
        Icono: Layers,
        clases: 'border-sky-400/30 bg-sky-500/10 text-sky-700 shadow-sky-500/20 dark:text-sky-300',
    },
    {
        clave: 'capacidad',
        etiqueta: 'Capacidad',
        Icono: HardDrive,
        clases: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-700 shadow-emerald-500/20 dark:text-emerald-300',
    },
    {
        clave: 'color',
        etiqueta: 'Color',
        Icono: Palette,
        clases: 'border-rose-400/30 bg-rose-500/10 text-rose-700 shadow-rose-500/20 dark:text-rose-300',
    },
] as const;

type Especificaciones = Pick<ProductoResumen, 'marca' | 'modelo' | 'capacidad' | 'color'>;

/** Una especificación como badge de vidrio con su color; `compacto` lo reduce para filas de listado. */
function ChipEspecificacion({
    etiqueta,
    valor,
    Icono,
    clases,
    compacto = false,
}: {
    etiqueta: string;
    valor: string;
    Icono: typeof Tag;
    clases: string;
    compacto?: boolean;
}) {
    return (
        <Badge
            title={etiqueta}
            className={cn(
                'gap-1 border font-medium shadow-sm backdrop-blur-sm transition-transform hover:scale-105',
                compacto ? 'px-1.5 py-0 text-[10px]' : 'text-xs',
                clases,
            )}
        >
            <Icono className={compacto ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            {!compacto && <span className="opacity-70">{etiqueta}:</span>}
            {valor}
        </Badge>
    );
}

/**
 * Marca, modelo, capacidad y color de un producto como badges de vidrio de colores. No pinta nada si el
 * producto no tiene ninguna especificación.
 */
export function EspecificacionesProducto({ marca, modelo, capacidad, color }: Especificaciones) {
    const valores = { marca, modelo, capacidad, color };
    const presentes = ESPECIFICACIONES.filter((e) => !!valores[e.clave]);

    if (presentes.length === 0) {
        return null;
    }

    return (
        <div className="mt-1 flex flex-wrap gap-1.5">
            {presentes.map(({ clave, etiqueta, Icono, clases }) => (
                <ChipEspecificacion key={clave} etiqueta={etiqueta} valor={valores[clave] as string} Icono={Icono} clases={clases} />
            ))}
        </div>
    );
}

/**
 * Lista corta de productos para las filas de un listado: nombre y, debajo, sus especificaciones como chips
 * compactos de vidrio. Muestra `max` y resume el resto como "+N más".
 */
export function ListaProductosResumen({ productos, max = 3 }: { productos: ProductoResumen[]; max?: number }) {
    if (productos.length === 0) {
        return null;
    }

    return (
        <ul className="mt-1.5 space-y-1.5">
            {productos.slice(0, max).map((producto, indice) => {
                const valores: Especificaciones = producto;

                return (
                    <li key={`${producto.nombre}-${indice}`} className="text-xs leading-tight">
                        <span className="font-semibold">{producto.nombre}</span>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                            {ESPECIFICACIONES.filter((e) => !!valores[e.clave]).map(({ clave, etiqueta, Icono, clases }) => (
                                <ChipEspecificacion
                                    key={clave}
                                    etiqueta={etiqueta}
                                    valor={valores[clave] as string}
                                    Icono={Icono}
                                    clases={clases}
                                    compacto
                                />
                            ))}
                        </div>
                    </li>
                );
            })}
            {productos.length > max && (
                <li>
                    <Badge className="border border-slate-400/30 bg-slate-500/10 px-1.5 py-0 text-[10px] font-normal text-slate-600 backdrop-blur-sm dark:text-slate-300">
                        +{productos.length - max} más
                    </Badge>
                </li>
            )}
        </ul>
    );
}
