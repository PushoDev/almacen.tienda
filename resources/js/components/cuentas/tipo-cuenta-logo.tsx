import { cn } from '@/lib/utils';
import { Banknote, CreditCard, type LucideIcon } from 'lucide-react';

export interface TipoCuenta {
    slug: 'tarjeta' | 'efectivo';
    nombre: string;
    /** null mientras no exista `public/projects/metodos_pago/{slug}.webp`: se muestra un ícono. */
    imagen_url: string | null;
}

const ICONOS_POR_TIPO: Record<string, LucideIcon> = {
    efectivo: Banknote,
    tarjeta: CreditCard,
};

interface TipoCuentaLogoProps {
    tipo: TipoCuenta;
    /** Alto del logo; el ícono provisional usa el mismo tamaño. */
    className?: string;
}

/**
 * Imagen del tipo de cuenta (Efectivo / Tarjeta), o un ícono mientras no exista el archivo.
 */
export function TipoCuentaLogo({ tipo, className = 'h-6' }: TipoCuentaLogoProps) {
    if (tipo.imagen_url) {
        return <img src={tipo.imagen_url} alt="" aria-hidden="true" className={cn('w-auto max-w-full object-contain', className)} />;
    }

    const Icono = ICONOS_POR_TIPO[tipo.slug] ?? CreditCard;

    return <Icono aria-label={tipo.nombre} className={cn('text-muted-foreground aspect-square w-auto', className)} strokeWidth={1.5} />;
}
