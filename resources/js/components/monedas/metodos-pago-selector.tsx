import { ViaLogo } from '@/components/monedas/via-logo';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface MetodoCatalogo {
    slug: string;
    nombre: string;
    imagen_url: string | null;
}

export interface ViaCatalogo extends MetodoCatalogo {
    /** 'cuba' (EnZona, Transfermóvil) o 'internacional': define las vías sugeridas por defecto. */
    ambito: string;
}

export interface CatalogoMetodosPago {
    metodos: MetodoCatalogo[];
    vias: ViaCatalogo[];
}

interface MetodosPagoSelectorProps {
    catalogo: CatalogoMetodosPago;
    metodos: string[];
    vias: string[];
    onChange: (metodos: string[], vias: string[]) => void;
    /** Error del campo `metodos_pago` (no elegiste ninguno). */
    errorMetodos?: string;
    /** Error del campo `vias_pago` (admite transferencia pero no elegiste ninguna vía). */
    errorVias?: string;
}

/**
 * Elige qué métodos de pago admite una moneda (efectivo / transferencia) y, dentro de la transferencia,
 * qué vías (Zelle, EnZona, Transfermóvil…). El efectivo no lleva vía. Se usa en Monedas/Create y Edit.
 */
export function MetodosPagoSelector({ catalogo, metodos, vias, onChange, errorMetodos, errorVias }: MetodosPagoSelectorProps) {
    const admiteTransferencia = metodos.includes('transferencia');

    const alternarMetodo = (slug: string) => {
        if (metodos.includes(slug)) {
            const restantes = metodos.filter((m) => m !== slug);
            // Sin transferencia no hay vías que elegir: se limpian para no dejar datos ocultos.
            onChange(restantes, slug === 'transferencia' ? [] : vias);
        } else {
            onChange([...metodos, slug], vias);
        }
    };

    const alternarVia = (slug: string) => {
        onChange(metodos, vias.includes(slug) ? vias.filter((v) => v !== slug) : [...vias, slug]);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <Label>
                    Métodos de pago que admite esta moneda <span className="text-red-500">*</span>
                </Label>
                <p className="text-muted-foreground text-sm">Puede admitir uno solo o los dos. Al cobrar, solo se ofrecerán los que marques aquí.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {catalogo.metodos.map((metodo) => {
                    const activo = metodos.includes(metodo.slug);

                    return (
                        <button
                            key={metodo.slug}
                            type="button"
                            role="checkbox"
                            aria-checked={activo}
                            onClick={() => alternarMetodo(metodo.slug)}
                            className={cn(
                                'relative flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors',
                                activo ? 'border-violet-500 bg-violet-500/10' : 'border-input hover:bg-accent',
                            )}
                        >
                            {metodo.imagen_url ? (
                                <img src={metodo.imagen_url} alt="" aria-hidden="true" className="h-14 w-auto max-w-[60%] object-contain" />
                            ) : (
                                <span className="font-medium">{metodo.nombre}</span>
                            )}
                            <span className="text-sm font-medium">{metodo.imagen_url ? metodo.nombre : ''}</span>
                            {activo && (
                                <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-white">
                                    <Check className="h-3.5 w-3.5" />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
            {errorMetodos && <p className="text-sm text-red-500">{errorMetodos}</p>}

            {admiteTransferencia && (
                <div className="space-y-3 rounded-lg border border-dashed p-4">
                    <div className="space-y-1">
                        <Label>
                            Vías de la transferencia <span className="text-red-500">*</span>
                        </Label>
                        <p className="text-muted-foreground text-sm">Al elegir transferencia se escoge una de estas vías. Marca las que usa esta moneda.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {catalogo.vias.map((via) => {
                            const activa = vias.includes(via.slug);

                            return (
                                <button
                                    key={via.slug}
                                    type="button"
                                    role="checkbox"
                                    aria-checked={activa}
                                    onClick={() => alternarVia(via.slug)}
                                    className={cn(
                                        'relative flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border-2 p-2 text-center transition-colors',
                                        activa ? 'border-violet-500 bg-violet-500/10' : 'border-input hover:bg-accent',
                                    )}
                                >
                                    <ViaLogo slug={via.slug} nombre={via.nombre} imagenUrl={via.imagen_url} className="h-10" />
                                    <span className="text-xs font-medium">{via.nombre}</span>
                                    {activa && (
                                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-white">
                                            <Check className="h-3 w-3" />
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {errorVias && <p className="text-sm text-red-500">{errorVias}</p>}
                </div>
            )}
        </div>
    );
}
