import { cn } from '@/lib/utils';
import { useLayoutEffect, useRef, useState } from 'react';

export interface LogoLoopItem {
    src: string;
    alt: string;
}

interface LogoLoopProps {
    logos: LogoLoopItem[];
    /** Velocidad en píxeles por segundo. */
    speed?: number;
    /** Alto de cada logo en píxeles. */
    logoHeight?: number;
    /** Separación entre logos en píxeles. */
    gap?: number;
    /** Difumina los extremos de la cinta. */
    fadeOut?: boolean;
    className?: string;
    ariaLabel?: string;
}

/**
 * Cinta de logos que se desplaza sin fin de derecha a izquierda. Se detiene mientras el cursor está
 * encima y cada logo crece un poco al pasarle el cursor. Los estilos (`.logo-loop`) están en
 * resources/css/app.css; con "reducir movimiento" la cinta queda quieta.
 */
export function LogoLoop({ logos, speed = 60, logoHeight = 40, gap = 40, fadeOut = true, className, ariaLabel = 'Logos' }: LogoLoopProps) {
    const grupoRef = useRef<HTMLUListElement>(null);
    const [duracion, setDuracion] = useState(40);

    useLayoutEffect(() => {
        const grupo = grupoRef.current;
        if (!grupo) {
            return;
        }

        const medir = () => setDuracion(Math.max(grupo.scrollWidth / speed, 5));
        medir();

        const observador = new ResizeObserver(medir);
        observador.observe(grupo);

        return () => observador.disconnect();
    }, [speed, logos]);

    const grupo = (copia: 'original' | 'repetido') => (
        <ul
            ref={copia === 'original' ? grupoRef : undefined}
            aria-hidden={copia === 'repetido' ? true : undefined}
            className="flex shrink-0 items-center"
            style={{ gap, paddingRight: gap }}
        >
            {logos.map((logo) => (
                <li key={logo.src} className="shrink-0">
                    <img
                        src={logo.src}
                        alt={copia === 'original' ? logo.alt : ''}
                        title={logo.alt}
                        draggable={false}
                        style={{ height: logoHeight }}
                        className="w-auto transition-transform duration-200 select-none hover:scale-110"
                    />
                </li>
            ))}
        </ul>
    );

    return (
        <div role="region" aria-label={ariaLabel} className={cn('logo-loop overflow-hidden', fadeOut && 'logo-loop-fade', className)}>
            <div className="logo-loop-track flex w-max" style={{ ['--logo-loop-duracion' as string]: `${duracion}s` }}>
                {grupo('original')}
                {grupo('repetido')}
            </div>
        </div>
    );
}
