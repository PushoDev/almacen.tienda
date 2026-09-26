import { cn } from '@/lib/utils';
import { Banknote, Globe, Smartphone, Wallet, type LucideIcon } from 'lucide-react';

/**
 * Ícono provisional de una vía que todavía no tiene logo. Al guardar `public/projects/metodos_pago/{slug}.webp`
 * el backend entrega `imagen_url` y este ícono deja de usarse solo.
 */
const ICONOS_POR_VIA: Record<string, LucideIcon> = {
    westernunion: Banknote,
    moneygram: Banknote,
    googlepay: Smartphone,
    tropipay: Globe,
};

interface ViaLogoProps {
    slug: string;
    nombre: string;
    imagenUrl: string | null;
    /** Clases del logo (alto); el ícono provisional usa el mismo tamaño. */
    className?: string;
}

export function ViaLogo({ slug, nombre, imagenUrl, className = 'h-10' }: ViaLogoProps) {
    if (imagenUrl) {
        return <img src={imagenUrl} alt="" aria-hidden="true" className={cn('w-auto max-w-full object-contain', className)} />;
    }

    const Icono = ICONOS_POR_VIA[slug] ?? Wallet;

    return <Icono aria-label={nombre} className={cn('text-muted-foreground aspect-square w-auto', className)} strokeWidth={1.5} />;
}
