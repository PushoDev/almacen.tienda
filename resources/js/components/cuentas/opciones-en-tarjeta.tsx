import { cn } from '@/lib/utils';
import { Building2, Check, Globe, MapPin, User, type LucideIcon } from 'lucide-react';

export interface OpcionTarjeta {
    valor: string;
    nombre: string;
    descripcion: string;
    icono: LucideIcon;
}

export const OPCIONES_AMBITO: OpcionTarjeta[] = [
    { valor: 'nacional', nombre: 'Nacional', descripcion: 'Banco o caja en Cuba (BANDEC, BPA, Clásica, Tropical…)', icono: MapPin },
    { valor: 'internacional', nombre: 'Internacional', descripcion: 'Fuera de Cuba (Zelle, PayPal, Visa…)', icono: Globe },
];

export const OPCIONES_TITULAR: OpcionTarjeta[] = [
    { valor: 'externa', nombre: 'Externa', descripcion: 'A nombre de un tercero', icono: Building2 },
    { valor: 'personal', nombre: 'Personal', descripcion: 'A nombre propio', icono: User },
];

/**
 * Opciones de un solo valor como tarjetas seleccionables — mismo lenguaje que MetodosPagoSelector
 * (Monedas): borde doble, fondo teñido y check en la esquina. Volver a tocar la elegida la quita
 * (los campos que lo usan son opcionales en el servidor). Se usa en Cuentas/Create y Edit.
 */
export function OpcionesEnTarjeta({ opciones, valor, onChange }: { opciones: OpcionTarjeta[]; valor: string; onChange: (valor: string) => void }) {
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {opciones.map((opcion) => {
                const activa = valor === opcion.valor;
                const Icono = opcion.icono;

                return (
                    <button
                        key={opcion.valor}
                        type="button"
                        role="radio"
                        aria-checked={activa}
                        onClick={() => onChange(activa ? '' : opcion.valor)}
                        className={cn(
                            'relative flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors',
                            activa ? 'border-indigo-500 bg-indigo-500/10' : 'border-input hover:bg-accent',
                        )}
                    >
                        <span
                            className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                                activa ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground',
                            )}
                        >
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
    );
}
