import { ViaLogo } from '@/components/monedas/via-logo';
import { Badge } from '@/components/ui/badge';

export interface ViaResumen {
    slug: string;
    nombre: string;
    imagen_url: string | null;
}

export interface MetodoResumen extends ViaResumen {
    /** Vías de la transferencia; el efectivo no lleva vías (lista vacía). */
    vias: ViaResumen[];
}

interface MetodosPagoResumenProps {
    metodos: MetodoResumen[];
    /** `compacto` para una celda de tabla; el completo se usa en el detalle de la moneda. */
    compacto?: boolean;
}

/**
 * Muestra qué métodos de pago admite una moneda y, dentro de la transferencia, sus vías (con logo).
 */
export function MetodosPagoResumen({ metodos, compacto = false }: MetodosPagoResumenProps) {
    if (metodos.length === 0) {
        return <span className="text-muted-foreground text-sm">Sin métodos de pago</span>;
    }

    if (compacto) {
        return (
            <div className="flex flex-wrap items-center gap-1.5">
                {metodos.map((metodo) => (
                    <Badge key={metodo.slug} variant="outline" className="gap-1">
                        {metodo.nombre}
                        {metodo.vias.length > 0 && <span className="text-muted-foreground">· {metodo.vias.length} vías</span>}
                    </Badge>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {metodos.map((metodo) => (
                <div key={metodo.slug} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                        {metodo.imagen_url && <img src={metodo.imagen_url} alt="" aria-hidden="true" className="h-12 w-auto object-contain" />}
                        <span className="font-medium">{metodo.nombre}</span>
                    </div>
                    {metodo.slug === 'transferencia' && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {metodo.vias.length === 0 ? (
                                <span className="text-sm text-amber-600">Sin vías configuradas: no se podrá cobrar por transferencia.</span>
                            ) : (
                                metodo.vias.map((via) => (
                                    <div key={via.slug} className="flex items-center gap-2 rounded-md border px-2 py-1">
                                        <ViaLogo slug={via.slug} nombre={via.nombre} imagenUrl={via.imagen_url} className="h-8" />
                                        <span className="text-xs font-medium">{via.nombre}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
