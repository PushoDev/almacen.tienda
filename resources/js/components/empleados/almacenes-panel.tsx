import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SpotlightCard from '@/components/ui/spotlightcard';
import { cn } from '@/lib/utils';
import { AlmacenProps } from '@/types';
import { Check, MapPin, Phone, Search, Store, User, X } from 'lucide-react';
import { useMemo, useState } from 'react';

const TIPOS_ALMACEN: Record<string, string> = {
    almacen: 'Almacén',
    punto_venta: 'Punto de venta',
    transportacion: 'Transportación',
};

interface AlmacenesPanelProps {
    almacenes: AlmacenProps[];
    seleccionados: number[];
    onChange: (ids: number[]) => void;
    error?: string;
}

/**
 * Pestaña "Almacenes" de Crear y Editar Empleado: tarjetas con los datos del almacén, que se marcan con un
 * clic. La tarjeta marcada tiene el borde animado.
 */
export function AlmacenesPanel({ almacenes, seleccionados, onChange, error }: AlmacenesPanelProps) {
    const [busqueda, setBusqueda] = useState('');

    const filtrados = useMemo(() => {
        const texto = busqueda.toLowerCase();

        return almacenes.filter((a) =>
            [a.nombre_almacen, a.ciudad_almacen, a.provincia_almacen, a.nombre_responsable].some((campo) => campo?.toLowerCase().includes(texto)),
        );
    }, [almacenes, busqueda]);

    const todosMarcados = filtrados.length > 0 && filtrados.every((a) => seleccionados.includes(a.id));

    const alternar = (id: number) => onChange(seleccionados.includes(id) ? seleccionados.filter((s) => s !== id) : [...seleccionados, id]);

    const alternarTodos = () => {
        if (todosMarcados) {
            onChange(seleccionados.filter((id) => !filtrados.some((a) => a.id === id)));
        } else {
            onChange(Array.from(new Set([...seleccionados, ...filtrados.map((a) => a.id)])));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-56 flex-1">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                    <Input
                        placeholder="Buscar por nombre, ciudad o responsable..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="pr-8 pl-8"
                    />
                    {busqueda && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setBusqueda('')}
                            className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2"
                        >
                            <X size={14} />
                        </Button>
                    )}
                </div>
                {filtrados.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={alternarTodos}>
                        {todosMarcados ? 'Desmarcar todos' : 'Marcar todos'}
                    </Button>
                )}
            </div>

            <p className="text-muted-foreground text-xs">
                {filtrados.length === almacenes.length ? 'Mostrando todos los almacenes' : `Mostrando ${filtrados.length} de ${almacenes.length}`}
            </p>

            <div className="grid max-h-[32rem] grid-cols-1 gap-3 overflow-y-auto p-1 md:grid-cols-2 xl:grid-cols-3">
                {filtrados.length > 0 ? (
                    filtrados.map((almacen) => {
                        const marcado = seleccionados.includes(almacen.id);
                        const ubicacion = [almacen.ciudad_almacen, almacen.provincia_almacen].filter(Boolean).join(', ');
                        const responsable = [almacen.nombre_responsable, almacen.apellido_responsable].filter(Boolean).join(' ');

                        const contenido = (
                            <>
                                <div className="flex items-start gap-3">
                                    <div
                                        className={cn(
                                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                                            marcado ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {marcado ? <Check className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold">{almacen.nombre_almacen}</p>
                                        <span className="text-muted-foreground text-xs">
                                            {TIPOS_ALMACEN[almacen.tipo_almacen] ?? almacen.tipo_almacen}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-muted-foreground space-y-1 text-xs">
                                    {ubicacion && (
                                        <p className="flex items-center gap-1.5">
                                            <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{ubicacion}</span>
                                        </p>
                                    )}
                                    {almacen.telefono_almacen && (
                                        <p className="flex items-center gap-1.5">
                                            <Phone className="h-3 w-3 shrink-0" /> <span className="truncate">{almacen.telefono_almacen}</span>
                                        </p>
                                    )}
                                    {responsable && (
                                        <p className="flex items-center gap-1.5">
                                            <User className="h-3 w-3 shrink-0" /> <span className="truncate">{responsable}</span>
                                        </p>
                                    )}
                                </div>
                            </>
                        );

                        const propiedades = {
                            role: 'checkbox' as const,
                            'aria-checked': marcado,
                            'aria-label': almacen.nombre_almacen,
                            tabIndex: 0,
                            onClick: () => alternar(almacen.id),
                            onKeyDown: (e: React.KeyboardEvent) => {
                                if (e.key === ' ' || e.key === 'Enter') {
                                    e.preventDefault();
                                    alternar(almacen.id);
                                }
                            },
                        };
                        const clases =
                            'bg-card cursor-pointer space-y-3 rounded-xl border p-3 transition-all hover:shadow-md focus-visible:ring-2 focus-visible:outline-none';

                        return marcado ? (
                            <SpotlightCard key={almacen.id} estado="completo" className={clases} {...propiedades}>
                                {contenido}
                            </SpotlightCard>
                        ) : (
                            <div key={almacen.id} className={clases} {...propiedades}>
                                {contenido}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-muted-foreground col-span-full py-12 text-center">
                        <Store size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">{busqueda ? 'No hay almacenes que coincidan con la búsqueda' : 'No hay almacenes disponibles'}</p>
                    </div>
                )}
            </div>
            <InputError message={error} />
        </div>
    );
}
